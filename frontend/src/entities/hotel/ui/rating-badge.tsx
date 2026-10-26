import { cn } from "@/shared/lib";
import { Star } from "lucide-react";
export function RatingBadge({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-sun px-3 py-1.5 text-night shadow-soft",
        className,
      )}
    >
      <Star className="h-3.5 w-3.5 fill-current opacity-90" />
      <span className="font-mono text-sm font-bold leading-none tabular-nums">
        {rating.toFixed(1)}
      </span>
      <span className="h-3 w-px bg-night/25" />
      <span className="font-mono text-[9px] uppercase leading-none tracking-wider opacity-70">
        демо
      </span>
    </span>
  );
}
