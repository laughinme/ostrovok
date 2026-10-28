import {
  projectSpace,
  SPACE_FLOOR,
  spacePath,
  spacePoints,
  type SpacePoint,
} from "./evidence-geometry";

type MeshFace = { vertices: SpacePoint[]; fill: string };

export function SpaceFace({
  vertices,
  fill,
  opacity,
  surface = false,
}: {
  vertices: readonly SpacePoint[];
  fill: string;
  opacity?: number;
  surface?: boolean;
}) {
  return (
    <polygon
      data-space-surface={surface || undefined}
      points={spacePoints(vertices)}
      fill={fill}
      opacity={opacity}
    />
  );
}

export function SpaceBox({
  x,
  y,
  z = 0,
  width,
  depth,
  height,
  top = "var(--map-sea)",
  front = "var(--surface)",
  side = "var(--map-sea)",
}: {
  x: number;
  y: number;
  z?: number;
  width: number;
  depth: number;
  height: number;
  top?: string;
  front?: string;
  side?: string;
}) {
  return (
    <g>
      <SpaceFace
        vertices={[
          [x, y, z],
          [x + width, y, z],
          [x + width, y, z + height],
          [x, y, z + height],
        ]}
        fill={front}
      />
      <SpaceFace
        vertices={[
          [x + width, y, z],
          [x + width, y + depth, z],
          [x + width, y + depth, z + height],
          [x + width, y, z + height],
        ]}
        fill={side}
      />
      <SpaceFace
        vertices={[
          [x, y, z + height],
          [x + width, y, z + height],
          [x + width, y + depth, z + height],
          [x, y + depth, z + height],
        ]}
        fill={top}
        surface
      />
    </g>
  );
}

export function SpaceShadow({
  x,
  y,
  z = 0,
  width,
  depth,
}: {
  x: number;
  y: number;
  z?: number;
  width: number;
  depth: number;
}) {
  const reach = Math.min(18, width * 0.3);
  return (
    <SpaceFace
      vertices={[
        [x, y, z + 0.05],
        [x + width, y, z + 0.05],
        [x + width + reach, y - (reach * 2) / 3, z + 0.05],
        [x + width + reach, y + depth - (reach * 2) / 3, z + 0.05],
        [x, y + depth, z + 0.05],
      ]}
      fill="var(--scene)"
      opacity={0.12}
    />
  );
}

export function SpaceGround({
  x,
  y = 0,
  width,
  depth,
}: {
  x: number;
  y?: number;
  width: number;
  depth: number;
}) {
  return (
    <g data-ground>
      <SpaceBox
        x={x}
        y={y}
        z={-16}
        width={width}
        depth={depth}
        height={16}
        top="color-mix(in srgb, var(--verified) 48%, var(--surface))"
        front="var(--map-sea)"
        side="color-mix(in srgb, var(--map-sea) 78%, var(--primary))"
      />
      <path
        d={spacePath([
          [x, y, 0],
          [x + width, y, 0],
          [x + width, y + depth, 0],
        ])}
        stroke="var(--surface)"
        strokeOpacity=".45"
        fill="none"
        strokeWidth="1"
      />
    </g>
  );
}

export function SpaceWater({
  id,
  x,
  width,
  depth,
  z = 0,
}: {
  id: string;
  x: number;
  width: number;
  depth: number;
  z?: number;
}) {
  const surface: SpacePoint[] = [
    [x, 0, z + 0.1],
    [x + width, 0, z + 0.1],
    [x + width, depth, z + 0.1],
    [x, depth, z + 0.1],
  ];
  return (
    <g data-water>
      <defs>
        <clipPath id={id}>
          <polygon points={spacePoints(surface)} />
        </clipPath>
      </defs>
      <SpaceBox
        x={x}
        y={0}
        z={-16}
        width={width}
        depth={depth}
        height={16 + z}
        top="var(--primary)"
        front="color-mix(in srgb, var(--primary) 75%, var(--scene))"
        side="color-mix(in srgb, var(--primary) 55%, var(--scene))"
      />
      <g clipPath={`url(#${id})`}>
        {[18, 46, 76, 104]
          .filter((y) => y < depth)
          .map((y, i) => (
            <path
              key={y}
              data-sea-wave
              d={spacePath(
                Array.from({ length: 55 }, (_, j): SpacePoint => [
                  x - 24 + (j * (width + 48)) / 54,
                  y + Math.sin(j * 0.55 + i) * 6,
                  z + 0.2,
                ]),
              )}
              fill="none"
              stroke="var(--map-sea)"
              strokeWidth="1.25"
              strokeOpacity=".6"
            />
          ))}
      </g>
      <path
        d={spacePath([
          [x, 0, z + 0.3],
          [x, depth, z + 0.3],
        ])}
        stroke="var(--surface)"
        strokeWidth="1.5"
        strokeOpacity=".7"
        fill="none"
      />
    </g>
  );
}

