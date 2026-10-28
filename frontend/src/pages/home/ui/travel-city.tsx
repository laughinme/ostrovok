import type { CSSProperties } from "react";
import "./travel-city.css";

const BUILDINGS = [
  { x: -40, width: 112, height: 154, tone: "white" },
  { x: 72, width: 110, height: 204, tone: "sky" },
  { x: 182, width: 112, height: 220, tone: "white" },
  { x: 294, width: 108, height: 176, tone: "blue" },
  { x: 402, width: 90, height: 136, tone: "sky" },
  { x: 492, width: 112, height: 168, tone: "teal" },
  { x: 604, width: 82, height: 120, tone: "white" },
  { x: 686, width: 104, height: 140, tone: "sky" },
  { x: 790, width: 106, height: 160, tone: "blue" },
  { x: 896, width: 98, height: 155, tone: "white" },
  { x: 994, width: 80, height: 126, tone: "teal" },
  { x: 1074, width: 108, height: 169, tone: "blue" },
  { x: 1182, width: 92, height: 144, tone: "white" },
  { x: 1274, width: 108, height: 155, tone: "blue" },
  { x: 1382, width: 112, height: 188, tone: "white" },
  { x: 1494, width: 116, height: 221, tone: "sky" },
];

export function TravelCity({ id }: { id: string }) {
  return (
    <svg
      className="home-sky-city"
      viewBox="0 0 1600 240"
      preserveAspectRatio="none"
      fill="none"
      focusable="false"
    >
      <defs>
        <g id={`${id}-window`}>
          <rect width="14" height="23" fill="var(--city-window)" />
          <path d="M8 0h6v23H8Z" fill="var(--city-window-light)" opacity=".7" />
          <path d="M7 0v23M0 9h14" stroke="var(--city-facade)" strokeWidth="1" opacity=".5" />
          <path d="M-2 23h18" stroke="var(--city-window)" strokeWidth="2" />
        </g>
        <linearGradient id={`${id}-facade`} x2="0" y2="1">
          <stop stopColor="white" stopOpacity=".14" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="home-city-distant" fill="currentColor">
        <path d="M0 130h28v-9h44v119H0Zm91-79h65v189H91Zm165 37h33V69h17v171h-50Zm111 56h36v-30h46v126h-82Zm192-47h53v143h-53Zm158 53h26v-13h42v103h-68Zm135-41h68v131h-68Zm184 24h39v-21h36v128h-75Zm133-43h62v150h-62Zm173 21h56v129h-56Zm163-48h35V42h22v198h-57Zm144 50h53v127h-53Z" />
      </g>
      {BUILDINGS.map(({ x, width, height, tone }, index) => {
        const columns = width > 100 ? 3 : 2;
        const rows = Math.floor((height - 25) / 34);
        const spacing = (width - 14) / (columns + 1);
        return (
          <g
            key={x}
            className={`home-city-building home-city-building--${tone}`}
            style={{ "--building-delay": `${100 + ((index * 3) % 8) * 40}ms` } as CSSProperties}
          >
            <g transform={`translate(${x} ${240 - height})`}>
              <path d={`M${width - 12} 0  ${width} 7V${height}h-12Z`} fill="var(--city-side)" />
              <path d={`M${width * 0.22} 0v-18h${width * 0.46}V0Z`} fill="var(--city-facade)" />
              {index % 3 === 0 ? (
                <>
                  <path d={`M${width - 30} 0v-24h10V0Z`} fill="var(--city-side)" />
                  <path d={`M${width - 32} -24h14`} stroke="var(--city-window)" strokeWidth="3" />
                </>
              ) : (
                <>
                  <rect
                    x={width * 0.35}
                    y="-12"
                    width="19"
                    height="12"
                    fill="var(--city-window-light)"
                  />
                  <path
                    d={`M${width * 0.35 - 2} -12h23`}
                    stroke="var(--city-facade)"
                    strokeWidth="3"
                  />
                </>
              )}
              <rect width={width - 12} height={height} fill="var(--city-facade)" />
              <rect width={width - 12} height={height} fill={`url(#${id}-facade)`} />
              <path d={`M-2 0h${width - 8}`} stroke="var(--city-window-light)" strokeWidth="4" />
              {Array.from({ length: rows * columns }, (_, window) => (
                <use
                  key={window}
                  href={`#${id}-window`}
                  x={spacing * ((window % columns) + 1) - 7}
                  y={20 + Math.floor(window / columns) * 34}
                  opacity={(window + index) % 7 === 0 ? 0.65 : 1}
                />
              ))}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
