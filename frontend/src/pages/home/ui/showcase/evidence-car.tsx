import { projectRoadOffset, projectRoadPoint } from "./evidence-geometry";

type Vertex = readonly [number, number, number];
type Face = { vertices: Vertex[]; fill: string };

const WIDTH = 16;
const LENGTH = 36;
const OUTLINE = [
  [2, 0],
  [14, 0],
  [16, 3],
  [16, 33],
  [14, 36],
  [2, 36],
  [0, 33],
  [0, 3],
] as const;

function carFaces(pale: boolean): Face[] {
  const light = pale ? "var(--verified)" : "var(--surface)";
  const shade = pale ? "color-mix(in srgb, var(--verified) 72%, var(--primary))" : "var(--map-sea)";
  const glass = "var(--scene)";
  const bottom: Vertex[] = OUTLINE.map(([x, y]) => [x, y, 2]);
  const top: Vertex[] = OUTLINE.map(([x, y]) => [x, y, 4.5]);
  const faces: Face[] = OUTLINE.map((_, i) => ({
    vertices: [bottom[i]!, bottom[(i + 1) % 8]!, top[(i + 1) % 8]!, top[i]!],
    fill: i > 3 ? light : shade,
  }));
  faces.push({ vertices: top, fill: light });
  for (const x of [-0.6, WIDTH + 0.6]) {
    for (const y of [8, 28]) {
      const disc = (radius: number): Vertex[] =>
        Array.from({ length: 16 }, (_, i) => {
          const angle = (i * Math.PI) / 8;
          return [x, y + Math.cos(angle) * radius, 2.6 + Math.sin(angle) * radius];
        });
      faces.push({ vertices: disc(2.6), fill: glass });
      faces.push({ vertices: disc(1.05), fill: "var(--map-sea)" });
    }
  }
  faces.push(
    {
      vertices: [
        [1.5, 9, 4.5],
        [14.5, 9, 4.5],
        [13, 12, 9],
        [3, 12, 9],
      ],
      fill: glass,
    },
    {
      vertices: [
        [14.5, 9, 4.5],
        [14.5, 27, 4.5],
        [13, 23, 9],
        [13, 12, 9],
      ],
      fill: glass,
    },
    {
      vertices: [
        [14.5, 27, 4.5],
        [1.5, 27, 4.5],
        [3, 23, 9],
        [13, 23, 9],
      ],
      fill: glass,
    },
    {
      vertices: [
        [1.5, 27, 4.5],
        [1.5, 9, 4.5],
        [3, 12, 9],
        [3, 23, 9],
      ],
      fill: glass,
    },
    {
      vertices: [
        [3, 12, 9],
        [13, 12, 9],
        [13, 23, 9],
        [3, 23, 9],
      ],
      fill: light,
    },
    {
      vertices: [
        [1.5, 17, 4.5],
        [1.5, 18.5, 4.5],
        [3, 18.5, 9],
        [3, 17, 9],
      ],
      fill: light,
    },
    {
      vertices: [
        [14.5, 17, 4.5],
        [14.5, 18.5, 4.5],
        [13, 18.5, 9],
        [13, 17, 9],
      ],
      fill: shade,
    },
    {
      vertices: [
        [2, 0, 2.5],
        [5, 0, 2.5],
        [5, 0, 3.8],
        [2, 0, 3.8],
      ],
      fill: pale ? "var(--surface)" : "var(--verified)",
    },
    {
      vertices: [
        [11, 0, 2.5],
        [14, 0, 2.5],
        [14, 0, 3.8],
        [11, 0, 3.8],
      ],
      fill: pale ? "var(--surface)" : "var(--verified)",
    },
  );
  return faces;
}

export function EvidenceCar({
  lane,
  distance,
  pale = false,
  reverse = false,
}: {
  lane: number;
  distance: number;
  pale?: boolean;
  reverse?: boolean;
}) {
  const origin = projectRoadPoint(lane, distance);
  const orient = ([x, y, z]: Vertex): Vertex => (reverse ? [WIDTH - x, LENGTH - y, z] : [x, y, z]);
  const points = (vertices: readonly Vertex[]) =>
    vertices
      .map((vertex) => {
        const point = projectRoadOffset(...orient(vertex));
        return `${point.x},${point.y}`;
      })
      .join(" ");
  const depth = (vertices: Vertex[]) =>
    vertices.reduce((sum, vertex) => {
      const [x, y, z] = orient(vertex);
      return sum + x * 0.4664 + y + z * 0.2407;
    }, 0) / vertices.length;
  const faces = carFaces(pale).sort((a, b) => depth(a.vertices) - depth(b.vertices));
  return (
    <g data-car data-road-lane={lane} transform={`translate(${origin.x} ${origin.y})`}>
      <polygon
        points={points(OUTLINE.map(([x, y]) => [x, y, 0]))}
        transform="translate(1.5 2)"
        fill="var(--scene)"
        opacity=".25"
      />
      {faces.map((face, i) => (
        <polygon key={i} points={points(face.vertices)} fill={face.fill} />
      ))}
    </g>
  );
}
