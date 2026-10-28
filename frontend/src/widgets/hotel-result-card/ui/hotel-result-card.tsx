import { Beam, BestOfferRibbon, CRITERIA, Price, type Criterion } from "@/entities/hotel";
import { useCompare } from "@/features/compare-hotels";
import type { Ranked } from "@/features/hotel-search";
import { cn } from "@/shared/lib";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  Calculator,
  Check,
  ChevronDown,
  Footprints,
  HelpCircle,
  MapPin,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { useState } from "react";
import { CardControl } from "./card-control";
import { cardControlStyles } from "./card-control-styles";
import { HotelCardPhotos } from "./hotel-card-photos";
import "./hotel-result-card.css";

interface HotelResultCardProps {
  result: Ranked;
  criteria: Criterion[];
  query: string;
  index: number;
  active: boolean;
  onHover: (id: string | null) => void;
}

const MAX_BEAMS = 4;

export function HotelResultCard({
  result: r,
  criteria,
  query,
  index,
  active: highlighted,
  onHover,
}: HotelResultCardProps) {
  const selected = useCompare((state) => state.ids.includes(r.hotel.id));
  const toggle = useCompare((state) => state.toggle);
  const onCompare = () => toggle(r.hotel.id);
  const [showAllBeams, setShowAllBeams] = useState(false);
  const reducedMotion = useReducedMotion();

  const nearby = r.hotel.walk.slice(0, 2);
  const usefulFacts = r.hotel.facts.filter((fact) => fact.status !== "conflict").slice(0, 2);
  const caveat = r.hotel.cons[0];
  const hiddenBeams = criteria.length - MAX_BEAMS;
  const shownBeams = showAllBeams ? criteria : criteria.slice(0, MAX_BEAMS);

  return (
    <motion.article
      layout
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reducedMotion ? 0 : index * 0.04 }}
      onMouseEnter={() => onHover(r.hotel.id)}
      onMouseLeave={() => onHover(null)}
      aria-label={r.hotel.name}
      className={cn(
        "hotel-result-card @container/hotel-card group relative",
        index === 0 && "pt-3",
      )}
    >
      {index === 0 && <BestOfferRibbon />}
      <div
        className={cn(
          "grid overflow-hidden rounded-lg border bg-card transition-shadow @min-[580px]:grid-cols-[38%_minmax(0,1fr)]",
          index === 0 &&
            "rounded-3xl border-x-[3px] border-b-[3px] border-primary bg-primary pt-3 ring-1 ring-primary",
          highlighted && "shadow-soft",
          highlighted && index !== 0 && "border-primary/40",
        )}
      >
        <HotelCardPhotos hotel={r.hotel} query={query} searchId={r.searchId} />

        <div className="hotel-card-body flex min-w-0 flex-col bg-card">
          <div className="px-5 pb-2.5 pt-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5 text-primary" aria-label={`${r.hotel.stars} звезды`}>
                  {Array.from({ length: r.hotel.stars }, (_, i) => (
                    <Star key={i} className="h-3 w-3 fill-current" />
                  ))}
                </div>
              </div>
              <span
                className="text-[11px] text-muted-foreground"
                title="Насколько отель совпадает с вашим запросом по выбранным критериям"
              >
                <strong className="text-sm font-bold tabular-nums text-primary">{r.score}%</strong>{" "}
                совпадение
              </span>
            </div>
            <Link
              to="/hotel/$id"
              params={{ id: r.hotel.id }}
              search={{ q: query, sid: r.searchId }}
              className="block text-lg font-bold leading-snug text-foreground transition-colors hover:text-primary"
            >
              {r.hotel.name}
            </Link>
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {r.hotel.address}
            </p>
            <p className="mt-1.5 line-clamp-1 text-sm leading-relaxed">{r.hotel.tagline}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {nearby.map((place) => (
                <span key={place.name} className="flex items-center gap-1.5 text-xs">
                  <Footprints className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    {place.name}{" "}
                    <span className="font-semibold whitespace-nowrap">· {place.minutes} мин</span>
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="mx-5 border-y py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Под ваш запрос
              </span>
              {hiddenBeams > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllBeams((v) => !v)}
                  aria-expanded={showAllBeams}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
                >
                  {showAllBeams ? "свернуть" : `ещё ${hiddenBeams}`}
                  <ChevronDown
                    className={cn("h-3 w-3 transition-transform", showAllBeams && "rotate-180")}
                  />
                </button>
              )}
            </div>
            <div
              className={cn(
                "mt-2 grid gap-x-4 gap-y-1.5",
                shownBeams.length <= 2
                  ? "grid-cols-2"
                  : "grid-cols-2 @min-[700px]/hotel-card:grid-cols-4",
              )}
            >
              {shownBeams.map((criterion) => (
                <div key={criterion}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span>{CRITERIA[criterion].short}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {r.hotel.unknownCriteria?.includes(criterion)
                        ? "?"
                        : r.hotel.scores[criterion]}
                    </span>
                  </div>
                  <Beam
                    value={r.hotel.scores[criterion] / 100}
                    status={
                      r.hotel.backend
                        ? r.hotel.unknownCriteria?.includes(criterion)
                          ? "assumed"
                          : "computed"
                        : r.hotel.scores[criterion] >= 80
                          ? "confirmed"
                          : r.hotel.scores[criterion] >= 60
                            ? "computed"
                            : "assumed"
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-2.5">
            <div className="flex items-center gap-1.5">
              {usefulFacts.map((fact) => {
                const Icon =
                  fact.status === "confirmed"
                    ? ShieldCheck
                    : fact.status === "computed"
                      ? Calculator
                      : HelpCircle;
                return (
                  <span
                    key={fact.id ?? fact.label}
                    className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] leading-snug"
                    title={`${fact.label}: ${fact.value} · ${fact.status === "confirmed" ? "Подтверждено" : fact.status === "computed" ? "Расчёт по открытым данным" : "Предположение"} · ${fact.source} · ${fact.checkedAt}`}
                  >
                    <Icon
                      className={cn(
                        "h-3 w-3 shrink-0",
                        fact.status === "confirmed" ? "text-conf-high" : "text-primary",
                      )}
                    />
                    <span className="truncate text-muted-foreground">{fact.label}: </span>
                    <span className="shrink-0 font-medium">{fact.value}</span>
                  </span>
                );
              })}
              {caveat && (
                <span
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-[11px] leading-snug"
                  title={`Учтите: ${caveat}`}
                >
                  <AlertCircle className="h-3 w-3 shrink-0 text-primary" />
                  <span className="truncate">{caveat}</span>
                </span>
              )}
            </div>
          </div>

          <div className="hotel-card-footer mt-auto border-t">
            <div className="hotel-card-price">
              <p className="mb-1 text-[11px] text-muted-foreground">Цена за ночь</p>
              <Price value={r.hotel.price} suffix="" />
            </div>
            <CardControl
              variant={selected ? "secondary" : "outline"}
              onClick={onCompare}
              aria-pressed={selected}
              aria-label={`${selected ? "Убрать из сравнения" : "Сравнить"} — ${r.hotel.name}`}
              title={selected ? "Убрать из сравнения" : "Добавить в сравнение"}
              className={cn(
                "hotel-card-footer-control",
                selected && "bg-accent text-accent-foreground",
              )}
            >
              {selected ? <Check /> : <Scale />}
              {selected ? "В сравнении" : "Сравнить"}
            </CardControl>
            <Link
              to="/hotel/$id"
              params={{ id: r.hotel.id }}
              search={{ q: query, sid: r.searchId }}
              className={cardControlStyles({
                className: "hotel-card-footer-control",
              })}
            >
              Подробнее <ArrowUpRight />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
