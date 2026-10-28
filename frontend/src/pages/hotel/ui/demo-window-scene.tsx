import { useId } from "react";
import { readPanoramaLayout } from "@/shared/lib";

type DemoFacade = "NE" | "SE" | "SW" | "NW";
const names: Record<DemoFacade, string> = {
  NE: "Северо-восток: горы, зелёные предгорья и соседние дома",
  SE: "Юго-восток: предгорья слева, море справа и соседние дома",
  SW: "Юго-запад: море и закат между соседними зданиями",
  NW: "Северо-запад: город, зелень и небольшой просвет к морю слева",
};

export function DemoWindowScene({
  facade,
  floor,
  sunVisible,
}: {
  facade: DemoFacade;
  floor: number;
  sunVisible: boolean;
}) {
  const id = useId();
  const scene = readPanoramaLayout(facade, floor);
  const mountains = facade === "NE" || facade === "SE";
  const sunset = facade === "SW";
  const horizon = 270;
  const seaFrom = (scene.sea?.from ?? 0) * 960;
  const seaTo = (scene.sea?.to ?? 0) * 960;
  const coastAcrossView = facade === "SW" || facade === "NW";
  const waterFrom = coastAcrossView ? 0 : seaFrom;
  const waterWidth = coastAcrossView ? 960 : seaTo - seaFrom;
  const sunX = (scene.sun ?? 0.5) * 960;
  const ground =
    horizon - Math.max(...scene.buildings.map((building) => building.baseElevation)) * 6.4 - 12;
  return (
    <svg
      className="demo-window-landscape"
      viewBox="0 0 960 560"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Иллюстрация, ${floor} этаж. ${names[facade]}`}
    >
      <defs>
        <linearGradient
          id={`${id}-sky`}
          x1="0"
          y1="0"
          x2="0"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={sunset ? "#b8d8e9" : "#c5dfe9"} />
          <stop offset=".5" stopColor={sunset ? "#f9e2be" : "#edf3ee"} />
          <stop offset="1" stopColor="#f4f3e6" />
        </linearGradient>
        <linearGradient
          id={`${id}-water`}
          x1="0"
          y1="270"
          x2="0"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={sunset ? "#82b9c9" : "#81b6c5"} />
          <stop offset="1" stopColor="#397e9c" />
        </linearGradient>
        <linearGradient
          id={`${id}-ridge`}
          x1="0"
          y1="100"
          x2="0"
          y2="340"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#89a9b9" />
          <stop offset="1" stopColor="#c2d2d0" />
        </linearGradient>
        <linearGradient
          id={`${id}-land`}
          x1="0"
          y1="300"
          x2="0"
          y2="560"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9db7a3" />
          <stop offset="1" stopColor="#638b79" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#fff0cc" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff0cc" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-ripples`} width="180" height="38" patternUnits="userSpaceOnUse">
          <path
            d="M8 12h42m65 18h25m13-18h18"
            stroke="#e7f3ef"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity=".3"
          />
        </pattern>
        <clipPath id={`${id}-sea-clip`}>
          <rect x={waterFrom} y={horizon} width={waterWidth} height="290" />
        </clipPath>
      </defs>
      <rect width="960" height="560" fill={`url(#${id}-sky)`} />
      <g fill="#fff" opacity=".38">
        <path d="M40 92c42-13 59-7 84-9s47-15 77-8c17 4 23 10 43 11-50 8-130 9-204 6Z" />
        <path d="M628 61c38-12 58-10 79-5s48-8 69-1l38 8c-63 7-114 7-186-2Z" />
      </g>
      <path d="M0 278Q115 256 226 280T470 276T720 282T960 270V560H0Z" fill="#b5c7b5" />
      {scene.sea && (
        <g clipPath={`url(#${id}-sea-clip)`}>
          <rect
            x={waterFrom}
            y={horizon}
            width={waterWidth}
            height="290"
            fill={`url(#${id}-water)`}
          />
          <path d={`M${seaFrom} ${horizon}H${seaTo}`} stroke="#e6efe4" strokeWidth="2" />
          <rect
            x={waterFrom}
            y={horizon + 10}
            width={waterWidth}
            height="280"
            fill={`url(#${id}-ripples)`}
          />
          {sunset && sunVisible && (
            <g stroke="#ffe5ad" strokeLinecap="round">
              {Array.from({ length: 16 }, (_, index) => {
                const y = 277 + index * 15;
                const spread = 5 + index * 3;
                return (
                  <path
                    key={y}
                    d={`M${sunX - spread} ${y}h${spread * 2}`}
                    strokeWidth={2 + index * 0.15}
                    opacity={0.6 - index * 0.025}
                  />
                );
              })}
            </g>
          )}
        </g>
      )}
      {sunset && sunVisible && (
        <g>
          <circle cx={sunX} cy="234" r="100" fill={`url(#${id}-glow)`} />
          <circle cx={sunX} cy="234" r="22" fill="#fff1c8" />
        </g>
      )}
      {mountains && (
        <g transform={facade === "SE" ? "translate(-120 45) scale(.86)" : undefined}>
          <path
            d="M-70 282 0 252 43 222 77 235 129 188 161 201 213 151 242 164 297 112 326 134 361 105 391 136 429 152 474 125 507 142 555 184 594 169 640 200 688 187 737 223 789 215 848 253 900 270 1030 305V430H-70Z"
            fill={`url(#${id}-ridge)`}
          />
          <path
            d="m213 151 29 13 55-52 29 22 35-29-22 43-19-6-20 12-13-18-34 40Z"
            fill="#e8efeb"
            opacity=".85"
          />
          <path d="m474 125 33 17 48 42-35-12-20-20-15 4-16-9-26 18Z" fill="#e8efeb" opacity=".7" />
          <path
            d="M297 112 274 199 215 250 307 204 361 105 337 207 413 274 504 252 474 125 536 226 628 279 720 318H40L129 188 132 263 205 278Z"
            fill="#7498a7"
            opacity=".28"
          />
          <path
            d="M-90 338C42 285 113 320 212 276S367 239 461 281s123-26 227 0 142 44 272 35V560H-90Z"
            fill="#90aca4"
          />
          <path
            d="M-70 377c126-34 169-1 275-40s160-22 256 6 185-26 260-4 157 39 264 30v191H-70Z"
            fill="#a5b9a3"
          />
        </g>
      )}
      {facade === "SW" && (
        <>
          <path
            d={`M0 230Q48 244 ${seaFrom} 270C${seaFrom + 14} 340 141 456 200 560H0Z`}
            fill="#9ab9b0"
          />
          <path
            d={`M${seaTo} 270Q863 244 960 234V560H721C774 478 809 371 ${seaTo} 270Z`}
            fill="#b4c9b4"
          />
          <path
            d={`M${seaTo + 12} 275Q${seaTo + 34} 375 804 456T765 560`}
            fill="none"
            stroke="#e9dfc5"
            strokeWidth="9"
          />
        </>
      )}
      {facade === "SE" && (
        <path d="M0 343c128-29 238-7 351 21s187 14 253 55l87 141H0Z" fill={`url(#${id}-land)`} />
      )}
      {facade === "NW" && (
        <path
          d={`M${seaTo} 270Q350 235 500 260T960 250V560H0V420Q120 360 ${seaTo} 270Z`}
          fill={`url(#${id}-land)`}
        />
      )}
      {facade === "NE" && (
        <path
          d="M0 423c141-54 257-25 383 13s253-69 384-26 164 15 193 21v129H0Z"
          fill={`url(#${id}-land)`}
        />
      )}
      <path
        d={`M0 ${ground}Q200 ${ground - 10} 470 ${ground + 14}T960 ${ground + 5}V560H0Z`}
        fill={`url(#${id}-land)`}
      />
      <path
        d={`M0 540Q235 ${ground + 60} 479 ${ground + 80}T960 490`}
        fill="none"
        stroke="#d9d8bf"
        strokeWidth="14"
      />
      <path
        d={`M0 548Q235 ${ground + 68} 479 ${ground + 88}T960 498`}
        fill="none"
        stroke="#edf0dd"
        strokeWidth="2"
      />
      <g>
        {scene.buildings.map((building, index) => {
          const left = building.from * 960;
          const width = (building.to - building.from) * 960;
          const roof = horizon - building.elevation * 6.4;
          const base = horizon - building.baseElevation * 6.4;
          const height = base - roof;
          const side = Math.min(14, width * 0.12);
          const columns = Math.max(2, Math.floor(width / 19));
          const rowHeight = (height - 12) / building.floors;
          const columnWidth = (width - 12) / columns;
          return (
            <g key={index}>
              <ellipse
                cx={left + width * 0.6}
                cy={base + 4}
                rx={width * 0.6}
                ry="7"
                fill="#496f63"
                opacity=".12"
              />
              <path
                d={`M${left + width} ${roof}l${side} 7v${height - 4}l-${side} -3Z`}
                fill="#b3c4bf"
              />
              <rect
                x={left}
                y={roof}
                width={width}
                height={height}
                fill={index % 2 ? "#e4e4d7" : "#edf0e7"}
              />
              {Array.from({ length: building.floors }, (_, row) =>
                Array.from({ length: columns }, (_, column) => (
                  <rect
                    key={`${row}-${column}`}
                    x={left + 9 + column * columnWidth}
                    y={roof + 9 + row * rowHeight}
                    width={Math.min(8, columnWidth * 0.45)}
                    height={Math.max(2, rowHeight * 0.48)}
                    rx=".7"
                    fill="#7f9ca6"
                  />
                )),
              )}
              <path d={`M${left - 2} ${roof}h${width + 4}v4h-${width + 4}Z`} fill="#ccd8cf" />
              <path
                d={`M${left} ${roof - 2}l${side} -6h${Math.max(0, width - side)}v6Z`}
                fill="#e1e8de"
              />
              {width > 95 && (
                <path
                  d={`M${left + width * 0.55} ${roof - 8}v-6h${width * 0.22}v6`}
                  fill="#bacbc3"
                />
              )}
            </g>
          );
        })}
      </g>
      <g>
        <path d="M-20 507q75-25 158 7t151 13 174 8 165-5 167-9 185-6v120H-20Z" fill="#577d6b" />
        {[25, 67, 120, 755, 806, 863, 920].map((x, index) => (
          <g key={x} transform={`translate(${x} ${474 + (index % 3) * 12})`}>
            <path d="M0 56V12" stroke="#587567" strokeWidth="4" />
            <ellipse
              cx="0"
              cy="13"
              rx={index % 2 ? 16 : 22}
              ry="30"
              fill={index % 2 ? "#6a9179" : "#7a9d83"}
            />
            <path d="M0 36V0" stroke="#668874" strokeWidth="1.5" />
          </g>
        ))}
      </g>
    </svg>
  );
}
