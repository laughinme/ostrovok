import { useId } from "react";
import type { WindowView } from "../model/window-view";
import { BuildingObject, MountainObject, SeaObject, TreeObject } from "./window-view-objects";

export function WindowPanorama({ scene, floor }: { scene: WindowView; floor: number }) {
  const id = useId();
  return (
    <svg
      className="window-illustration"
      viewBox="0 0 960 560"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Условный вид из окна, ${floor} этаж. ${scene.objects.join(", ") || "Подтверждённых объектов нет"}. Форма и положение объектов схематичны.`}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor="var(--view-sky-top)" />
          <stop offset="1" stopColor="var(--view-sky-low)" />
        </linearGradient>
        <linearGradient id={`${id}-water`} x2="0" y2="1">
          <stop stopColor="var(--view-water-top)" />
          <stop offset="1" stopColor="var(--view-water-low)" />
        </linearGradient>
        <linearGradient id={`${id}-ridge`} x2="0" y2="1">
          <stop stopColor="var(--view-ridge-top)" />
          <stop offset="1" stopColor="var(--view-ridge-low)" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="var(--view-sun-glow)" stopOpacity=".85" />
          <stop offset="1" stopColor="var(--view-sun-glow)" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-unknown`} width="18" height="18" patternUnits="userSpaceOnUse">
          <path
            d="M-4 4 4-4M0 18 18 0M14 22 22 14"
            stroke="var(--muted)"
            strokeWidth="1"
            opacity=".35"
          />
        </pattern>
      </defs>
      <rect width="960" height="560" fill={`url(#${id}-sky)`} />
      <g fill="var(--surface)" opacity=".75" aria-hidden="true">
        <path d="M40 92c42-13 59-7 84-9s47-15 77-8c17 4 23 10 43 11-50 8-130 9-204 6Z" />
        <path d="M628 61c38-12 58-10 79-5s48-8 69-1l38 8c-63 7-114 7-186-2Z" />
      </g>
      <rect y="270" width="960" height="290" fill="var(--view-land)" />
      {scene.mountains.map((span, index) => (
        <MountainObject key={index} span={span} fill={`url(#${id}-ridge)`} />
      ))}
      {scene.sea.map((span, index) => (
        <SeaObject key={index} span={span} fill={`url(#${id}-water)`} />
      ))}
      {scene.sun !== null && (
        <g data-window-object="sunset">
          <circle cx={scene.sun * 960} cy="244" r="90" fill={`url(#${id}-glow)`} />
          <circle cx={scene.sun * 960} cy="244" r="21" fill="var(--view-sun)" />
        </g>
      )}
      <g
        className="window-foreground"
        data-window-layer="foreground"
        style={{ transform: `translateY(${scene.foregroundOffset}px)` }}
      >
        <path
          d="M-40 466Q140 438 322 458T680 452T1000 466V760H-40Z"
          fill="var(--view-foreground)"
        />
        {scene.buildings.map((building, index) => (
          <BuildingObject key={index} building={building} index={index} />
        ))}
        {scene.trees.map((tree, index) => (
          <TreeObject key={index} {...tree} />
        ))}
      </g>
      {scene.unknown.map((span, index) => (
        <g key={index} data-window-object="unknown">
          <rect
            x={span.from * 960}
            width={(span.to - span.from) * 960}
            height="560"
            fill="var(--raised)"
            opacity=".85"
          />
          <rect
            x={span.from * 960}
            width={(span.to - span.from) * 960}
            height="560"
            fill={`url(#${id}-unknown)`}
          />
        </g>
      ))}
    </svg>
  );
}
