import { create } from "zustand";

interface CompareState {
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
}

export const useCompare = create<CompareState>((set) => ({
  ids: [],
  toggle: (id) =>
    set((s) => ({
      ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id].slice(-3),
    })),
  clear: () => set({ ids: [] }),
}));