export function SpaceHotel({
  x,
  y,
  z = 0,
  width = 108,
  depth = 54,
  height = 143,
  floors = 4,
  courtyard = false,
  selected = false,
}: {
  x: number;
  y: number;
  z?: number;
  width?: number;
  depth?: number;
  height?: number;
  floors?: number;
  courtyard?: boolean;
  selected?: boolean;
}) {
  const floorHeight = height / (floors + 0.9);
  const windowWidth = width * 0.13;
  const windowHeight = floorHeight * 0.68;
  return (
    <g data-building>
      <SpaceBox
        x={x}
        y={y}
        z={z}
        width={width}
        depth={depth}
        height={height}
        side={courtyard ? "var(--verified)" : "var(--map-sea)"}
      />
      {Array.from({ length: floors }, (_, row) => {
        const top = z + height - 15 - row * floorHeight;
        return (
          <g key={row}>
            {[0.13, 0.38, 0.63].map((column) => {
              const left = x + width * column;
              return (
                <g key={column}>
                  <SpaceFace
                    vertices={[
                      [left, y - 0.05, top - windowHeight],
                      [left + windowWidth, y - 0.05, top - windowHeight],
                      [left + windowWidth, y - 0.05, top],
                      [left, y - 0.05, top],
                    ]}
                    fill="var(--primary)"
                  />
                  <path
                    d={spacePath([
                      [left + windowWidth / 2, y - 0.1, top - windowHeight],
                      [left + windowWidth / 2, y - 0.1, top],
                    ])}
                    stroke="var(--map-sea)"
                    strokeWidth=".9"
                  />
                </g>
              );
            })}
            <SpaceFace
              vertices={[
                [x + width + 0.05, y + 14, top - windowHeight],
                [x + width + 0.05, y + depth - 10, top - windowHeight],
                [x + width + 0.05, y + depth - 10, top],
                [x + width + 0.05, y + 14, top],
              ]}
              fill={
                selected && row === 1
                  ? "var(--verified)"
                  : courtyard
                    ? "var(--scene)"
                    : "var(--primary)"
              }
            />
          </g>
        );
      })}
      <SpaceFace
        vertices={[
          [x + width * 0.36, y - 0.1, z],
          [x + width * 0.6, y - 0.1, z],
          [x + width * 0.6, y - 0.1, z + 22],
          [x + width * 0.36, y - 0.1, z + 22],
        ]}
        fill="var(--scene)"
      />
      <SpaceBox
        x={x - 1.5}
        y={y - 1.5}
        z={z + height}
        width={width + 3}
        depth={depth + 3}
        height={2}
        top="var(--map-sea)"
        front="var(--surface)"
        side="var(--surface)"
      />
    </g>
  );
}

function SpaceOrb({
  x,
  y,
  z,
  radius,
  stretch = 1,
}: {
  x: number;
  y: number;
  z: number;
  radius: number;
  stretch?: number;
}) {
  const ring = (level: number, segment: number): SpacePoint => {
    const latitude = -Math.PI / 2 + (level * Math.PI) / 5;
    const longitude = (segment * Math.PI) / 4;
    return [
      x + radius * Math.cos(latitude) * Math.cos(longitude),
      y + radius * Math.cos(latitude) * Math.sin(longitude),
      z + radius * Math.sin(latitude) * stretch,
    ];
  };
  const faces: MeshFace[] = [];
  for (let level = 0; level < 5; level++)
    for (let segment = 0; segment < 8; segment++) {
      const fill =
        segment < 3
          ? "var(--verified)"
          : segment < 6
            ? "color-mix(in srgb, var(--verified) 76%, var(--surface))"
            : "color-mix(in srgb, var(--verified) 79%, var(--primary))";
      faces.push({
        vertices: [
          ring(level, segment),
          ring(level, segment + 1),
          ring(level + 1, segment + 1),
          ring(level + 1, segment),
        ],
        fill,
      });
    }
  const depth = (face: MeshFace) =>
    face.vertices.reduce((sum, [a, b, c]) => sum + 0.72 * a - b + 0.334 * c, 0) /
    face.vertices.length;
  return (
    <g>
      {faces
        .sort((a, b) => depth(a) - depth(b))
        .map((face, i) => (
          <SpaceFace key={i} {...face} />
        ))}
    </g>
  );
}

