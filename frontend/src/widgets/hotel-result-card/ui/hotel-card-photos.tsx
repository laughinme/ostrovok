import { formatReviewCount, PhotoCredit, photoInfo, type Hotel } from "@/entities/hotel";
import { useHotelFavorite } from "@/features/favorite-hotels";
import { cn } from "@/shared/lib";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Heart, Star } from "lucide-react";
import { useRef, useState } from "react";
import { CardControl } from "./card-control";

export function HotelCardPhotos({
  hotel,
  query,
  searchId,
}: {
  hotel: Hotel;
  query: string;
  searchId?: string | undefined;
}) {
  const photos = hotel.gallery.length ? hotel.gallery : [hotel.image];
  const [index, setIndex] = useState(0);
  const { selected, toggle } = useHotelFavorite(hotel.id);
  const current = index % photos.length;
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const go = (direction: number) =>
    setIndex((value) => (value + direction + photos.length) % photos.length);

  return (
    <div
      role="group"
      aria-roledescription="карусель"
      aria-label={`Фотографии отеля ${hotel.name}`}
      className="group/photos relative aspect-[16/10] overflow-hidden bg-muted @min-[580px]:aspect-auto @min-[580px]:min-h-56"
    >
      <Link
        to="/hotel/$id"
        params={{ id: hotel.id }}
        search={{ q: query, sid: searchId }}
        draggable={false}
        className="absolute inset-0 block touch-pan-y select-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          pointer.current = { x: event.clientX, y: event.clientY };
          suppressClick.current = false;
        }}
        onPointerUp={(event) => {
          if (!pointer.current) return;
          const dx = event.clientX - pointer.current.x;
          const dy = event.clientY - pointer.current.y;
          pointer.current = null;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            suppressClick.current = true;
            go(dx < 0 ? 1 : -1);
          }
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            go(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        <img
          key={photos[current]}
          src={photos[current]}
          alt={
            photoInfo(photos[current])?.alt ??
            `${hotel.name} — фото ${current + 1} из ${photos.length}`
          }
          loading="lazy"
          width={1024}
          height={768}
          draggable={false}
          className="h-full w-full object-cover"
        />
      </Link>
      <PhotoCredit
        src={photos[current]}
        compact
        className="absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] rounded-md bg-white/95 px-2.5 py-1.5 text-[11px] leading-snug text-night shadow-sm"
      />
      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-sun px-3 py-1.5 text-night shadow-soft">
        <Star className="h-3.5 w-3.5 fill-current opacity-90" aria-hidden="true" />
        <span
          className="font-mono text-sm font-bold leading-none tabular-nums"
          aria-label={`Оценка ${hotel.rating.toFixed(1)} из 10`}
        >
          {hotel.rating.toFixed(1)}
        </span>
        <span className="h-3 w-px bg-night/25" />
        <span className="font-mono text-[9px] leading-none tracking-wider opacity-70">
          {hotel.backend ? "демо-рейтинг" : formatReviewCount(hotel.reviewCount)}
        </span>
      </span>
      <CardControl
        variant="secondary"
        size="icon"
        onClick={toggle}
        aria-pressed={selected}
        aria-label={`${selected ? "Убрать из избранного" : "В избранное"} — ${hotel.name}`}
        title={selected ? "Убрать из избранного" : "В избранное"}
        className="absolute right-3 top-3 h-8 w-8 bg-card/95 text-card-foreground"
      >
        <Heart
          className={cn("transition-colors", selected && "fill-current text-coral")}
          aria-hidden="true"
        />
      </CardControl>
      {photos.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-3 bottom-12 flex items-center justify-between gap-2 transition-opacity duration-200 [@media(hover:hover)]:invisible [@media(hover:hover)]:opacity-0 group-hover/photos:visible group-hover/photos:opacity-100 group-focus-within/photos:visible group-focus-within/photos:opacity-100">
            <span className="rounded-md bg-card/95 px-2 py-1 text-xs font-medium tabular-nums text-card-foreground">
              {current + 1} / {photos.length}
            </span>
            <div className="pointer-events-auto flex gap-1">
              <CardControl
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-card/95 text-card-foreground"
                onClick={() => go(-1)}
                aria-label={`Предыдущее фото — ${hotel.name}`}
                title="Предыдущее фото"
              >
                <ChevronLeft />
              </CardControl>
              <CardControl
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-card/95 text-card-foreground"
                onClick={() => go(1)}
                aria-label={`Следующее фото — ${hotel.name}`}
                title="Следующее фото"
              >
                <ChevronRight />
              </CardControl>
            </div>
          </div>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            Фото {current + 1} из {photos.length}
          </span>
        </>
      )}
    </div>
  );
}
