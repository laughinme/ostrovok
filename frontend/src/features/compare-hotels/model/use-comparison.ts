import {
  CRITERIA,
  catalogQuery,
  criterionKeys,
  hotelFromApi,
  type Criterion,
} from "@/entities/hotel";
import { api, type components } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";
import { comparisonCopy } from "../lib/comparison-copy";

export function useComparison(ids: string[], criteria: Criterion[]) {
  const canCompare = ids.length >= 2;
  const catalog = useQuery({ ...catalogQuery, enabled: canCompare });
  const comparison = useQuery({
    queryKey: ["comparison", ids, criteria],
    queryFn: ({ signal }) =>
      api<components["schemas"]["CompareOut"]>("/compare", {
        method: "POST",
        body: {
          selections: ids.map((hotelId) => ({ hotelId })),
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
    enabled: canCompare,
    placeholderData: (previousData, previousQuery) =>
      JSON.stringify(previousQuery?.queryKey[1]) === JSON.stringify(ids) ? previousData : undefined,
    retry: false,
  });
  const selected =
    (canCompare ? comparison.data?.matches : undefined)
      ?.filter((match) => ids.includes(match.hotelId))
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
    pending: canCompare && (catalog.isPending || comparison.isPending),
    error: canCompare ? (catalog.error ?? comparison.error) : null,
    retry: () => {
      if (!canCompare) return;
      void catalog.refetch();
      void comparison.refetch();
    },
  };
}