export function SpaceTree({
  x,
  y,
  z = 0,
  size = 1,
}: {
  x: number;
  y: number;
  z?: number;
  size?: number;
}) {
  return (
    <g>
      <SpaceShadow x={x - 9 * size} y={y - 6 * size} z={z} width={18 * size} depth={16 * size} />
      <SpaceBox
        x={x - 1.8 * size}
        y={y - 1.8 * size}
        z={z}
        width={3.6 * size}
        depth={3.6 * size}
        height={29 * size}
        top="var(--surface)"
        front="var(--map-sea)"
        side="color-mix(in srgb, var(--map-sea) 70%, var(--primary))"
      />
      <SpaceOrb x={x} y={y} z={z + 41 * size} radius={18 * size} stretch={1.14} />
    </g>
  );
}

export function SpaceBench({ x, y, z = 0 }: { x: number; y: number; z?: number }) {
  return (
    <g>
      <SpaceShadow x={x} y={y} z={z} width={38} depth={13} />
      {[2, 31].map((offset) => (
        <g key={offset}>
          <SpaceBox
            x={x + offset}
            y={y + 1}
            z={z}
            width={3}
            depth={3}
            height={11}
            front="var(--scene)"
            side="var(--primary)"
          />
          <SpaceBox
            x={x + offset}
            y={y + 9}
            z={z}
            width={3}
            depth={3}
            height={23}
            front="var(--scene)"
            side="var(--primary)"
          />
        </g>
      ))}
      <SpaceBox x={x} y={y} z={z + 10} width={38} depth={13} height={3} />
      <SpaceBox x={x} y={y + 10} z={z + 16} width={38} depth={3} height={7} />
    </g>
  );
}

export function SpaceUmbrella({ x, y, z = 0 }: { x: number; y: number; z?: number }) {
  const apex: SpacePoint = [x, y, z + 46];
  const edge = (i: number): SpacePoint => [
    x + 20 * Math.cos((i * Math.PI) / 4),
    y + 20 * Math.sin((i * Math.PI) / 4),
    z + 34,
  ];
  const panels = Array.from({ length: 8 }, (_, i) => ({
    vertices: [edge(i), edge(i + 1), apex],
    fill: i < 4 ? "var(--verified)" : "color-mix(in srgb, var(--verified) 75%, var(--primary))",
  }));
  return (
    <g>
      <SpaceShadow x={x - 12} y={y - 10} z={z} width={24} depth={20} />
      <SpaceBox
        x={x - 1}
        y={y - 1}
        z={z}
        width={2}
        depth={2}
        height={44}
        front="var(--scene)"
        side="var(--primary)"
      />
      {panels
        .sort((a, b) => b.vertices[0]![1] - a.vertices[0]![1])
        .map((face, i) => (
          <SpaceFace key={i} {...face} />
        ))}
    </g>
  );
}

export function SpaceWalker() {
  const start = projectSpace([103, 38, 54]);
  return (
    <g data-walker transform={`translate(${start.x} ${start.y})`}>
      <g transform={`translate(0 ${-SPACE_FLOOR})`}>
        <SpaceShadow x={-3} y={-1} width={7} depth={5} />
        {[-3, 1].map((x) => (
          <SpaceBox
            key={x}
            x={x}
            y={0}
            width={2.4}
            depth={3}
            height={7}
            front="var(--scene)"
            side="var(--primary)"
          />
        ))}
        <SpaceBox
          x={-4}
          y={-0.5}
          z={7}
          width={8}
          depth={4}
          height={9}
          top="var(--primary)"
          front="var(--primary)"
          side="var(--scene)"
        />
        {[-5, 4].map((x) => (
          <SpaceBox
            key={x}
            x={x}
            y={0}
            z={7}
            width={1.5}
            depth={2}
            height={7}
            front="var(--verified)"
            side="var(--map-sea)"
          />
        ))}
        <SpaceOrb x={0} y={1.5} z={20} radius={3.3} />
      </g>
    </g>
  );
}
