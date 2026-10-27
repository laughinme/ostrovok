import type { Criterion } from "@/entities/hotel";
import { useMemo, useState } from "react";
import { parseQuery, rank } from "./matching";
export function useSearchFilters(query: string) {
  const [refine, setRefine] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>(() => parseQuery(query));
  const [maxPrice, setMaxPrice] = useState(20000);
  const ranked = useMemo(
    () => rank(criteria).filter((item) => item.hotel.price <= maxPrice),
    [criteria, maxPrice],
  );
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
    toggleCriterion,
    refineQuery,
  };
}
