import { catalogQuery, criterionKeys, hotelFromApi, type Criterion } from "@/entities/hotel";
import { api, type components } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";

export function useComparison(ids: string[], criteria: Criterion[]) {
  const catalog = useQuery(catalogQuery);
  const selectedIds =
    ids.length >= 2 ? ids : (catalog.data?.slice(0, 3).map((hotel) => hotel.id) ?? []);
  const comparison = useQuery({
    queryKey: ["comparison", selectedIds, criteria],
    queryFn: ({ signal }) =>
      api<components["schemas"]["CompareOut"]>("/compare", {
        method: "POST",
        body: {
          selections: selectedIds.map((hotelId) => ({ hotelId })),
          chips: criteria.map((criterion) => ({
            id: criterion,
            characteristic: criterionKeys[criterion],
            label: criterion,
            importance: "important",
            checkable: ["work", "pets"].includes(criterion) ? "ask_hotelier" : "compute",
            params: {},
          })),
        },
        signal,
      }),
    enabled: selectedIds.length >= 2,
    staleTime: 30000,
    retry: false,
  });
  const selected =
    comparison.data?.matches
      .flatMap((match) => {
        const raw = catalog.data?.find((hotel) => hotel.id === match.hotelId);
        return raw
          ? [
              {
                h: hotelFromApi(raw, match, comparison.data?.intent),
                s: Math.round(match.score * 100),
              },
            ]
          : [];
      })
      .sort((a, b) => b.s - a.s) ?? [];
  return {
    scored: selected,
    pending: catalog.isPending || comparison.isPending,
    error: catalog.error ?? comparison.error,
    retry: () => {
      void catalog.refetch();
      void comparison.refetch();
    },
  };
}
