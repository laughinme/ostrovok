import { Beam, CRITERIA, Price, RatingBadge, type Criterion } from "@/entities/hotel";
import { CompareButton } from "@/features/compare-hotels";
import { explain, type Ranked } from "@/features/hotel-search";
import { cn } from "@/shared/lib";
import { MatchRing } from "@/shared/ui";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertCircle, Sparkles } from "lucide-react";
export function HotelResultCard({
  result: r,
  index: i,
  criteria,
  query: q,
  active,
  onHover,
}: {
  result: Ranked;
  index: number;
  criteria: Criterion[];
  query: string;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <motion.article
      layout
      key={r.hotel.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      onMouseEnter={() => onHover(r.hotel.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        "group grid overflow-hidden rounded-3xl border bg-card transition duration-300 sm:grid-cols-[260px_1fr]",
        active && "shadow-soft ring-1 ring-coral/30",
      )}
    >
      <Link
        to="/hotel/$id"
        params={{ id: r.hotel.id }}
        search={{ q }}
        className="relative block h-52 overflow-hidden sm:h-full"
      >
        <img
          src={r.hotel.image}
          alt={r.hotel.name}
          loading="lazy"
          width={1024}
          height={768}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <RatingBadge rating={r.hotel.rating} className="absolute left-3 top-3" />
        {i === 0 && (
          <span className="absolute left-3 top-[52px] rounded-full bg-sunset px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-soft">
            Лучшее совпадение
          </span>
        )}
      </Link>
      <div className="flex flex-col p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{r.hotel.district}</p>
            <Link
              to="/hotel/$id"
              params={{ id: r.hotel.id }}
              search={{ q }}
              className="mt-1 block font-display text-2xl transition-colors hover:text-coral"
            >
              {r.hotel.name}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{r.hotel.tagline}</p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <MatchRing value={r.score} />
            <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              совпадение
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {criteria.map((c) => (
            <div key={c}>
              <div className="flex justify-between text-[11px]">
                <span>{CRITERIA[c].short}</span>
                <span className="font-mono text-muted-foreground">{r.hotel.scores[c]}</span>
              </div>
              <Beam
                value={r.hotel.scores[c] / 100}
                status={
                  r.hotel.scores[c] >= 80
                    ? "confirmed"
                    : r.hotel.scores[c] >= 60
                      ? "computed"
                      : "assumed"
                }
                className="mt-1"
              />
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm">
          <Sparkles className="mr-1 inline h-3.5 w-3.5 text-coral" />
          {explain(r)}{" "}
          <span className="text-muted-foreground">
            Обнаружено: {r.hotel.discovered[0]!.toLowerCase()}.
          </span>
        </p>
        {r.weak.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            <AlertCircle className="mr-1 inline h-3.5 w-3.5 text-conf-low" />
            Компромисс: {r.weak.map((c) => CRITERIA[c].short.toLowerCase()).join(", ")} —{" "}
            {r.hotel.cons[0]!.toLowerCase()}.
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-t border-border/70 pt-4">
          <Price value={r.hotel.price} />
          <CompareButton hotelId={r.hotel.id} />
        </div>
      </div>
    </motion.article>
  );
}
