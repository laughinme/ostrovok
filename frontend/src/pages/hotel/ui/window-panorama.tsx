import { useId } from "react";
import { relativeAzimuth, type WindowData } from "../model/geo";

export function WindowPanorama({ data }: { data: WindowData }) {
  const id = useId();
  const rays = data.horizon
    .map((ray) => ({ ...ray, offset: relativeAzimuth(ray.azimuthDeg, data.facade) }))
    .sort((a, b) => a.offset - b.offset);
  const from = rays[0]?.offset ?? -70,
    to = rays.at(-1)?.offset ?? 70;
  const x = (angle: number) => ((angle - from) / Math.max(1, to - from)) * 1200;
  const y = (angle: number) => Math.max(0, Math.min(320, 176 - angle * 11.3));
  let connected = false;
  const sunPath = data.sunPath
    .map((sun) => {
      const offset = relativeAzimuth(sun.azimuthDeg, data.facade);
      if (offset < from || offset > to || sun.elevationDeg < -2) {
        connected = false;
        return "";
      }
      const command = connected ? "L" : "M";
      connected = true;
      return `${command}${x(offset)},${y(sun.elevationDeg)}`;
    })
    .join(" ");
  return (
    <svg
      className="pano"
      viewBox="0 0 1200 320"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Расчётный горизонт: ${data.facade}, этаж ${data.floor}, ${data.date}`}
    >
      <defs>
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 12 L12 0" stroke="var(--pano-tick)" opacity=".25" />
        </pattern>
      </defs>
      <rect width="1200" height="320" fill="var(--pano-sky)" />
      <path
        d={sunPath}
        fill="none"
        stroke="var(--pano-sun)"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
      {(["sunrise", "sunset"] as const).map((event) => {
        const sun = data[event],
          offset = relativeAzimuth(sun.azimuthDeg, data.facade);
        return offset >= from && offset <= to ? (
          <circle
            key={event}
            cx={x(offset)}
            cy={y(sun.elevationDeg)}
            r="10"
            fill="var(--pano-sun)"
          />
        ) : null;
      })}
      {rays.map((ray, index) => {
        const left = index ? (rays[index - 1]!.offset + ray.offset) / 2 : from;
        const right = index < rays.length - 1 ? (ray.offset + rays[index + 1]!.offset) / 2 : to;
        const width = Math.max(0, x(right) - x(left)) + 0.5;
        const unknown = ray.kind === "unknown" || ray.angleDeg == null;
        return (
          <g key={ray.azimuthDeg}>
            <rect
              x={x(left)}
              y={unknown ? 0 : y(ray.angleDeg!)}
              width={width}
              height={unknown ? 320 : 320 - y(ray.angleDeg!)}
              fill={
                unknown
                  ? `url(#${id})`
                  : ray.kind === "building"
                    ? "var(--pano-build)"
                    : "var(--pano-land)"
              }
            />
            {ray.seaLowDeg != null && ray.seaHighDeg != null && (
              <rect
                x={x(left)}
                y={y(ray.seaHighDeg)}
                width={width}
                height={Math.max(0, y(ray.seaLowDeg) - y(ray.seaHighDeg))}
                fill="var(--pano-sea)"
              />
            )}
          </g>
        );
      })}
      {rays
        .filter((_, index) => index % 20 === 0)
        .map((ray) => (
          <g key={ray.azimuthDeg}>
            <path d={`M${x(ray.offset)} 320 v-12`} stroke="var(--pano-tick)" />
            <text
              x={Math.max(24, Math.min(1176, x(ray.offset)))}
              y="296"
              textAnchor="middle"
              fontSize="13"
              fill="var(--pano-tick)"
            >
              {Math.round(ray.azimuthDeg)}°
            </text>
          </g>
        ))}
    </svg>
  );
}
