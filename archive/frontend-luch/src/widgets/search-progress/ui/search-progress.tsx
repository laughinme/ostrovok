import { CRITERIA } from "@/entities/hotel";
import { parseQuery, rank } from "@/features/hotel-search";
import { Link, useNavigate } from "@tanstack/react-router";
import { useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Calculator,
  Database,
  Map,
  Send,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import { ClientOnly } from "@/shared/ui";
import { AgentCard } from "./agent-card";
import { AgentTimeline } from "./agent-timeline";
import { GlobePlaceholder } from "./globe-placeholder";

const Globe = lazy(() => import("./globe").then((m) => ({ default: m.Globe })));

const STEP_DURATION = 1250;

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
  const [hydrated, setHydrated] = useState(false);
  const motionPreference = useReducedMotion();
  const reducedMotion = hydrated && motionPreference === true;

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

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (step >= steps.length) {
      const t = setTimeout(() => navigate({ to: "/results", search: { q } }), 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_DURATION);
    return () => clearTimeout(t);
  }, [step, steps.length, navigate, q]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-night text-night-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="text-3xl sm:text-4xl">Обработка Вашего Запроса</h1>
          <div className="relative mt-6 aspect-square max-w-md overflow-hidden">
            <ClientOnly fallback={<GlobePlaceholder />}>
              <Suspense fallback={<GlobePlaceholder />}>
                <Globe progress={step / steps.length} reducedMotion={reducedMotion} />
              </Suspense>
            </ClientOnly>
          </div>
        </div>

        <section className="flex h-full flex-col justify-center gap-4">
          <AgentTimeline
            stages={steps}
            step={step}
            duration={STEP_DURATION}
            reducedMotion={reducedMotion}
          />
          <AgentCard
            stage={steps[Math.min(step, steps.length - 1)]!}
            step={step}
            total={steps.length}
            duration={STEP_DURATION}
            reducedMotion={reducedMotion}
          />
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
