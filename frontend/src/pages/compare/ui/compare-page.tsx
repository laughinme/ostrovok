import {
  BestOfferRibbon,
  CRITERIA,
  StatusPill,
  PhotoCredit,
  photoInfo,
  type Criterion,
} from "@/entities/hotel";
import { useCompare, useComparison } from "@/features/compare-hotels";
import { cn } from "@/shared/lib";
import { MatchRing, RequestState } from "@/shared/ui";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";
import { ComparePodium } from "./compare-podium";
import "./compare-page.css";

export function ComparePage() {
  const { ids, toggle, clear, criteria: crit, toggleCriterion } = useCompare();
  const { scored, pending, error, retry } = useComparison(ids, crit);
  const selected = scored.map(({ h }) => h);

  if (ids.length < 2) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl sm:text-5xl">Сравнение отелей</h1>
        <section className="mt-8 rounded-3xl border bg-card px-6 py-12 text-center sm:py-16">
          <h2 className="text-2xl sm:text-3xl">
            {ids.length === 0 ? "Пока нечего сравнивать" : "Добавьте ещё один отель"}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            {ids.length === 0
              ? "Нажмите «Сравнить» у двух или трёх отелей в результатах поиска. Здесь появится сравнение по вашим критериям."
              : "Выбран 1 отель. Нажмите «Сравнить» ещё у одного или двух отелей в результатах поиска."}
          </p>
          <Link
            to="/results"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            Найти отели
          </Link>
          {ids.length > 0 && (
            <div className="mt-3">
              <button onClick={clear} className="min-h-11 px-4 text-sm text-muted-foreground">
                Очистить сравнение
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Что важно именно вам?</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {(Object.keys(CRITERIA) as Criterion[]).map((c) => (
          <button
            key={c}
            onClick={() => toggleCriterion(c)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              crit.includes(c) ? "border-foreground bg-foreground text-background" : "",
            )}
          >
            {CRITERIA[c].short}
          </button>
        ))}
      </div>

      <RequestState pending={pending} error={error} retry={retry} />
      <ComparePodium entries={scored} />

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {scored.map(({ h, s }, i) => (
          <motion.div layout key={h.id} className={cn("relative flex flex-col", i === 0 && "pt-3")}>
            {i === 0 && <BestOfferRibbon />}
            <div
              className={cn(
                "flex flex-1 flex-col overflow-hidden rounded-3xl border bg-card",
                i === 0 &&
                  "border-x-[3px] border-b-[3px] border-primary bg-primary pt-3 ring-1 ring-primary",
              )}
            >
              <div className="relative h-40 shrink-0">
                <img
                  src={h.image}
                  alt={photoInfo(h.image)?.alt ?? h.name}
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="h-full w-full object-cover"
                />
                <PhotoCredit
                  src={h.image}
                  compact
                  className="absolute bottom-2 left-2 rounded-md bg-white/95 px-2 py-1 text-[10px] text-night"
                />
                {ids.includes(h.id) && (
                  <button
                    onClick={() => toggle(h.id)}
                    aria-label={`Убрать из сравнения — ${h.name}`}
                    className="glass absolute right-3 top-3 rounded-full p-1.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex-1 bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Link
                      to="/hotel/$id"
                      params={{ id: h.id }}
                      className="font-display text-2xl hover:text-coral"
                    >
                      {h.name}
                    </Link>
                    <p className="font-mono text-sm">{h.price.toLocaleString("ru")} ₽</p>
                  </div>
                  <MatchRing value={s} size={56} stroke={5} />
                </div>
                <div className="mt-4 space-y-2">
                  {crit.map((c) => {
                    const best = Math.max(...selected.map((x) => x.scores[c]));
                    return (
                      <div key={c} className="flex items-center gap-2 text-sm">
                        <span className="w-28 text-muted-foreground">{CRITERIA[c].short}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            layout
                            className={cn(
                              "h-full rounded-full",
                              h.scores[c] === best ? "bg-sunset" : "bg-sea/60",
                            )}
                            style={{ width: `${h.scores[c]}%` }}
                          />
                        </div>
                        <span className="w-7 text-right font-mono text-xs">{h.scores[c]}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 text-sm">
                  <ul aria-label="Плюсы" className="min-w-0 space-y-1">
                    {h.pros.map((p) => (
                      <li key={p} className="flex gap-2">
                        <ThumbsUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-conf-high" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <ul aria-label="Минусы" className="min-w-0 space-y-1">
                    {h.cons.map((p) => (
                      <li key={p} className="flex gap-2 text-muted-foreground">
                        <ThumbsDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-conf-low" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 space-y-1.5 border-t pt-3">
                  {h.facts.slice(0, 3).map((f) => (
                    <div
                      key={f.id ?? f.label}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span>{f.label}</span>
                      <StatusPill status={f.status} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
