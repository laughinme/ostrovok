import { FACADE_ANGLE, relativeAzimuth, type WindowData } from "./geo";

export type WindowSceneData = Pick<WindowData, "facade" | "floor" | "horizon">;

export type GroundPoint = [number, number];
export interface ContextBuilding {
  id: string;
  points: GroundPoint[];
  height: number;
  estimated: boolean;
  hotel: boolean;
}
export interface WindowContext {
  radius: number;
  buildings: ContextBuilding[];
  roads: GroundPoint[][];
  water: GroundPoint[][];
}
export interface WindowContexts {
  version: number;
  attribution: string;
  hotels: Record<string, WindowContext>;
}

export function insidePolygon([x, z]: GroundPoint, points: GroundPoint[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, az] = points[i]!,
      [bx, bz] = points[j]!;
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

export function schematicContext(data: WindowSceneData): WindowContext {
  const buildings: ContextBuilding[] = [
    {
      id: "hotel",
      points: [
        [-10, -8],
        [10, -8],
        [10, 8],
        [-10, 8],
      ],
      height: Math.max(12, data.floor * 3),
      estimated: true,
      hotel: true,
    },
  ];
  const water: GroundPoint[][] = [];
  const samples = data.horizon.filter((ray) => ray.kind === "building" && ray.angleDeg != null);
  for (let offset = -70; offset < 70; offset += 16) {
    const rays = samples.filter((ray) => {
      const angle = relativeAzimuth(ray.azimuthDeg, data.facade);
      return angle >= offset && angle < offset + 16;
    });
    if (!rays.length) continue;
    const angle = ((FACADE_ANGLE[data.facade] + offset + 8) * Math.PI) / 180;
    const distance = 60 + ((offset + 70) % 3) * 16;
    const height = Math.max(
      4,
      Math.min(
        42,
        Math.tan((Math.max(...rays.map((ray) => ray.angleDeg!)) * Math.PI) / 180) * distance +
          data.floor * 3,
      ),
    );
    const x = Math.sin(angle) * distance,
      z = -Math.cos(angle) * distance;
    const half = distance * 0.12;
    buildings.push({
      id: `scheme-${offset}`,
      points: [
        [x - half, z - 7],
        [x + half, z - 7],
        [x + half, z + 7],
        [x - half, z + 7],
      ],
      height,
      estimated: true,
      hotel: false,
    });
  }
  for (const ray of data.horizon) {
    if (
      ray.kind === "unknown" ||
      ray.seaLowDeg == null ||
      ray.seaHighDeg == null ||
      ray.seaHighDeg <= ray.seaLowDeg
    )
      continue;
    const a = ((ray.azimuthDeg - 0.6) * Math.PI) / 180,
      b = ((ray.azimuthDeg + 0.6) * Math.PI) / 180;
    water.push([
      [Math.sin(a) * 100, -Math.cos(a) * 100],
      [Math.sin(a) * 140, -Math.cos(a) * 140],
      [Math.sin(b) * 140, -Math.cos(b) * 140],
      [Math.sin(b) * 100, -Math.cos(b) * 100],
    ]);
  }
  return { radius: 140, buildings, roads: [], water };
}

export function contextTrees(context: WindowContext): GroundPoint[] {
  const trees: GroundPoint[] = [];
  for (let x = -120; x <= 120; x += 30)
    for (let z = -120; z <= 120; z += 35) {
      const point: GroundPoint = [x + Math.sin(x + z) * 6, z + Math.cos(x - z) * 6];
      if (Math.hypot(...point) < 25 || (x + z) % 3 === 0) continue;
      if (context.water.some((polygon) => insidePolygon(point, polygon))) continue;
      if (
        context.buildings.some((building) => {
          const xs = building.points.map(([px]) => px),
            zs = building.points.map(([, pz]) => pz);
          return (
            point[0] > Math.min(...xs) - 7 &&
            point[0] < Math.max(...xs) + 7 &&
            point[1] > Math.min(...zs) - 7 &&
            point[1] < Math.max(...zs) + 7
          );
        })
      )
        continue;
      if (
        context.roads.some((road) =>
          road.some(([rx, rz]) => Math.hypot(rx - point[0], rz - point[1]) < 8),
        )
      )
        continue;
      trees.push(point);
    }
  return trees.slice(0, 28);
}
