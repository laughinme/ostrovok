import {
  CRITERIA,
  catalogQuery,
  criterionKeys,
  hotelFromApi,
  type Criterion,
} from "@/entities/hotel";
import { api, type components } from "@/shared/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { comparisonCopy } from "../lib/comparison-copy";

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
            label: CRITERIA[criterion].label,
            importance: "important",
            checkable: ["work", "pets"].includes(criterion) ? "ask_hotelier" : "compute",
            params: {},
          })),
        },
        signal,
      }),
    enabled: selectedIds.length >= 2,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const selected =
    comparison.data?.matches
      .flatMap((match) => {
        const raw = catalog.data?.find((hotel) => hotel.id === match.hotelId);
        if (!raw) return [];
        const hotel = hotelFromApi(raw, match, comparison.data?.intent);
        return [
          {
            h: {
              ...hotel,
              pros: hotel.pros.map(comparisonCopy).filter(Boolean),
              cons: hotel.cons.map(comparisonCopy).filter(Boolean),
              facts: hotel.facts.map((fact) => ({ ...fact, label: comparisonCopy(fact.label) })),
            },
            s: Math.round(match.score * 100),
          },
        ];
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
