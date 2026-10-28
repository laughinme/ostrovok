import { useEffect, useId, useRef, type CSSProperties } from "react";
import { TravelAirplane } from "@/shared/ui";
import type { HomeBackground } from "../model/types";
import { TravelCity } from "./travel-city";
import { TravelGlobe } from "./travel-globe";
import { startTravelFlight } from "./travel-flight";
import "./travel-background.css";

const ROUTE =
  "M30 620C155 580 313 485 250 397C201 327 104 350 132 416C172 509 309 415 253 285C207 178 321 89 470 96C660 106 850 48 1020 67C1146 74 1200 130 1240 170C1282 212 1295 218 1310 210C1414 161 1398 329 1300 330C1224 331 1263 457 1355 470";
const CITY_ROUTE =
  "M340 555C195 517 175 410 224 316C251 221 238 152 357 120C438 96 502 124 562 108C748 62 942 50 1054 101C1167 150 1188 256 1262 268C1364 285 1332 167 1279 218C1209 286 1293 434 1462 465";
const CITY_TABLET_ROUTE =
  "M180 555C80 500 86 435 110 360C145 252 65 186 130 108C210 50 400 116 562 108C748 62 1030 65 1170 122C1291 172 1312 197 1363 194C1450 188 1397 116 1362 146C1291 206 1396 299 1462 318";
const CLOUDS = [
  { name: "left-high", opacity: 0.22 },
  { name: "top", opacity: 0.45 },
  { name: "right-high", opacity: 0.9 },
  { name: "right-middle", opacity: 0.22 },
  { name: "left-low", opacity: 0.28 },
  { name: "left-middle", opacity: 0.16 },
  { name: "right-low", opacity: 0.16 },
];
const STARS = [
  [82, 224, 7],
  [328, 97, 5],
  [1037, 142, 7],
  [1245, 355, 5],
  [190, 555, 7],
] as const;

export function TravelBackground({ variant }: { variant: HomeBackground }) {
  const id = useId().replace(/:/g, "");
  const sky = useRef<HTMLDivElement>(null);
  const route = variant === "city" ? CITY_ROUTE : ROUTE;

  useEffect(() => {
    return sky.current ? startTravelFlight(sky.current) : undefined;
  }, []);

  return (
    <div ref={sky} className={`home-sky home-sky--${variant}`} data-flight-scene aria-hidden="true">
      <svg
        className="home-sky-route"
        data-flight-route
        viewBox="0 0 1440 780"
        preserveAspectRatio="none"
        fill="none"
        focusable="false"
      >
        <defs>
          <mask id={`${id}-route`} maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="780">
            <path
              className="home-sky-route-reveal"
              d={route}
              pathLength="1"
              stroke="white"
              strokeWidth="8"
            />
          </mask>
        </defs>
        <path
          d={route}
          mask={`url(#${id}-route)`}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="7 8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {variant === "globe" && (
          <>
            <circle className="home-sky-waypoint" cx="30" cy="620" r="5" fill="currentColor" />
            <circle className="home-sky-waypoint" cx="1310" cy="210" r="5" fill="currentColor" />
            <circle className="home-sky-waypoint" cx="1355" cy="470" r="5" fill="currentColor" />
          </>
        )}
      </svg>
      {variant === "city" && (
        <svg
          className="home-sky-tablet-route"
          data-flight-route
          viewBox="0 0 1440 780"
          preserveAspectRatio="none"
          fill="none"
          focusable="false"
        >
          <path
            d={CITY_TABLET_ROUTE}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeDasharray="7 8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      <svg
        className="home-sky-mobile-route"
        data-flight-route
        viewBox="0 0 390 100"
        preserveAspectRatio="none"
        fill="none"
        focusable="false"
      >
        <path
          d="M-12 76C47 81 62 28 101 32C151 37 175 75 230 52S301 12 337 29C361 41 382 35 407 12"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeDasharray="5 6"
        />
        <circle cx="101" cy="32" r="3" fill="currentColor" />
      </svg>
      {CLOUDS.map(({ name, opacity }, index) => (
        <svg
          key={name}
          className={`home-sky-cloud home-sky-cloud--${name}`}
          style={
            {
              "--sky-cloud-opacity": opacity,
              "--sky-delay": `${60 + index * 45}ms`,
            } as CSSProperties
          }
          viewBox="0 0 100 44"
          fill="currentColor"
          focusable="false"
        >
          <path d="M2 40C2 32 9 27 18 28C20 15 31 8 43 10C54 1 70 9 73 23C82 19 91 25 92 31C98 30 100 35 100 40Z" />
        </svg>
      ))}
      <svg
        className="home-sky-symbols"
        viewBox="0 0 1440 780"
        preserveAspectRatio="none"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        focusable="false"
      >
        {variant === "globe" &&
          STARS.map(([x, y, r], index) => (
            <path
              className="home-sky-spark"
              key={index}
              d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`}
            />
          ))}
        {variant === "globe" && (
          <>
            <circle className="home-sky-spark" cx="395" cy="65" r="4" />
            <circle className="home-sky-spark" cx="1175" cy="315" r="4" />
            <circle className="home-sky-spark" cx="82" cy="495" r="3" />
          </>
        )}
      </svg>
      {variant === "city" &&
        ["left", "right", "top"].map((position) => (
          <svg
            key={position}
            className={`home-city-ring home-city-ring--${position}`}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            focusable="false"
          >
            <circle cx="6" cy="6" r="4.5" />
          </svg>
        ))}
      <TravelAirplane className="home-sky-plane" data-flight-plane />
      {variant === "city" ? <TravelCity id={id} /> : <TravelGlobe clipId={`${id}-globe`} />}
    </div>
  );
}
