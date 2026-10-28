import type { WindowContext } from "../model/window-context";

export function WindowContextFallback({
  context,
  rotation = 0,
}: {
  context: WindowContext;
  rotation?: number;
}) {
  const project = ([x, z]: [number, number], height = 0) => {
    const a = rotation + 0.35;
    const rx = x * Math.cos(a) - z * Math.sin(a),
      rz = x * Math.sin(a) + z * Math.cos(a);
    return [480 + (rx - rz) * 1.3, 300 + (rx + rz) * 0.65 - height * 2] as const;
  };
  const points = (polygon: [number, number][], height = 0) =>
    polygon.map((point) => project(point, height).join(",")).join(" ");
  return (
    <svg
      className="window-context-fallback"
      viewBox="0 0 960 600"
      role="img"
      aria-label="Объёмная схема окрестностей отеля"
    >
      <rect width="960" height="600" fill="#edf3f1" />
      <polygon
        points={points([
          [-140, -140],
          [140, -140],
          [140, 140],
          [-140, 140],
        ])}
        fill="#dce6d7"
        stroke="#c0cec7"
        strokeWidth="9"
        strokeLinejoin="round"
      />
      {context.water.map((polygon, index) => (
        <polygon key={index} points={points(polygon)} fill="#9dcbd4" />
      ))}
      {context.roads.map((road, index) => (
        <polyline
          key={index}
          points={points(road)}
          fill="none"
          stroke="#f9f7ed"
          strokeWidth="7"
          strokeLinejoin="round"
        />
      ))}
      {context.buildings
        .slice()
        .sort((a, b) => project(a.points[0]!)[1] - project(b.points[0]!)[1])
        .map((building, index) => (
          <g key={`${building.id}-${index}`}>
            {building.points.map((point, index) => {
              const next = building.points[(index + 1) % building.points.length]!;
              return (
                <polygon
                  key={index}
                  points={[
                    project(point),
                    project(next),
                    project(next, building.height),
                    project(point, building.height),
                  ]
                    .map((p) => p.join(","))
                    .join(" ")}
                  fill={building.hotel ? "#3456d9" : index % 2 ? "#d0d8d6" : "#f4f1e8"}
                  stroke={building.hotel ? "#3456d9" : "#d0d8d6"}
                  strokeWidth=".6"
                />
              );
            })}
            <polygon
              points={points(building.points, building.height)}
              fill={building.hotel ? "#7390ff" : "#faf8ef"}
            />
          </g>
        ))}
      <circle cx="480" cy="300" r="5" fill="#2146e4" stroke="white" strokeWidth="3" />
    </svg>
  );
}
