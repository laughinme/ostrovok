import { cn } from "@/shared/lib";
import { Maximize2, Minus, Plus } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CoastMapProps } from "../model/types";

maplibregl.setWorkerUrl(workerUrl);

const CENTER: [number, number] = [39.75, 43.58];
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

export default function MapCanvas({ items, active, onHover, onSelect }: CoastMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [failed, setFailed] = useState(false);
  const west = items.length ? Math.min(...items.map(({ hotel }) => hotel.lngLat[0])) : null;
  const east = items.length ? Math.max(...items.map(({ hotel }) => hotel.lngLat[0])) : null;
  const south = items.length ? Math.min(...items.map(({ hotel }) => hotel.lngLat[1])) : null;
  const north = items.length ? Math.max(...items.map(({ hotel }) => hotel.lngLat[1])) : null;

  useEffect(() => {
    if (!container.current) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: STYLE,
        center: CENTER,
        zoom: 10,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    instance.touchZoomRotate.disableRotation();
    instance.on("load", () => setFailed(false));
    instance.on("error", () => {
      if (!instance.isStyleLoaded()) setFailed(true);
    });
    setMap(instance);
    return () => {
      instance.remove();
    };
  }, []);

  const fit = useCallback(() => {
    if (!map) return;
    if (west == null || east == null || south == null || north == null) {
      map.jumpTo({ center: CENTER, zoom: 10 });
    } else if (west === east && south === north) {
      map.jumpTo({ center: [west, south], zoom: 13 });
    } else {
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: { top: 70, bottom: 60, left: 50, right: 50 }, duration: 0, maxZoom: 13 },
      );
    }
  }, [map, west, east, south, north]);

  useEffect(() => {
    if (!map || !container.current) return;
    const resize = () => {
      map.resize();
      fit();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container.current);
    resize();
    return () => observer.disconnect();
  }, [map, fit]);

  return (
    <>
      <div ref={container} className="h-full w-full" />
      {map &&
        items.map((item) => (
          <HotelMapPin
            key={item.hotel.id}
            map={map}
            item={item}
            active={active === item.hotel.id}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      {failed && (
        <div
          role="status"
          className="pointer-events-none absolute inset-0 grid place-items-center bg-sand/90 p-6 text-center text-sm text-muted-foreground"
        >
          Не удалось загрузить карту. Проверьте подключение к интернету.
        </div>
      )}
      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => map?.zoomIn()}
          aria-label="Приблизить"
          className="grid h-8 w-8 place-items-center rounded-xl border bg-card/90 text-foreground shadow-soft backdrop-blur transition hover:bg-card"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => map?.zoomOut()}
          aria-label="Отдалить"
          className="grid h-8 w-8 place-items-center rounded-xl border bg-card/90 text-foreground shadow-soft backdrop-blur transition hover:bg-card"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={fit}
          aria-label="Вернуть вид"
          className="grid h-8 w-8 place-items-center rounded-xl border bg-card/90 text-foreground shadow-soft backdrop-blur transition hover:bg-card"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card/85 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground shadow-soft backdrop-blur">
        тяните · колесо приближает
      </span>
    </>
  );
}

function HotelMapPin({
  map,
  item: { hotel, score },
  active,
  onHover,
  onSelect,
}: {
  map: maplibregl.Map;
  item: CoastMapProps["items"][number];
  active: boolean;
  onHover: CoastMapProps["onHover"];
  onSelect: CoastMapProps["onSelect"];
}) {
  const [element] = useState(() => document.createElement("div"));
  const pointer = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [lng, lat] = hotel.lngLat;

  useEffect(() => {
    const marker = new maplibregl.Marker({ element, anchor: "center" })
      .setLngLat([lng, lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [element, map, lng, lat]);

  useEffect(() => {
    element.style.zIndex = active ? "3" : "1";
  }, [element, active]);

  return createPortal(
    <button
      type="button"
      aria-label={`Открыть отель «${hotel.name}»`}
      onMouseEnter={() => onHover?.(hotel.id)}
      onMouseLeave={() => onHover?.(null)}
      onPointerDown={(event) => {
        pointer.current = { x: event.clientX, y: event.clientY, moved: false };
      }}
      onPointerMove={(event) => {
        const start = pointer.current;
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) {
          start.moved = true;
        }
      }}
      onClick={(event) => {
        if (event.detail > 0 && pointer.current?.moved) return;
        onSelect?.(hotel.id);
      }}
      className="relative block"
    >
      {active && <span className="absolute inset-0 rounded-full bg-coral animate-pulse-ring" />}
      <span
        className={cn(
          "relative flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-card px-2.5 py-1 font-mono text-xs font-semibold shadow-soft transition-all",
          active ? "scale-110 bg-coral text-primary-foreground" : "bg-card text-foreground",
        )}
      >
        {score !== undefined ? `${score}%` : hotel.name}
      </span>
    </button>,
    element,
  );
}
