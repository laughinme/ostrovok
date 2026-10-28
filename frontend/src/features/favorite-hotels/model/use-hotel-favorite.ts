import { useEffect } from "react";
import { useFavoriteHotels } from "./store";

export function useHotelFavorite(hotelId: string) {
  const selected = useFavoriteHotels((state) => state.ids.includes(hotelId));
  const toggle = useFavoriteHotels((state) => state.toggle);

  useEffect(() => {
    if (!useFavoriteHotels.persist?.hasHydrated()) {
      void useFavoriteHotels.persist?.rehydrate();
    }
  }, []);

  return { selected, toggle: () => toggle(hotelId) };
}
