import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getApiMode } from "@/shared/api";
import type { Criterion } from "@/entities/hotel";

interface CompareState {
  ids: string[];
  criteria: Criterion[];
  toggleCriterion: (criterion: Criterion) => void;
  toggle: (id: string) => void;
  clear: () => void;
}

export const useCompare = create<CompareState>()(
  persist(
    (set) => ({
      ids: [],
      criteria: ["quiet", "sunset", "sea", "work"],
      toggleCriterion: (criterion) =>
        set((state) => ({
          criteria: state.criteria.includes(criterion)
            ? state.criteria.length > 1
              ? state.criteria.filter((item) => item !== criterion)
              : state.criteria
            : [...state.criteria, criterion],
        })),
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id].slice(-3),
        })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: getApiMode() === "demo" ? "okno-comparison-demo" : "okno-comparison",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ ids: state.ids, criteria: state.criteria }),
      skipHydration: true,
    },
  ),
);
