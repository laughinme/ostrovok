import type { ApiIntent } from "@/entities/hotel";
import { create } from "zustand";

type SearchFilters = { text: string; intent?: ApiIntent; budget: number | null };
interface SearchSession {
  lastQuery: string | undefined;
  filters: Record<string, SearchFilters>;
  remember: (query: string, filters: SearchFilters) => void;
}

export const useSearchSession = create<SearchSession>((set) => ({
  lastQuery: undefined,
  filters: {},
  remember: (query, filters) =>
    set((state) => ({ lastQuery: query, filters: { ...state.filters, [query]: filters } })),
}));
