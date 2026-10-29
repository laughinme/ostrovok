import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Moon,
  MoveHorizontal,
  RotateCcw,
  ShieldCheck,
  Sun,
  Volume2,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import type { Hotel } from "@/entities/hotel";
import { useGeoQuery } from "../lib/use-geo-query";
import {
  FACADE_ANGLE,
  noiseFacades,
  numberLabel,
  type GeoFacade,
  type NoiseData,
} from "../model/geo";
import { facadeRotation, noiseIndexLabel, NOISE_FACADE_NAMES } from "../model/noise-presentation";
import { GeoNotes, GeoStatus } from "./geo-status";
import { NoiseSceneView } from "./noise-scene-view";
import { NoiseCompass } from "./noise-compass";
import "./noise-section.css";

const SOURCE_NAME: Record<string, string> = {
  road: "Дорога",
  railway: "Железная дорога",
  rail: "Железная дорога",
  leisure: "Досуг",
  nightlife: "Ночная жизнь",
  airport: "Аэропорт",
  industrial: "Промышленность",
};

export function NoiseSection({ hotel }: { hotel: Hotel }) {
  const [period, setPeriod] = useState<"day" | "night">("night");
  const query = useGeoQuery<NoiseData>(hotel.id, "noise", !!hotel.backend);
  const sides = noiseFacades(hotel.backend?.facades ?? [], query.data, period);
  const [selectedFacade, setSelected] = useState<GeoFacade | undefined>(sides[0]?.facade);
  const selected = sides.find((side) => side.facade === selectedFacade) ?? sides[0];
  const [rotation, setRotation] = useState(() =>
    facadeRotation(FACADE_ANGLE[sides[0]?.facade ?? "NE"]),
  );
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;
  useEffect(() => {
    const element = query.ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [query.ref]);
  const select = (facade: GeoFacade) => {
    setSelected(facade);
    setRotation(facadeRotation(FACADE_ANGLE[facade]));
  };
  const step = (offset: number) => {
    if (!sides.length) return;
    const current = sides.findIndex((side) => side.facade === selected?.facade);
    select(sides[(current + offset + sides.length) % sides.length]!.facade);
  };
  const known = selected?.level?.indexDb != null;
  return (
    <section
      className="noise-explorer"
      id="night"
      ref={query.ref}
      aria-labelledby="noise-heading"
      data-period={period}
    >
      <header className="noise-heading">
        <div>
          <h3 id="noise-heading">Ваша ночь</h3>
          <p>Тишина с разных сторон отеля</p>
        </div>
        <div className="noise-period" role="group" aria-label="Время суток для расчёта шума">
          {(["day", "night"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {value === "day" ? (
                <Sun size={17} aria-hidden="true" />
              ) : (
                <Moon size={17} aria-hidden="true" />
              )}
              {value === "day" ? "День" : "Ночь"}
            </button>
          ))}
        </div>
      </header>
      <div className="noise-layout">
        <div className="noise-stage">
          <div className="noise-stage-top">
            <span>
              <span className="noise-stage-dot" />
              Схема отеля
            </span>
            <button
              type="button"
              aria-label="Вернуть модель к выбранной стороне"
              disabled={!selected}
              onClick={() => {
                if (selected) select(selected.facade);
              }}
            >
              <RotateCcw size={17} aria-hidden="true" />
            </button>
          </div>
          <NoiseSceneView
            ready={ready}
            period={period}
            floors={hotel.backend?.floors ?? 6}
            selected={selected?.facade}
            rotation={rotation}
            onRotate={setRotation}
            reducedMotion={reducedMotion}
            sides={sides.map((side) => ({
              facade: side.facade,
              color: side.color,
              known: side.level?.indexDb != null,
            }))}
            onSelect={select}
          />
          <div className="noise-stage-bottom">
            <span className="noise-drag-hint">
              <MoveHorizontal size={16} aria-hidden="true" />
              Поверните модель
            </span>
            <div className="noise-orbit-controls">
              <button
                type="button"
                aria-label="Предыдущая сторона здания"
                onClick={() => step(-1)}
                disabled={sides.length < 2}
              >
                <ChevronLeft size={19} aria-hidden="true" />
              </button>
              <span>{selected ? NOISE_FACADE_NAMES[selected.facade] : "Стороны не размечены"}</span>
              <button
                type="button"
                aria-label="Следующая сторона здания"
                onClick={() => step(1)}
                disabled={sides.length < 2}
              >
                <ChevronRight size={19} aria-hidden="true" />
              </button>
            </div>
            <small>
              {hotel.backend?.floors
                ? `Этажей: ${hotel.backend.floors} · геометрия условная`
                : "Геометрия условная"}
            </small>
          </div>
        </div>
        <div className="noise-inspector">
          <div className="noise-inspector-label">
            <Volume2 size={16} aria-hidden="true" />
            Индекс по фасадам
          </div>
          <div className="noise-selected-reading" aria-live="polite" aria-atomic="true">
            <span>{selected ? NOISE_FACADE_NAMES[selected.facade] : "Нет размеченных сторон"}</span>
            <div>
              <strong style={{ color: known ? selected?.color : undefined }}>
                {known ? selected?.text : "-"}
              </strong>
              <span>{noiseIndexLabel(selected?.level?.indexDb)}</span>
            </div>
          </div>
          <NoiseCompass
            sides={sides.map((side) => ({
              facade: side.facade,
              text: side.text,
              color: side.color,
              known: side.level?.indexDb != null,
            }))}
            selected={selected?.facade}
            onSelect={select}
          />
          <div className="noise-request-status">
            <GeoStatus
              pending={query.isLoading}
              error={query.error}
              retry={query.refetch}
              available={!!hotel.backend}
            />
          </div>
          {selected?.level && (
            <details className="noise-sources" key={`${selected.facade}-${period}`}>
              <summary>
                <span>
                  Что влияет на эту сторону
                  <small>
                    Источников: {selected.level.sources.length} · уверенность{" "}
                    {numberLabel(selected.level.confidence * 100, "%")}
                  </small>
                </span>
                <ChevronDown size={17} aria-hidden="true" />
              </summary>
              {selected.level.sources.length ? (
                <ul>
                  {selected.level.sources.map((source, index) => (
                    <li key={`${source.osmRef}-${index}`}>
                      <div>
                        <b>{SOURCE_NAME[source.kind] ?? source.kind}</b>
                        <span>{numberLabel(source.distanceM, " м")}</span>
                      </div>
                      <p>
                        {source.screened ? "Экранирован зданием" : "Без экранирования"} · индекс{" "}
                        {numberLabel(source.indexDb)} · ослабление по направлению{" "}
                        {numberLabel(source.orientationLossDb)}
                      </p>
                      <small>{source.osmRef}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="noise-no-sources">Источники для этой стороны не указаны.</p>
              )}
            </details>
          )}
          <p className="noise-model-note">
            <Info size={15} aria-hidden="true" />
            Условный индекс по OpenStreetMap. Это модель окружения, а не измерение шума.
          </p>
        </div>
      </div>
      {query.data && (
        <details className="noise-method">
          <summary>
            <ShieldCheck size={17} aria-hidden="true" />
            <span>О расчёте и источниках</span>
            <small>Полнота {numberLabel(query.data.completeness * 100, "%")}</small>
            <ChevronDown size={17} aria-hidden="true" />
          </summary>
          <div>
            <p>Не учтено источников: {query.data.unmodelledRefs.length}</p>
            <GeoNotes caveats={query.data.caveats} attribution={query.data.attribution} />
          </div>
        </details>
      )}
    </section>
  );
}
