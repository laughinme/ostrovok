const GROUND_DEPTH_X = 69;
const GROUND_DEPTH_Y = -32;

export type SpacePoint = readonly [number, number, number];
export const SPACE_FLOOR = 264;
const SPACE_DEPTH_X = 0.72;
const SPACE_DEPTH_Y = (SPACE_DEPTH_X * GROUND_DEPTH_Y) / GROUND_DEPTH_X;

export function projectSpace([x, y, z]: SpacePoint) {
  return { x: x + y * SPACE_DEPTH_X, y: SPACE_FLOOR + y * SPACE_DEPTH_Y - z };
}

export function spacePoints(vertices: readonly SpacePoint[]) {
  return vertices
    .map((vertex) => {
      const point = projectSpace(vertex);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

export function spacePath(vertices: readonly SpacePoint[]) {
  return vertices
    .map((vertex, i) => {
      const point = projectSpace(vertex);
      return `${i ? "L" : "M"}${point.x} ${point.y}`;
    })
    .join("");
}

export const SUN_ARC = "M28 226C28 -30 502 -30 502 226";
export const SUN_WINDOW = projectSpace([155, 67.5, 89]);
export const BEACH_PROFILE = [
  [18, 54],
  [164, 54],
  [224, 27],
  [238, 27],
  [238, 21],
  [253, 21],
  [253, 15],
  [268, 15],
  [268, 9],
  [283, 9],
  [283, 3],
  [298, 3],
  [298, 0],
  [350, 0],
] as const;
export const BEACH_ROUTE = spacePath([
  [103, 38, 54],
  [103, 20, 54],
  [164, 20, 54],
  ...BEACH_PROFILE.slice(2).map(([x, z]): SpacePoint => [x, 20, z]),
]);

const ROAD_ACROSS_X = 69 / 62;
const ROAD_DEPTH_X = -109 / 210;
const ROAD_DEPTH_Y = (-109 * GROUND_DEPTH_Y) / (210 * GROUND_DEPTH_X);

export const NOISE_ROAD_TRANSFORM = `translate(158.5 214) matrix(${ROAD_ACROSS_X} 0 ${ROAD_DEPTH_X} ${ROAD_DEPTH_Y} 0 0) translate(-82 -52)`;

export function projectRoadOffset(x: number, y: number, z = 0) {
  const point = projectSpace([ROAD_ACROSS_X * x, (ROAD_DEPTH_X / SPACE_DEPTH_X) * y, z]);
  return { x: point.x, y: point.y - SPACE_FLOOR };
}

export function projectRoadPoint(x: number, y: number) {
  const point = projectRoadOffset(x - 82, y - 52);
  return { x: 158.5 + point.x, y: 214 + point.y };
}
