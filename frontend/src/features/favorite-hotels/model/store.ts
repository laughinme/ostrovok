import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getApiMode } from "@/shared/api";

interface FavoriteState {
  ids: string[];
  toggle: (id: string) => void;
}

export const useFavoriteHotels = create<FavoriteState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((item) => item !== id)
            : [...state.ids, id],
        })),
    }),
    {
      name: getApiMode() === "demo" ? "luch-favorite-hotels-demo" : "luch-favorite-hotels",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ ids: state.ids }),
      skipHydration: true,
    },
  ),
);
