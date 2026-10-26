import { CRITERIA } from "@/entities/hotel";
import { parseQuery, rank } from "@/features/hotel-search";
import { cn } from "@/shared/lib";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Calculator,
  Check,
  Database,
  Map,
  Send,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import { ClientOnly } from "@/shared/ui";

const Globe = lazy(() => import("./globe").then((m) => ({ default: m.Globe })));

function GlobeFallback() {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="h-2/3 w-2/3 animate-pulse rounded-full bg-sea/25" />
    </div>
  );
}

const SOURCES = [
  "OpenStreetMap",
  "Рельеф SRTM",
  "3D‑застройка",
  "1 284 отзыва",
  "Афиша города",
  "Ответы отельеров",
];

export function SearchProgress({ query: q }: { query: string }) {
  const navigate = useNavigate();
  const criteria = useMemo(() => parseQuery(q), [q]);
  const top = useMemo(() => rank(criteria), [criteria]) as [
    ReturnType<typeof rank>[number],
    ...ReturnType<typeof rank>,
  ];
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Brain,
      title: "Понимаю запрос",
      body: (
        <div className="flex flex-wrap gap-2">
          {criteria.map((c) => (
            <span key={c} className="rounded-full bg-coral/20 px-3 py-1 text-xs text-sun">
              {CRITERIA[c].label}
            </span>
          ))}
        </div>
      ),
    },
    {
      icon: Database,
      title: "Выбираю источники",
      body: (
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <span
              key={s}
              className="rounded-md border border-night-muted/30 px-2 py-1 font-mono text-[11px]"
            >
              {s}
            </span>
          ))}
        </div>
      ),
    },
    {
      icon: Map,
      title: "Исследую геоданные",
      body: <p>Изохроны, бары и дороги в радиусе 600 м.</p>,
    },
    {
      icon: Calculator,
      title: "Вычисляю нестандартные характеристики",
      body: <p>Шум, видимость заката, высота до пляжа.</p>,
    },
    {
      icon: ShieldCheck,
      title: "Оцениваю достоверность",
      body: <p>71% фактов подтверждены двумя источниками.</p>,
    },
    {
      icon: AlertTriangle,
      title: "Нахожу противоречия",
      body: <p>Лифт к пляжу на сайте закрыт по отзывам.</p>,
    },
    { icon: Send, title: "Спрашиваю отельера", body: <p>«Работает ли лифт?» — ждём ответ.</p> },
    {
      icon: Trophy,
      title: "Формирую рекомендацию",
      body: (
        <p>
          «{top[0].hotel.name}», {top[0].score}% — лучшее совпадение.
        </p>
      ),
    },
  ];

  useEffect(() => {
    if (step >= steps.length) {
      const t = setTimeout(() => navigate({ to: "/results", search: { q } }), 1200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 950);
    return () => clearTimeout(t);
  }, [step, steps.length, navigate, q]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-night text-night-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-coral">Ваш запрос</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">«{q}»</h1>
          <div className="relative mt-6 aspect-square max-w-md overflow-hidden">
            <ClientOnly fallback={<GlobeFallback />}>
              <Suspense fallback={<GlobeFallback />}>
                <Globe progress={step / steps.length} />
              </Suspense>
            </ClientOnly>
            <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
              <span className="rounded-full border border-night-muted/25 bg-night-foreground/10 px-4 py-1.5 font-mono text-xs backdrop-blur">
                {Math.min(step, steps.length)}/{steps.length} · агенты осматривают планету
              </span>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-2 font-mono text-[11px] text-night-muted">
              <span className="h-2 w-2 rounded-full bg-pin" />
              красным — точки, которые агенты уже проверили
            </div>
          </div>
        </div>

        <section className="flex h-full flex-col gap-6">
          <div className="relative">
            <div
              aria-hidden
              className="absolute left-5 right-5 top-[18px] h-1 rounded-full bg-night-foreground/10"
            />
            <div
              aria-hidden
              className="absolute left-5 right-5 top-[18px] h-1 overflow-hidden rounded-full"
            >
              <motion.div
                className="h-full origin-left rounded-full bg-sun"
                initial={false}
                animate={{ scaleX: Math.min(step, steps.length - 1) / (steps.length - 1) }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="relative flex items-start justify-between">
              {steps.map((s, i) => {
                const state = i < step ? "done" : i === step ? "run" : "wait";
                const Icon = state === "done" ? Check : s.icon;
                return (
                  <div key={s.title} className="flex w-10 flex-col items-center">
                    <span
                      className={cn(
                        "relative grid h-10 w-10 place-items-center rounded-full border-2 transition-colors duration-300",
                        state === "done" && "border-sun bg-sun text-night",
                        state === "run" && "border-sun bg-night-foreground/10 text-sun",
                        state === "wait" &&
                          "border-night-muted/25 bg-night-foreground/[0.06] text-night-muted/50",
                      )}
                    >
                      {state === "run" && (
                        <motion.span
                          aria-hidden
                          className="absolute inset-0 rounded-full border-2 border-sun"
                          animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                          transition={{ repeat: Infinity, duration: 1.4 }}
                        />
                      )}
                      <Icon className="relative h-4 w-4" />
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 font-mono text-[10px] tabular-nums",
                        state === "wait" ? "text-night-muted/50" : "text-night-foreground/80",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-1 items-center">
            <div className="relative min-h-[180px] w-full overflow-hidden rounded-3xl bg-coral p-6 text-primary-foreground shadow-glow">
              <div
                aria-hidden
                className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sun/25 blur-3xl"
              />
              <AnimatePresence mode="wait">
                {(() => {
                  const cur = steps[Math.min(step, steps.length - 1)]!;
                  const done = step >= steps.length;
                  const Icon = done ? Check : cur.icon;
                  return (
                    <motion.div
                      key={done ? "done" : step}
                      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -24, filter: "blur(6px)" }}
                      transition={{ duration: 0.35 }}
                      className="relative"
                    >
                      <div className="flex items-center gap-3">
                        <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-sun text-night">
                          {!done && (
                            <motion.span
                              aria-hidden
                              className="absolute inset-0 rounded-2xl bg-sun"
                              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                              transition={{ repeat: Infinity, duration: 1.4 }}
                            />
                          )}
                          <Icon className="relative h-6 w-6" />
                        </span>
                        <span className="font-mono text-xs uppercase tracking-widest opacity-80">
                          {done ? "готово" : `агент ${step + 1} · сейчас`}
                        </span>
                      </div>
                      <h2 className="mt-4 text-2xl sm:text-3xl">
                        {done ? "Подборка готова" : cur.title}
                      </h2>
                      <div className="mt-3 text-sm opacity-90">
                        {done ? <p>Открываем результаты…</p> : cur.body}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </div>

          <Link
            to="/results"
            search={{ q }}
            className="self-end text-sm text-sun underline-offset-4 hover:underline"
          >
            Пропустить и показать результаты →
          </Link>
        </section>
      </div>
    </main>
  );
}
