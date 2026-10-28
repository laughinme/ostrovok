import { cn } from "@/shared/lib";
import { Heart } from "lucide-react";
import { useHotelFavorite } from "../model/use-hotel-favorite";

export function FavoriteButton({ hotelId, className }: { hotelId: string; className?: string }) {
  const { selected, toggle } = useHotelFavorite(hotelId);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={selected}
      aria-label={selected ? "Убрать из избранного" : "Добавить в избранное"}
      className={cn(
        "grid size-10 place-items-center rounded-md bg-card shadow-sm transition hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      <Heart className={cn("size-5", selected && "fill-current")} aria-hidden="true" />
    </button>
  );
}
