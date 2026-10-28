import { catalogQuery, hotelFromApi, type ApiIntent, type Criterion } from "@/entities/hotel";
import { sessionApi, useSession } from "@/entities/session";
import { api, type components } from "@/shared/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { criteriaFromIntent, intentForCriteria } from "./api-search";
import { useSearchSession } from "./search-session";

type SearchResult = components["schemas"]["SearchResultOut"];
type Importance = components["schemas"]["Importance"];

export function useSearchFilters(query: string, hotelId?: string) {
  const saved = useSearchSession.getState().filters[query];
  const account = useSession((state) => state.account);
  const [refine, setRefine] = useState("");
  const [draft, setDraft] = useState<ApiIntent | null>(() => saved?.intent ?? null);
  const [budget, setMaxPrice] = useState<number | null>(() => saved?.budget ?? null);
  const [text, setText] = useState(() => saved?.text ?? query);
  const [useProfile, setUseProfile] = useState(true);
  const [adopted, setAdopted] = useState<{ search: SearchResult; intent: ApiIntent } | null>(null);
  const intent = useQuery({
    queryKey: ["intent", text, ...(hotelId ? [hotelId] : [])],
    queryFn: ({ signal }) =>
      hotelId && text === query
        ? Promise.resolve<ApiIntent>({ text, chips: [], trip: {}, planner: "rules" })
        : api<ApiIntent>("/intents", { method: "POST", body: { text }, signal }),
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !draft,
  });
  const catalog = useQuery({ ...catalogQuery, retryOnMount: false });
  const base = draft ?? intent.data;
  const maxPrice = budget ?? base?.trip.budgetPerNight ?? null;
  const searchIntent = useMemo(
    () =>
      base
        ? {
            ...base,
            trip: { ...base.trip, budgetPerNight: maxPrice },
          }
        : null,
    [base, maxPrice],
  );
  const criteria = useMemo(() => criteriaFromIntent(base), [base]);
  useEffect(() => {
    useSearchSession
      .getState()
      .remember(query, { text, budget, ...(base ? { intent: base } : {}) });
  }, [query, text, budget, base]);
  const adoptedCurrent =
    adopted && JSON.stringify(adopted.intent) === JSON.stringify(searchIntent)
      ? adopted.search
      : null;
  const personalized = !!account && account.role === "guest" && useProfile;
  const search = useQuery({
    queryKey: ["search", searchIntent, account?.id, personalized, ...(hotelId ? [hotelId] : [])],
    queryFn: ({ signal }) =>
      (personalized ? sessionApi<SearchResult> : api<SearchResult>)("/searches", {
        method: "POST",
        body: {
          text: searchIntent?.text ?? text,
          chips: searchIntent?.chips,
          trip: searchIntent?.trip,
          useProfile: personalized,
          ...(hotelId ? { hotelIds: [hotelId] } : {}),
        },
        signal,
      }),
    enabled: !!searchIntent && !adoptedCurrent,
    placeholderData: keepPreviousData,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });
  const current = adoptedCurrent ?? search.data;
  const visibleChips = [
    ...(base?.chips ?? []),
    ...(personalized
      ? (current?.intent.chips.filter(
          (chip) =>
            chip.fromProfile &&
            !base?.chips.some((item) => item.characteristic === chip.characteristic),
        ) ?? [])
      : []),
  ];
  const ranked = useMemo(() => {
    const hotels = new Map(catalog.data?.map((hotel) => [hotel.id, hotel]));
    return (current?.matches ?? []).flatMap((match) => {
      const raw = hotels.get(match.hotelId);
      if (!raw) return [];
      const hotel = hotelFromApi(raw, match, current?.intent);
      return [
        {
          hotel,
          ...(current ? { searchId: current.searchId } : {}),
          score: Math.round(match.score * 100),
          best: criteria.filter((criterion) => hotel.scores[criterion] >= 80),
          weak: criteria.filter(
            (criterion) =>
              !hotel.unknownCriteria?.includes(criterion) && hotel.scores[criterion] < 60,
          ),
        },
      ];
    });
  }, [catalog.data, current, criteria]);
  const acceptSearch = useCallback((next: SearchResult | null) => {
    if (!next) return;
    setDraft(next.intent);
    setMaxPrice(next.intent.trip.budgetPerNight ?? null);
    setAdopted({
      search: next,
      intent: {
        ...next.intent,
        trip: { ...next.intent.trip, budgetPerNight: next.intent.trip.budgetPerNight ?? null },
      },
    });
  }, []);
  function editChips(chips: ApiIntent["chips"]) {
    if (base) setDraft({ ...base, chips });
    setAdopted(null);
  }
  return {
    refine,
    setRefine,
    criteria,
    maxPrice,
    setMaxPrice: (value: number | null) => {
      setMaxPrice(value);
      if (base) setDraft({ ...base, trip: { ...base.trip, budgetPerNight: value } });
      setAdopted(null);
    },
    ranked,
    search: current,
    hints: current?.intent.hints ?? base?.hints ?? [],
    chips: visibleChips,
    useProfile,
    setUseProfile: (value: boolean) => {
      setUseProfile(value);
      if (!value && base)
        setDraft({ ...base, chips: base.chips.filter((chip) => !chip.fromProfile) });
      setAdopted(null);
    },
    trip: base?.trip ?? {},
    changeTrip: (trip: components["schemas"]["TripModel"]) => {
      if (base) setDraft({ ...base, trip: { ...base.trip, ...trip } });
      setAdopted(null);
    },
    canUseProfile: account?.role === "guest",
    acceptSearch,
    pending:
      (!base && intent.isPending) || catalog.isPending || (!adoptedCurrent && search.isPending),
    updating: search.isFetching && !!search.data,
    error:
      (!base ? intent.error : null) ?? catalog.error ?? (!adoptedCurrent ? search.error : null),
    retry: () => {
      void intent.refetch();
      void catalog.refetch();
      if (searchIntent) void search.refetch();
    },
    toggleCriterion: (criterion: Criterion) => {
      if (!base) return;
      const selected = criteria.includes(criterion)
        ? criteria.filter((item) => item !== criterion)
        : [...criteria, criterion];
      editChips(intentForCriteria(base, selected));
    },
    changeImportance: (id: string, importance: Importance) =>
      editChips(
        visibleChips.map((chip) =>
          chip.id === id ? { ...chip, importance, fromProfile: false } : chip,
        ),
      ),
    removeChip: (id: string) => {
      const chip = visibleChips.find((item) => item.id === id);
      if (chip?.fromProfile) setUseProfile(false);
      editChips(
        visibleChips
          .filter((item) => item.id !== id)
          .map((item) => (chip?.fromProfile ? { ...item, fromProfile: false } : item)),
      );
    },
    refineQuery: () => {
      if (!refine.trim()) return;
      setText((current) => `${current}. ${refine.trim()}`);
      setDraft(null);
      setAdopted(null);
      setRefine("");
    },
  };
}
