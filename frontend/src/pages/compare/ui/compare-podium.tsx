import { photoInfo, type Hotel } from "@/entities/hotel";
import { cn } from "@/shared/lib";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import "./compare-podium.css";

export function ComparePodium({ entries }: { entries: { h: Hotel; s: number }[] }) {
  const reduceMotion = useReducedMotion();
  if (entries.length === 0) return null;

  return (
    <section
      aria-label="Лучшие совпадения"
      className="compare-podium mt-8 overflow-hidden rounded-3xl border border-primary/30 bg-white px-4 pt-6 text-night sm:px-8 sm:pt-8"
    >
      <ol
        aria-label="Места по совпадению с выбранными критериями"
        className={cn(
          "mx-auto grid max-w-4xl items-end gap-2 sm:gap-5",
          entries.length === 3 ? "grid-cols-3" : "max-w-2xl grid-cols-2",
        )}
      >
        {entries.slice(0, 3).map(({ h, s }, index) => (
          <motion.li
            layout={!reduceMotion}
            transition={{ duration: 0.3 }}
            key={h.id}
            data-rank={index + 1}
            className={cn(
              "compare-podium-entry row-start-1 min-w-0",
              index === 0 && "col-start-2",
              index === 1 && "col-start-1",
              index === 2 && "col-start-3",
            )}
          >
            <div className="compare-podium-contestant">
              <Link
                to="/hotel/$id"
                params={{ id: h.id }}
                aria-label={`${index + 1} место: ${h.name}, совпадение ${s}%`}
                className="compare-podium-hotel block rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <p
                  className={cn(
                    "mb-3 text-center font-mono text-xl font-semibold tabular-nums sm:text-2xl",
                    index === 0 ? "text-primary" : "text-night",
                  )}
                >
                  {s}
                  <span className="text-xs sm:text-sm">%</span>
                </p>
                <div className="relative">
                  <div
                    className={cn(
                      "aspect-[4/3] overflow-hidden rounded-xl border-2 sm:aspect-[16/10] sm:rounded-2xl",
                      index === 0 ? "border-primary" : "border-night/15",
                    )}
                  >
                    <img
                      src={h.image}
                      alt={photoInfo(h.image)?.alt ?? h.name}
                      width={1024}
                      height={768}
                      className="size-full object-cover"
                    />
                  </div>
                  {photoInfo(h.image) && (
                    <span className="mt-1 block text-center text-[9px] text-muted-foreground">
                      {photoInfo(h.image)!.label}
                    </span>
                  )}
                  {index === 0 && (
                    <span className="compare-podium-crown-anchor" aria-hidden="true">
                      <svg
                        viewBox="0 0 80 64"
                        className="compare-podium-crown size-full text-award-gold"
                        fill="currentColor"
                      >
                        <path d="M6 14 24 26 40 3 56 26 74 14 66 58H14Z" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="pt-3 text-center">
                  <h3 className="flex min-h-8 items-center justify-center break-words font-display text-[10px] leading-4 sm:min-h-10 sm:text-sm sm:leading-5 lg:text-base">
                    {h.name}
                  </h3>
                </div>
              </Link>
              <div
                aria-hidden="true"
                className={cn(
                  "compare-podium-step mt-3 flex flex-col items-center justify-center gap-1 rounded-t-xl border-x border-t sm:mt-4 sm:rounded-t-2xl",
                  index === 0 && "h-24 border-sun bg-sun text-night sm:h-28",
                  index === 1 && "h-16 border-primary bg-primary text-primary-foreground sm:h-20",
                  index === 2 && "h-12 border-primary bg-primary text-primary-foreground sm:h-16",
                )}
              >
                <span className="font-mono text-3xl font-semibold leading-none sm:text-4xl">
                  {index + 1}
                </span>
                <span className="text-[9px] uppercase tracking-widest opacity-70 sm:text-[10px]">
                  место
                </span>
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
