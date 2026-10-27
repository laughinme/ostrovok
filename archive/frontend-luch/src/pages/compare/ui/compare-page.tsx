import { CRITERIA, hotels, StatusPill, type Criterion } from "@/entities/hotel";
import { useCompare } from "@/features/compare-hotels";
import { scoreHotel } from "@/features/hotel-search";
import { cn } from "@/shared/lib";
import { MatchRing } from "@/shared/ui";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useState } from "react";

export function ComparePage() {
  const { ids, toggle } = useCompare();
  const selected = (
    ids.length >= 2 ? ids : ["zakatny-bereg", "kiparisovaya-alleya", "dom-na-holme"]
  ).map((id) => hotels.find((h) => h.id === id)!);
  const [crit, setCrit] = useState<Criterion[]>(["quiet", "sunset", "sea", "work"]);
  const scored = selected.map((h) => ({ h, s: scoreHotel(h, crit) })).sort((a, b) => b.s - a.s);
  const winner = scored[0]!;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-coral">Сравнение</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">Что важно именно вам?</h1>
      {ids.length < 2 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Показан пример. Добавьте отели кнопкой «Сравнить» в{" "}
          <Link to="/results" className="text-coral underline">
            подборке
          </Link>
          .
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        {(Object.keys(CRITERIA) as Criterion[]).map((c) => (
          <button
            key={c}
            onClick={() =>
              setCrit((cs) =>
                cs.includes(c) ? (cs.length > 1 ? cs.filter((x) => x !== c) : cs) : [...cs, c],
              )
            }
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              crit.includes(c) ? "border-foreground bg-foreground text-background" : "",
            )}
          >
            {CRITERIA[c].short}
          </button>
        ))}
      </div>

      <motion.div layout className="mt-8 rounded-3xl bg-night p-6 text-night-foreground sm:p-8">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-sun">
          <Sparkles className="h-4 w-4" /> Рекомендация Луча
        </p>
        <h2 className="mt-3 text-3xl">
          «{winner.h.name}» — {winner.s}% под ваши критерии
        </h2>
        <div className="mt-4 grid gap-3 text-sm text-night-muted sm:grid-cols-2">
          {scored.slice(1).map(({ h }) => {
            const better = crit.filter((c) => h.scores[c] > winner.h.scores[c]);
            return (
              <p key={h.id}>
                <span className="text-night-foreground">Выберите «{h.name}», если</span>{" "}
                {better.length
                  ? `важнее ${better.map((c) => CRITERIA[c].short.toLowerCase()).join(" и ")}`
                  : "цена важнее остального"}{" "}
                — {h.pros[0]!.toLowerCase()}, но {h.cons[0]!.toLowerCase()}.
              </p>
            );
          })}
        </div>
      </motion.div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {scored.map(({ h, s }, i) => (
          <motion.div
            layout
            key={h.id}
            className={cn(
              "overflow-hidden rounded-3xl border bg-card",
              i === 0 && "ring-2 ring-coral",
            )}
          >
            <div className="relative h-40">
              <img
                src={h.image}
                alt={h.name}
                loading="lazy"
                width={1024}
                height={768}
                className="h-full w-full object-cover"
              />
              {ids.includes(h.id) && (
                <button
                  onClick={() => toggle(h.id)}
                  className="glass absolute right-3 top-3 rounded-full p-1.5"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="p-5">
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
                  <div key={f.label} className="flex items-center justify-between gap-2 text-xs">
                    <span>{f.label}</span>
                    <StatusPill status={f.status} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
