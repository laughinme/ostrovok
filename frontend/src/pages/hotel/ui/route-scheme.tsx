import { routePoints, type RouteData } from "../model/geo";

export function RouteScheme({ route }: { route: RouteData }) {
  const points = routePoints(route.geometry.coordinates);
  if (!points.length) return <p className="geo-status">Нет данных линии маршрута</p>;
  return (
    <svg
      className="geo-route-scheme"
      viewBox="0 0 640 360"
      role="img"
      aria-label="Линия пешего маршрута по координатам OSM"
    >
      <rect width="640" height="360" fill="var(--map-land)" />
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
        Линия маршрута без подложки · север сверху
      </text>
    </svg>
  );
}
