import { cn } from "@/shared/lib";
import { Star } from "lucide-react";

export function RatingBadge({
  rating,
  className,
}: {
  rating: number;
  reviewCount: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex shrink-0 flex-col items-end gap-1", className)}>
      <span
        className="inline-flex items-center gap-1.5 rounded-lg bg-sun px-2.5 py-1.5 text-night"
        aria-label={`Оценка ${rating.toFixed(1)} из 10`}
      >
        <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
        <span className="font-mono text-sm font-bold leading-none tabular-nums">
          {rating.toFixed(1)}
        </span>
      </span>
      <span className="whitespace-nowrap text-[11px] leading-4 text-muted-foreground">
        Демо-рейтинг
      </span>
    </span>
  );
}
