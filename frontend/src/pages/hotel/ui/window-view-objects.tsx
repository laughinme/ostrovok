import type { ViewBuilding } from "../model/window-view";

export function SeaObject({ fill }: { fill: string }) {
  return (
    <g data-window-object="sea" data-window-layer="sea">
      <rect x="0" y="270" width="960" height="290" fill={fill} />
      <path d="M0 270H960" stroke="var(--view-water-line)" strokeWidth="2" />
      {[296, 325, 370, 430, 500].map((y, index) => (
        <path
          key={y}
          d={`M${index % 2 ? 20 : 70} ${y}h110m65 0h170m80 0h150m55 0h200`}
          stroke="var(--view-water-line)"
          strokeWidth={1 + index * 0.3}
          opacity=".35"
        />
      ))}
    </g>
  );
}

export function MountainObject({ fill }: { fill: string }) {
  return (
    <g
      data-window-object="mountain"
      data-window-layer="mountains"
      transform="translate(-24 110) scale(1.05 1)"
    >
      <path
        d="M0 170 60 133 105 142 180 80 222 96 300 22 342 49 390 0 435 44 495 73 548 31 590 61 660 110 711 89 783 131 836 123 910 157 960 170V450H0Z"
        fill={fill}
      />
      <path d="m300 22 42 27 48-49-24 61-23-9-29 19-17-22-42 36Z" fill="var(--view-snow)" />
      <path
        d="m548 31 42 30 70 49-48-20-29-25-16 7-18-12-38 23Z"
        fill="var(--view-snow)"
        opacity=".7"
      />
      <path d="M0 203q120-53 237-23t220-1 219 8 284 16v247H0Z" fill="var(--view-hill-far)" />
      <path d="M0 247q130-35 248-8t248-3 240 15 224-6v205H0Z" fill="var(--view-foreground)" />
    </g>
  );
}

const rowHeights = [204, 250, 180, 234, 196, 242, 212, 226];
export function BuildingRow() {
  return (
    <g data-window-layer="buildings">
      {rowHeights.map((height, index) => (
        <BuildingObject
          key={index}
          index={index}
          building={{
            from: index === 0 ? -0.02 : index / rowHeights.length,
            to: index === rowHeights.length - 1 ? 1.02 : (index + 1) / rowHeights.length,
            roof: 462 - height,
            base: 462,
            floors: Math.round(height / 28),
          }}
        />
      ))}
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
        fill={index % 2 ? "var(--view-building-alt)" : "var(--view-building-front)"}
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
            fill="var(--view-building-window)"
          />
        )),
      )}
      <path
        d={`M${left - 2} ${roof}h${width + 4}v4h-${width + 4}Z`}
        fill="var(--view-building-trim)"
      />
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
      <path d="M0 0v-48" stroke="var(--view-tree-trunk)" strokeWidth="5" />
      <ellipse cy="-52" rx="23" ry="34" fill="var(--view-tree-light)" />
      <ellipse cx="-8" cy="-45" rx="15" ry="24" fill="var(--view-tree-dark)" />
      <path d="M0-20v-52" stroke="var(--view-tree-branch)" strokeWidth="2" />
    </g>
  );
}
