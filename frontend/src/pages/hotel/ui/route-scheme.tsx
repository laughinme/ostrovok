import { routePoints, type RouteData } from "../model/geo";

export function RouteScheme({ route, demo = false }: { route: RouteData; demo?: boolean }) {
  const points = routePoints(route.geometry.coordinates);
  if (!points.length) return <p className="geo-status">Нет данных линии маршрута</p>;
  return (
    <svg
      className="geo-route-scheme"
      viewBox="0 0 640 360"
      role="img"
      aria-label={
        demo ? "Демонстрационная схема дороги к морю" : "Линия пешего маршрута по координатам OSM"
      }
    >
      <rect width="640" height="360" fill="var(--map-land)" />
      {demo && (
        <>
          <path d="M0 220 Q100 190 180 260 T410 290 T640 340 V360 H0Z" fill="var(--map-sea)" />
          <path
            d="M0 214 Q100 184 180 254 T410 284 T640 334"
            fill="none"
            stroke="white"
            strokeWidth="10"
          />
          <path
            d="M40 90 H600 M90 40 V220 M225 25 V245 M370 35 V280 M510 35 V305"
            fill="none"
            stroke="white"
            strokeWidth="12"
          />
          <text x="80" y="325" fontSize="14" fill="var(--muted)">
            Море
          </text>
        </>
      )}
      <polyline
        points={points.map((point) => point.join(",")).join(" ")}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {[points[0]!, points.at(-1)!].map(([x, y], index) => (
        <g key={index}>
          <circle cx={x} cy={y} r="7" fill="var(--primary)" />
          <text x={x} y={y! - 15} textAnchor="middle" fontSize="13" fill="var(--ink)">
            {index ? "Пляж" : "Начало пути"}
          </text>
        </g>
      ))}
      <text x="320" y="340" textAnchor="middle" fontSize="12" fill="var(--muted)">
        {demo
          ? "Демо · условная схема, не для навигации"
          : "Линия маршрута без подложки · север сверху"}
      </text>
    </svg>
  );
}
