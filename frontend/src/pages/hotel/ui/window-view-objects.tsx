import type { ViewBuilding, ViewSpan } from "../model/window-view";

export function SeaObject({ span, fill }: { span: ViewSpan; fill: string }) {
  const left = span.from * 960;
  const width = (span.to - span.from) * 960;
  return (
    <g data-window-object="sea">
      <rect x={left} y="270" width={width} height="290" fill={fill} />
      <path d={`M${left} 270h${width}`} stroke="var(--surface)" strokeWidth="2" />
      {[296, 325, 370, 430, 500].map((y, index) => (
        <path
          key={y}
          d={`M${left + width * 0.08} ${y}h${width * 0.24}m${width * 0.14} 0h${width * 0.36}`}
          stroke="var(--on-scene-muted)"
          strokeWidth={1 + index * 0.3}
          opacity=".35"
        />
      ))}
    </g>
  );
}

export function MountainObject({
  span,
  fill,
}: {
  span: ViewSpan & { height: number };
  fill: string;
}) {
  return (
    <g
      data-window-object="mountain"
      transform={`translate(${span.from * 960} ${270 - span.height}) scale(${span.to - span.from} ${span.height / 160})`}
    >
      <path
        d="M0 170 60 133 105 142 180 80 222 96 300 22 342 49 390 0 435 44 495 73 548 31 590 61 660 110 711 89 783 131 836 123 910 157 960 170V300H0Z"
        fill={fill}
      />
      <path d="m300 22 42 27 48-49-24 61-23-9-29 19-17-22-42 36Z" fill="var(--surface)" />
      <path
        d="m548 31 42 30 70 49-48-20-29-25-16 7-18-12-38 23Z"
        fill="var(--surface)"
        opacity=".7"
      />
      <path d="M0 203q120-53 237-23t220-1 219 8 284 16v140H0Z" fill="var(--view-hill-far)" />
      <path d="M0 247q130-35 248-8t248-3 240 15 224-6v100H0Z" fill="var(--lime-deep)" />
    </g>
  );
}

export function BuildingObject({ building, index }: { building: ViewBuilding; index: number }) {
  const left = building.from * 960;
  const width = (building.to - building.from) * 960;
  const roof = building.roof;
  const height = Math.max(0, building.base - roof);
  const columns = Math.max(2, Math.floor(width / 21));
  const rows = Math.min(12, building.floors);
  const rowHeight = Math.max(4, (height - 14) / rows);
  const columnWidth = Math.max(4, (width - 12) / columns);
  const side = Math.min(14, width * 0.12);
  return (
    <g data-window-object="building">
      <path
        d={`M${left + width} ${roof}l${side} 7v${height - 4}l-${side} -3Z`}
        fill="var(--view-building-side)"
      />
      <rect
        x={left}
        y={roof}
        width={width}
        height={height}
        fill={index % 2 ? "var(--raised)" : "var(--surface)"}
      />
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: columns }, (_, column) => (
          <rect
            key={`${row}-${column}`}
            x={left + 8 + column * columnWidth}
            y={roof + 9 + row * rowHeight}
            width={Math.min(8, columnWidth * 0.45)}
            height={Math.max(2, rowHeight * 0.48)}
            rx=".7"
            fill="var(--scene)"
          />
        )),
      )}
      <path d={`M${left - 2} ${roof}h${width + 4}v4h-${width + 4}Z`} fill="var(--scene-raised)" />
      <path
        d={`M${left} ${roof - 2}l${side} -6h${width - side}v6Z`}
        fill="var(--view-building-roof)"
      />
    </g>
  );
}

export function TreeObject({ x, base, scale }: { x: number; base: number; scale: number }) {
  return (
    <g data-window-object="tree" transform={`translate(${x * 960} ${base}) scale(${scale})`}>
      <path d="M0 0v-48" stroke="var(--ink)" strokeWidth="5" />
      <ellipse cy="-52" rx="23" ry="34" fill="var(--view-tree-light)" />
      <ellipse cx="-8" cy="-45" rx="15" ry="24" fill="var(--view-tree-dark)" />
      <path d="M0-20v-52" stroke="var(--on-verified)" strokeWidth="2" />
    </g>
  );
}
