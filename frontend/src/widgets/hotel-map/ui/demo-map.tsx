import { useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { CoastMapProps } from "../model/types";

export function DemoMap({ items, active, onHover, onSelect }: CoastMapProps) {
  const [zoom, setZoom] = useState(1);
  const locations = items.map(({ hotel }) => hotel.lngLat);
  const nearby = items.length === 1 ? (items[0]!.hotel.backend?.nearby ?? []) : [];
  const points = [...locations, ...nearby.map((place) => place.location)];
  const west = Math.min(...points.map(([lon]) => lon));
  const east = Math.max(...points.map(([lon]) => lon));
  const south = Math.min(...points.map(([, lat]) => lat));
  const north = Math.max(...points.map(([, lat]) => lat));
  const project = ([lon, lat]: [number, number]) => ({
    x: 320 + ((lon - (west + east) / 2) / Math.max(east - west, 0.006)) * 440 * zoom,
    y: 180 - ((lat - (south + north) / 2) / Math.max(north - south, 0.004)) * 220 * zoom,
  });
  const controls = [
    { label: "Приблизить", Icon: Plus, action: () => setZoom((value) => Math.min(3, value + 0.5)) },
    {
      label: "Отдалить",
      Icon: Minus,
      action: () => setZoom((value) => Math.max(0.5, value - 0.5)),
    },
    { label: "Вернуть вид", Icon: Maximize2, action: () => setZoom(1) },
  ];
  return (
    <>
      <svg
        className="h-full w-full"
        viewBox="0 0 640 360"
        role="img"
        aria-label="Демонстрационная схема расположения отеля и мест рядом"
      >
        <rect width="640" height="360" fill="var(--map-land, #edf2e7)" />
        <path d="M0 240 Q160 200 310 280 T640 300 V360 H0Z" fill="var(--map-sea, #cfdcff)" />
        <path
          d="M0 80 H640 M0 170 H640 M110 0 V260 M300 0 V290 M490 0 V300"
          fill="none"
          stroke="white"
          strokeWidth="14"
        />
        {nearby.map((place) => {
          const { x, y } = project(place.location);
          return (
            <g key={`${place.kind}-${place.name}`}>
              <title>
                {place.name} · {place.distanceText}
              </title>
              <circle cx={x} cy={y} r="5" fill="var(--primary, #1b4de4)" />
              <text x={x} y={y - 12} textAnchor="middle" fontSize="11" fill="var(--ink, #17233d)">
                {place.name.length > 22 ? `${place.name.slice(0, 20)}…` : place.name}
              </text>
            </g>
          );
        })}
      </svg>
      {items.map(({ hotel, score }) => {
        const { x, y } = project(hotel.lngLat);
        return (
          <button
            key={hotel.id}
            type="button"
            className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border-2 border-white px-3 py-2 text-sm shadow-soft ${active === hotel.id ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
            style={{ left: `${x / 6.4}%`, top: `${y / 3.6}%` }}
            onClick={() => onSelect?.(hotel.id)}
            onMouseEnter={() => onHover?.(hotel.id)}
            onMouseLeave={() => onHover?.(null)}
            aria-label={`Открыть отель «${hotel.name}»`}
          >
            {hotel.name}
            {score == null ? "" : ` · ${score}%`}
          </button>
        );
      })}
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        {controls.map(({ label, Icon, action }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={action}
            className="grid h-11 w-11 place-items-center rounded-xl border bg-card text-foreground shadow-soft"
          >
            <Icon size={18} />
          </button>
        ))}
      </div>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-3 py-1 text-[10px] text-muted-foreground">
        Демо · условная схема, не для навигации
      </span>
    </>
  );
}
