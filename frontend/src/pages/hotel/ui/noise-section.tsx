import { useState } from "react";
import type { Hotel } from "@/entities/hotel";
import { useGeoQuery } from "../lib/use-geo-query";
import {
  FACADE_ANGLE,
  FACADE_LABEL,
  noiseFacades,
  numberLabel,
  type NoiseData,
} from "../model/geo";
import { GeoNotes, GeoStatus } from "./geo-status";
import { Icon } from "./detail-ui";

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
  return (
    <section className="row-panel card-w" id="night" ref={query.ref}>
      <div className="rp-media light">
        <svg
          viewBox="0 0 640 420"
          role="img"
          aria-label={`Условный индекс шума по фасадам: ${period === "night" ? "ночь" : "день"}`}
        >
          <rect width="640" height="420" fill="var(--map-land)" />
          <path d="M244 182 L320 146 L396 182 L320 218 Z" fill="#fff" stroke="var(--line)" />
          <path d="M244 182 L320 218 L320 278 L244 242 Z" fill="#E6ECFA" stroke="var(--line)" />
          <path d="M320 218 L396 182 L396 242 L320 278 Z" fill="#D5DEF5" stroke="var(--line)" />
          {[0, 1, 2].map((row) => (
            <path
              key={row}
              d={`M255 ${203 + row * 15} l54 25 M331 ${228 + row * 15} l54 -25`}
              stroke="#A7B9E5"
              strokeWidth="5"
              strokeDasharray="8 5"
            />
          ))}
          {sides.map((side) => {
            const angle = (FACADE_ANGLE[side.facade] * Math.PI) / 180;
            const x = 320 + Math.sin(angle) * 218,
              y = 210 - Math.cos(angle) * 160;
            return (
              <g key={side.facade}>
                <line
                  x1={320 + Math.sin(angle) * 100}
                  y1={210 - Math.cos(angle) * 82}
                  x2={x}
                  y2={y}
                  stroke={side.color}
                  strokeWidth="2"
                  opacity=".5"
                />
                <rect
                  x={x - 82}
                  y={y - 17}
                  width="164"
                  height="34"
                  rx="17"
                  fill="white"
                  stroke="var(--line)"
                />
                <circle cx={x - 65} cy={y} r="5" fill={side.color} />
                <text x={x + 4} y={y + 5} textAnchor="middle" fontSize="14" fill="var(--ink)">
                  {FACADE_LABEL[side.facade]} · {side.text}
                </text>
              </g>
            );
          })}
          <text x="320" y="400" textAnchor="middle" fontSize="12" fill="var(--muted)">
            Схема ориентации фасадов · север сверху
          </text>
        </svg>
      </div>
      <div className="rp-side">
        <div className="rp-h">
          <h3>Ваша ночь</h3>
          <div className="seg">
            {(["day", "night"] as const).map((value) => (
              <button
                key={value}
                className={period === value ? "on" : ""}
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
              >
                <Icon name={value === "day" ? "sun" : "moon"} size={14} />
                {value === "day" ? "День" : "Ночь"}
              </button>
            ))}
          </div>
        </div>
        <p className="sub">Условный индекс по OSM · не измерение шума</p>
        <GeoStatus
          pending={query.isLoading}
          error={query.error}
          retry={query.refetch}
          available={!!hotel.backend}
        />
        <ul className="legend geo-noise">
          {sides.map(({ facade, color, text, level }) => (
            <li key={facade}>
              <span className="sw" style={{ background: color }} />
              <div>
                <strong>{FACADE_LABEL[facade]}</strong>
                {level && (
                  <details>
                    <summary>
                      Источники · {level.sources.length} · уверенность{" "}
                      {numberLabel(level.confidence * 100, "%")}
                    </summary>
                    <ul>
                      {level.sources.map((source, index) => (
                        <li key={`${source.osmRef}-${index}`}>
                          {SOURCE_NAME[source.kind] ?? source.kind} ·{" "}
                          {numberLabel(source.distanceM, " м")} ·{" "}
                          {source.screened ? "экранирован зданием" : "без экранирования"} · индекс{" "}
                          {numberLabel(source.indexDb)} · ослабление по направлению{" "}
                          {numberLabel(source.orientationLossDb)}
                          <small>{source.osmRef}</small>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              <b className="num">{text}</b>
            </li>
          ))}
        </ul>
        {query.data && (
          <>
            <p className="sub">
              Полнота модели {numberLabel(query.data.completeness * 100, "%")} · не учтено
              источников: {query.data.unmodelledRefs.length}
            </p>
            <GeoNotes caveats={query.data.caveats} attribution={query.data.attribution} />
          </>
        )}
      </div>
    </section>
  );
}
