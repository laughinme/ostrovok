import type { Hotel } from "@/entities/hotel";
import { cn } from "@/shared/lib";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function CoastMap({
  items,
  active,
  onHover,
  onSelect,
}: {
  items: { hotel: Hotel; score?: number }[];
  active?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const moved = useRef(0);

  const viewRef = useRef(view);
  viewRef.current = view;

  const clamp = useCallback((v: { x: number; y: number; k: number }) => {
    const el = ref.current;
    const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k));
    if (!el) return { ...v, k };
    const W = el.clientWidth;
    const H = el.clientHeight;
    return {
      k,
      x: Math.min(0, Math.max(W * (1 - k), v.x)),
      y: Math.min(0, Math.max(H * (1 - k), v.y)),
    };
  }, []);

  const soft = useCallback((v: { x: number; y: number; k: number }) => {
    const el = ref.current;
    const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k));
    if (!el) return { ...v, k };
    const sx = el.clientWidth * 0.12;
    const sy = el.clientHeight * 0.12;
    return {
      k,
      x: Math.min(sx, Math.max(el.clientWidth * (1 - k) - sx, v.x)),
      y: Math.min(sy, Math.max(el.clientHeight * (1 - k) - sy, v.y)),
    };
  }, []);

  const settle = useCallback(() => {
    const from = { ...viewRef.current };
    const to = clamp(from);
    if (from.x === to.x && from.y === to.y && from.k === to.k) return;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 240);
      const e = 1 - (1 - p) ** 3;
      setView({
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        k: from.k + (to.k - from.k) * e,
      });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [clamp]);

  const zoomAt = useCallback(
    (px: number, py: number, factor: number) =>
      setView((v) => {
        const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
        const kk = k / v.k;
        return clamp({ k, x: px - (px - v.x) * kk, y: py - (py - v.y) * kk });
      }),
    [clamp],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-dy * 0.0018));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const center = () => {
    const el = ref.current;
    if (el) zoomAt(el.clientWidth / 2, el.clientHeight / 2, 1.4);
  };

  return (
    <div
      ref={ref}
      className="relative h-full w-full touch-none overflow-hidden rounded-3xl bg-sand select-none"
      style={{ cursor: drag.current ? "grabbing" : "grab" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        moved.current = 0;
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        d.x = e.clientX;
        d.y = e.clientY;
        moved.current += Math.abs(dx) + Math.abs(dy);
        setView((v) => soft({ ...v, x: v.x + dx, y: v.y + dy }));
      }}
      onPointerUp={() => {
        drag.current = null;
        settle();
      }}
      onPointerCancel={() => {
        drag.current = null;
        settle();
      }}
      onDoubleClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, 1.6);
      }}
    >
      <div
        className="absolute inset-0 origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <path
            d="M0,58 C15,60 28,64 40,66 C52,68 62,74 72,84 C80,92 90,96 100,98 L100,100 L0,100 Z"
            fill="var(--sea)"
            opacity="0.85"
          />
          <path
            d="M0,58 C15,60 28,64 40,66 C52,68 62,74 72,84 C80,92 90,96 100,98"
            stroke="var(--sun)"
            strokeWidth="0.4"
            fill="none"
            strokeDasharray="1 1"
          />
          <path
            d="M55,0 L70,25 L82,8 L92,28 L100,10 L100,0 Z"
            fill="var(--muted-foreground)"
            opacity="0.15"
          />
          <path
            d="M30,40 Q50,30 70,45 T100,50"
            stroke="var(--border)"
            strokeWidth="0.6"
            fill="none"
          />
          <path
            d="M74,82 Q80,50 86,18"
            stroke="var(--muted-foreground)"
            strokeWidth="0.3"
            strokeDasharray="0.8 0.8"
            fill="none"
            opacity="0.6"
          />
        </svg>
        <span className="absolute left-4 bottom-4 font-display text-lg text-primary-foreground/80">
          Чёрное море
        </span>
        <span className="absolute right-6 top-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Красная Поляна ↗
        </span>
        <span className="absolute left-[30%] top-[38%] font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Сочи
        </span>
        <span className="absolute left-[68%] top-[90%] font-mono text-[10px] uppercase tracking-widest text-primary-foreground/70">
          Адлер
        </span>
        {items.map(({ hotel, score }) => {
          const on = active === hotel.id;
          return (
            <button
              key={hotel.id}
              onMouseEnter={() => onHover?.(hotel.id)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => {
                if (moved.current > 4) return;
                onSelect?.(hotel.id);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${hotel.pos.x}%`, top: `${hotel.pos.y}%` }}
            >
              {on && <span className="absolute inset-0 rounded-full bg-coral animate-pulse-ring" />}
              <span
                className={cn(
                  "relative flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-card px-2.5 py-1 font-mono text-xs font-semibold shadow-soft transition-all",
                  on ? "scale-110 bg-coral text-primary-foreground" : "bg-card text-foreground",
                )}
                style={{ transform: `scale(${1 / view.k})` }}
              >
                {score !== undefined ? `${score}%` : hotel.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <button
          onClick={center}
          aria-label="Приблизить"
          className="grid h-8 w-8 place-items-center rounded-xl border bg-card/90 text-foreground shadow-soft backdrop-blur transition hover:bg-card"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={() => zoomAt(0, 0, 1 / 1.4)}
          aria-label="Отдалить"
          className="grid h-8 w-8 place-items-center rounded-xl border bg-card/90 text-foreground shadow-soft backdrop-blur transition hover:bg-card"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => setView({ x: 0, y: 0, k: 1 })}
          aria-label="Вернуть вид"
          className="grid h-8 w-8 place-items-center rounded-xl border bg-card/90 text-foreground shadow-soft backdrop-blur transition hover:bg-card"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card/85 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground shadow-soft backdrop-blur">
        тяните · колесо приближает
      </span>
    </div>
  );
}
