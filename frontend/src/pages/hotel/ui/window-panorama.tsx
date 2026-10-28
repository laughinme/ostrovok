import { useId } from "react";
import { relativeAzimuth, type WindowData } from "../model/geo";
import { LANDSCAPE, landscapeY, windowLandscape } from "../model/window-landscape";

export function WindowPanorama({ data }: { data: WindowData }) {
  const id = useId();
  const scene = windowLandscape(data);
  const buildingPaths = scene.obstacles.filter((item) => item.kind === "building");
  const sunsetOffset = relativeAzimuth(data.sunset.azimuthDeg, data.facade);
  const sunsetInView = sunsetOffset >= scene.from && sunsetOffset <= scene.to;
  const sky = sunsetInView ? ["#b8d8e9", "#f9e2be"] : ["#c5dfe9", "#edf3ee"];
  let connected = false;
  const sunPath = data.sunPath
    .map((sun) => {
      const offset = relativeAzimuth(sun.azimuthDeg, data.facade);
      if (offset < scene.from || offset > scene.to || sun.elevationDeg < -2) {
        connected = false;
        return "";
      }
      const command = connected ? "L" : "M";
      connected = true;
      return `${command}${scene.x(offset)},${landscapeY(sun.elevationDeg)}`;
    })
    .join(" ");
  return (
    <svg
      className="window-calculated-landscape"
      viewBox={`0 0 ${LANDSCAPE.width} ${LANDSCAPE.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Иллюстрация по расчётному горизонту: ${data.facade}, этаж ${data.floor}, ${data.date}. Форма объектов условная.`}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1">
          <stop stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <linearGradient id={`${id}-water`} x2="0" y2="1">
          <stop stopColor="#82b9c9" />
          <stop offset="1" stopColor="#397e9c" />
        </linearGradient>
        <linearGradient id={`${id}-land`} x2="0" y2="1">
          <stop stopColor="#a8bfac" />
          <stop offset="1" stopColor="#638b79" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#fff0cc" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff0cc" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-unknown`} width="18" height="18" patternUnits="userSpaceOnUse">
          <path
            d="M-4 4 4-4M0 18 18 0M14 22 22 14"
            stroke="#74889a"
            strokeWidth="1"
            opacity=".35"
          />
        </pattern>
        <clipPath id={`${id}-buildings`}>
          {buildingPaths.map((item, index) => (
            <path key={index} d={item.path} />
          ))}
        </clipPath>
        <mask id={`${id}-foreground`}>
          <rect width="960" height="560" fill="white" />
          {scene.sea.map((path, index) => (
            <path key={index} d={path} fill="black" />
          ))}
        </mask>
        <clipPath id={`${id}-sea`}>
          {scene.sea.map((path, index) => (
            <path key={index} d={path} />
          ))}
        </clipPath>
      </defs>
      <rect width="960" height="560" fill={`url(#${id}-sky)`} />
      <g fill="white" opacity=".4">
        <path d="M40 92c42-13 59-7 84-9s47-15 77-8c17 4 23 10 43 11-50 8-130 9-204 6Z" />
        <path d="M628 61c38-12 58-10 79-5s48-8 69-1l38 8c-63 7-114 7-186-2Z" />
      </g>
      <path
        d={sunPath}
        fill="none"
        stroke="#e9b968"
        strokeWidth="2"
        strokeDasharray="5 8"
        opacity=".65"
      />
      {(["sunrise", "sunset"] as const).map((event) => {
        const sun = data[event],
          offset = relativeAzimuth(sun.azimuthDeg, data.facade);
        if (offset < scene.from || offset > scene.to) return null;
        return (
          <g key={event}>
            <circle
              cx={scene.x(offset)}
              cy={landscapeY(sun.elevationDeg)}
              r="82"
              fill={`url(#${id}-glow)`}
            />
            <circle cx={scene.x(offset)} cy={landscapeY(sun.elevationDeg)} r="20" fill="#fff1c8" />
          </g>
        );
      })}
      <rect y="270" width="960" height="290" fill="#b5c7b5" />
      {scene.obstacles
        .filter((item) => item.kind === "terrain")
        .map((item, index) => (
          <path
            key={index}
            d={item.path}
            fill={`url(#${id}-land)`}
            stroke="#8eaaa0"
            strokeWidth="2"
          />
        ))}
      <g clipPath={`url(#${id}-buildings)`}>
        {scene.buildings.map(({ left, roof }, index) => (
          <g key={left}>
            <rect
              x={left}
              y="0"
              width="120"
              height="560"
              fill={index % 2 ? "#e4e4d7" : "#edf0e7"}
            />
            <rect x={left + 106} y="0" width="14" height="560" fill="#b3c4bf" />
            <path d={`M${left + 2} ${roof + 4}h102`} stroke="#ccd8cf" strokeWidth="5" />
            {Array.from({ length: 6 }, (_, row) =>
              Array.from({ length: 3 }, (_, column) => (
                <rect
                  key={`${row}-${column}`}
                  x={left + 17 + column * 30}
                  y={roof + 20 + row * 34}
                  width="10"
                  height="13"
                  rx="1"
                  fill="#7f9ca6"
                  opacity=".85"
                />
              )),
            )}
            <path d={`M${left + 1} 0V560`} stroke="#f5f6eb" strokeWidth="2" />
          </g>
        ))}
      </g>
      <g clipPath={`url(#${id}-sea)`}>
        <rect width="960" height="560" fill={`url(#${id}-water)`} />
        {[283, 305, 340, 380, 425].map((y, index) => (
          <path
            key={y}
            d={`M${index % 2 ? 20 : 80} ${y}h100m70 0h180m80 0h160m60 0h200`}
            stroke="#e7f3ef"
            strokeWidth="2"
            opacity=".35"
          />
        ))}
      </g>
      <g mask={`url(#${id}-foreground)`}>
        <path d="M0 388c145-28 248 13 380 6s223-35 358-12 153 9 222 0v178H0Z" fill="#7c9f89" />
        <path d="M0 510Q255 390 490 420T960 500" fill="none" stroke="#d9d8bf" strokeWidth="9" />
        <path d="M0 551q100-22 205 2t214-1 202-7 180 0 159-15v70H0Z" fill="#577d6b" />
        {[35, 84, 788, 845, 912].map((x, index) => (
          <g key={x} transform={`translate(${x} ${496 + (index % 2) * 10})`}>
            <path d="M0 47V8" stroke="#587567" strokeWidth="3" />
            <ellipse
              cy="10"
              rx={index % 2 ? 15 : 20}
              ry="26"
              fill={index % 2 ? "#6a9179" : "#7a9d83"}
            />
            <path d="M0 31V-9" stroke="#668874" strokeWidth="1.5" />
          </g>
        ))}
      </g>
      {scene.unknown.map(({ left, width }) => (
        <g key={left}>
          <rect x={left} width={width} height="560" fill="#e9eef2" opacity=".82" />
          <rect x={left} width={width} height="560" fill={`url(#${id}-unknown)`} />
        </g>
      ))}
    </svg>
  );
}
