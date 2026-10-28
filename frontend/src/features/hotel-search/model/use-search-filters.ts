import { catalogQuery, hotelFromApi, type ApiIntent, type Criterion } from "@/entities/hotel";
import { api, type components } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { parseQuery } from "./matching";
import { intentForCriteria } from "./api-search";
export function useSearchFilters(query: string) {
  const [refine, setRefine] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>(() => parseQuery(query));
  const [budget, setMaxPrice] = useState<number | null>(null);
  const [text, setText] = useState(query);
  const intent = useQuery({
    queryKey: ["intent", text],
    queryFn: ({ signal }) => api<ApiIntent>("/intents", { method: "POST", body: { text }, signal }),
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const catalog = useQuery(catalogQuery);
  const maxPrice = budget ?? Math.min(20000, intent.data?.trip.budgetPerNight ?? 20000);
  const chips = intentForCriteria(
    intent.data ?? { chips: [], trip: {}, planner: "rules" },
    criteria,
  );
  const search = useQuery({
    queryKey: ["search", text, chips, intent.data?.trip, maxPrice],
    queryFn: ({ signal }) =>
      api<components["schemas"]["SearchResultOut"]>("/searches", {
        method: "POST",
        body: {
          text,
          chips,
          trip: { ...intent.data?.trip, budgetPerNight: maxPrice },
          useProfile: false,
        },
        signal,
      }),
    enabled: !!intent.data,
    staleTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const ranked = useMemo(() => {
    const hotels = new Map(catalog.data?.map((hotel) => [hotel.id, hotel]));
    return (search.data?.matches ?? []).flatMap((match) => {
      const raw = hotels.get(match.hotelId);
      if (!raw) return [];
      const hotel = hotelFromApi(raw, match, search.data?.intent);
      return [
        {
          hotel,
          ...(search.data ? { searchId: search.data.searchId } : {}),
          score: Math.round(match.score * 100),
          best: criteria.filter((criterion) => hotel.scores[criterion] >= 80),
          weak: criteria.filter(
            (criterion) =>
              !hotel.unknownCriteria?.includes(criterion) && hotel.scores[criterion] < 60,
          ),
        },
      ];
    });
  }, [catalog.data, search.data, criteria]);
  const toggleCriterion = (criterion: Criterion) =>
    setCriteria((current) =>
      current.includes(criterion)
        ? current.length > 1
          ? current.filter((item) => item !== criterion)
          : current
        : [...current, criterion],
    );
  const refineQuery = () => {
    if (!refine.trim()) return;
    setText((current) => `${current}. ${refine.trim()}`);
    setMaxPrice(null);
    setCriteria((current) => Array.from(new Set([...current, ...parseQuery(refine)])));
    setRefine("");
  };
  return {
    refine,
    setRefine,
    criteria,
    maxPrice,
    setMaxPrice,
    ranked,
    search: search.data,
    pending: intent.isPending || catalog.isPending || search.isPending,
    error: intent.error ?? catalog.error ?? search.error,
    retry: () => {
      void intent.refetch();
      void catalog.refetch();
      if (intent.data) void search.refetch();
    },
    toggleCriterion,
    refineQuery,
  };
}
