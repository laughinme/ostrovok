import { useId, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { FACADE_ANGLE, FACADE_LABEL, type GeoFacade } from "../model/geo";
import { NOISE_FACADE_NAMES } from "../model/noise-presentation";
import { nearestFacade, pointerBearing, unwrapBearing } from "../model/noise-compass";
import "./noise-compass.css";

interface CompassSide {
  facade: GeoFacade;
  text: string;
  color: string;
  known: boolean;
}
const directions = Object.keys(FACADE_ANGLE) as GeoFacade[];

export function NoiseCompass({
  sides,
  selected,
  onSelect,
  showValues = true,
  label = "Сторона здания на компасе",
}: {
  sides: CompassSide[];
  selected: GeoFacade | undefined;
  onSelect(facade: GeoFacade): void;
  showValues?: boolean;
  label?: string;
}) {
  const captionId = useId();
  const [pose, setPose] = useState({ selected, angle: FACADE_ANGLE[selected ?? "N"] });
  const [dragAngle, setDragAngle] = useState<number | null>(null);
  const drag = useRef<{
    pointer: number;
    last: number;
    angle: number;
    facade: GeoFacade | undefined;
  } | null>(null);
  const buttons = useRef(new Map<GeoFacade, HTMLButtonElement>());
  const available = sides
    .map((side) => side.facade)
    .sort((a, b) => FACADE_ANGLE[a] - FACADE_ANGLE[b]);
  if (pose.selected !== selected) {
    setPose({ selected, angle: unwrapBearing(pose.angle, FACADE_ANGLE[selected ?? "N"]) });
  }
  const angle = dragAngle ?? pose.angle;
  const bearing = ((Math.round(angle) % 360) + 360) % 360;
  const eventBearing = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return pointerBearing(
      event.clientX - box.x - box.width / 2,
      event.clientY - box.y - box.height / 2,
    );
  };
  const finish = () => {
    const current = drag.current;
    if (!current) return;
    const facade = nearestFacade(current.angle, available);
    if (facade) {
      setPose({ selected: facade, angle: unwrapBearing(current.angle, FACADE_ANGLE[facade]) });
      onSelect(facade);
    }
    drag.current = null;
    setDragAngle(null);
  };
  const choose = (facade: GeoFacade, focus = false) => {
    onSelect(facade);
    if (focus) buttons.current.get(facade)?.focus();
  };
  return (
    <div className={`noise-compass-control${showValues ? "" : " is-direction-only"}`}>
      <div
        className={`noise-compass${dragAngle === null ? "" : " is-dragging"}${sides.length ? "" : " is-unavailable"}`}
        role="radiogroup"
        aria-label={label}
        aria-describedby={captionId}
        onPointerDown={(event) => {
          if (
            !sides.length ||
            event.button !== 0 ||
            (event.target instanceof Element && event.target.closest("button"))
          )
            return;
          const box = event.currentTarget.getBoundingClientRect();
          if (
            Math.hypot(
              event.clientX - box.x - box.width / 2,
              event.clientY - box.y - box.height / 2,
            ) <
            box.width * 0.06
          )
            return;
          event.preventDefault();
          drag.current = {
            pointer: event.pointerId,
            last: eventBearing(event),
            angle: pose.angle,
            facade: selected,
          };
          setDragAngle(pose.angle);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current || current.pointer !== event.pointerId) return;
          const next = eventBearing(event);
          current.angle += unwrapBearing(current.last, next) - current.last;
          current.last = next;
          setDragAngle(current.angle);
          const facade = nearestFacade(current.angle, available);
          if (facade && facade !== current.facade) {
            current.facade = facade;
            onSelect(facade);
          }
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
        onKeyDown={(event) => {
          if (!available.length) return;
          const offset =
            event.key === "ArrowRight" || event.key === "ArrowDown"
              ? 1
              : event.key === "ArrowLeft" || event.key === "ArrowUp"
                ? -1
                : 0;
          const index = Math.max(0, available.indexOf(selected ?? available[0]!));
          const facade =
            event.key === "Home"
              ? available[0]
              : event.key === "End"
                ? available.at(-1)
                : offset
                  ? available[(index + offset + available.length) % available.length]
                  : undefined;
          if (facade) {
            event.preventDefault();
            choose(facade, true);
          }
        }}
      >
        <svg className="noise-compass-dial" viewBox="0 0 300 300" aria-hidden="true">
          <circle cx="150" cy="150" r="112" className="noise-compass-rim" />
          <circle cx="150" cy="150" r="88" className="noise-compass-inner" />
          {Array.from({ length: 72 }, (_, index) => {
            const radians = (index * Math.PI) / 36;
            const major = index % 9 === 0;
            const radius = major ? 100 : index % 3 === 0 ? 104 : 107;
            return (
              <line
                key={index}
                x1={150 + Math.sin(radians) * radius}
                y1={150 - Math.cos(radians) * radius}
                x2={150 + Math.sin(radians) * 112}
                y2={150 - Math.cos(radians) * 112}
                className={major ? "noise-compass-tick is-major" : "noise-compass-tick"}
              />
            );
          })}
          <path d="M150 78V222M78 150H222" className="noise-compass-crosshair" />
          <g className="noise-compass-needle" style={{ transform: `rotate(${angle}deg)` }}>
            <path d="m150 67-13 83 13-10 13 10Z" className="noise-compass-needle-head" />
            <path d="m150 233-13-83 13 10 13-10Z" className="noise-compass-needle-tail" />
          </g>
          <circle cx="150" cy="150" r="23" className="noise-compass-hub" />
          <circle cx="150" cy="140" r="2" className="noise-compass-hub-dot" />
          <text x="150" y="157" textAnchor="middle" className="noise-compass-bearing">
            {selected ? `${bearing}°` : "—"}
          </text>
        </svg>
        {directions.map((facade) => {
          const side = sides.find((side) => side.facade === facade);
          const radians = (FACADE_ANGLE[facade] * Math.PI) / 180;
          const position = {
            left: `${50 + Math.sin(radians) * 42}%`,
            top: `${50 - Math.cos(radians) * 42}%`,
            "--compass-value-color": side?.known ? side.color : "var(--muted)",
          } as CSSProperties;
          return side ? (
            <button
              type="button"
              role="radio"
              key={facade}
              ref={(element) => {
                if (element) buttons.current.set(facade, element);
                else buttons.current.delete(facade);
              }}
              className="noise-compass-direction"
              style={position}
              aria-checked={selected === facade}
              tabIndex={selected === facade || (!selected && facade === available[0]) ? 0 : -1}
              aria-label={
                showValues
                  ? `${NOISE_FACADE_NAMES[facade]}: ${side.text}`
                  : NOISE_FACADE_NAMES[facade]
              }
              onClick={() => choose(facade)}
            >
              <b>{FACADE_LABEL[facade]}</b>
              {showValues && (
                <span>
                  <i />
                  {side.known ? side.text : "—"}
                </span>
              )}
            </button>
          ) : (
            <span
              key={facade}
              className="noise-compass-cardinal"
              style={position}
              aria-hidden="true"
            >
              {FACADE_LABEL[facade]}
            </span>
          );
        })}
      </div>
      <p className="noise-compass-caption" id={captionId}>
        {sides.length
          ? "Поверните стрелку или нажмите на сторону"
          : "Стороны здания пока не размечены"}
      </p>
    </div>
  );
}
