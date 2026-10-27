import { AnimatePresence, motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AgentCard({
  stage,
  step,
  total,
  duration,
  reducedMotion,
}: {
  stage: { title: string; icon: LucideIcon; body: ReactNode };
  step: number;
  total: number;
  duration: number;
  reducedMotion: boolean;
}) {
  const done = step >= total;
  const Icon = done ? Check : stage.icon;
  return (
    <div className="relative flex h-[272px] w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-coral p-6 text-primary-foreground shadow-glow">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sun/10 blur-3xl"
      />
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={done ? "done" : step}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: reducedMotion ? 0 : -6,
              transition: { duration: reducedMotion ? 0.1 : 0.12 },
            }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sun text-night">
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary-foreground/75">
                {done ? "Готово к путешествию" : "Агент в работе"}
              </span>
              <span className="ml-auto font-mono text-xs tabular-nums text-primary-foreground/55">
                {String(Math.min(step + 1, total)).padStart(2, "0")} /{" "}
                {String(total).padStart(2, "0")}
              </span>
            </div>
            <h2 className="mt-5 text-2xl leading-tight sm:text-3xl">
              {done ? "Подборка готова" : stage.title}
            </h2>
            <div className="mt-3 text-sm leading-relaxed text-primary-foreground/85">
              {done ? <p>Нашли совпадения. Показываем ваши отели…</p> : stage.body}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-night/15">
        <motion.div
          key={step}
          className="h-full origin-left bg-sun/85"
          initial={{ scaleX: done || reducedMotion ? 1 : 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: done || reducedMotion ? 0 : duration / 1000, ease: "linear" }}
        />
      </div>
    </div>
  );
}
