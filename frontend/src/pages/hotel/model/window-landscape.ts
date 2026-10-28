import { relativeAzimuth, type WindowData } from "./geo";

export const LANDSCAPE = { width: 960, height: 560, horizon: 270, pixelsPerDegree: 4.5 };
const rounded = (value: number) => Number(value.toFixed(3));
export const landscapeY = (angle: number) =>
  rounded(Math.max(-120, Math.min(680, LANDSCAPE.horizon - angle * LANDSCAPE.pixelsPerDegree)));

type Ray = WindowData["horizon"][number];
export interface LandscapeSample extends Ray {
  offset: number;
  x: number;
  left: number;
  right: number;
}

function bandPath(
  samples: LandscapeSample[],
  upper: (ray: LandscapeSample) => number,
  lower: (ray: LandscapeSample) => number,
) {
  const first = samples[0]!,
    last = samples.at(-1)!;
  return `M${first.left},${upper(first)} ${samples.map((ray) => `L${ray.x},${upper(ray)}`).join(" ")} L${last.right},${upper(last)} L${last.right},${lower(last)} ${samples
    .slice()
    .reverse()
    .map((ray) => `L${ray.x},${lower(ray)}`)
    .join(" ")} L${first.left},${lower(first)}Z`;
}

function groups(samples: LandscapeSample[], key: (ray: LandscapeSample) => string | null) {
  const result: LandscapeSample[][] = [];
  let previous: string | null = null;
  for (const sample of samples) {
    const current = key(sample);
    if (current !== null) {
      if (previous !== current) result.push([]);
      result.at(-1)!.push(sample);
    }
    previous = current;
  }
  return result;
}

export function windowLandscape(data: WindowData) {
  const rays = data.horizon
    .map((ray) => ({ ...ray, offset: relativeAzimuth(ray.azimuthDeg, data.facade) }))
    .sort((a, b) => a.offset - b.offset);
  const from = rays[0]?.offset ?? -70;
  const to = rays.at(-1)?.offset ?? 70;
  const x = (offset: number) =>
    rounded(((offset - from) / Math.max(1, to - from)) * LANDSCAPE.width);
  const samples: LandscapeSample[] = rays.map((ray, index) => ({
    ...ray,
    x: x(ray.offset),
    left: x(index ? (rays[index - 1]!.offset + ray.offset) / 2 : from),
    right: x(index < rays.length - 1 ? (ray.offset + rays[index + 1]!.offset) / 2 : to),
  }));
  const obstacles = groups(samples, (ray) =>
    ray.angleDeg == null || ray.kind === "unknown" || ray.kind === "sky" || ray.kind === "sea"
      ? null
      : ray.kind,
  );
  const sea = groups(samples, (ray) =>
    ray.kind !== "unknown" &&
    ray.angleDeg != null &&
    ray.seaLowDeg != null &&
    ray.seaHighDeg != null &&
    ray.seaHighDeg > ray.seaLowDeg
      ? "sea"
      : null,
  );
  const buildings = samples.filter((ray) => ray.kind === "building" && ray.angleDeg != null);
  return {
    from,
    to,
    x,
    samples,
    obstacles: obstacles.map((group) => ({
      kind: group[0]!.kind,
      path: bandPath(
        group,
        (ray) => landscapeY(ray.angleDeg!),
        () => LANDSCAPE.height,
      ),
    })),
    sea: sea.map((group) =>
      bandPath(
        group,
        (ray) => landscapeY(ray.seaHighDeg!),
        (ray) => landscapeY(ray.seaLowDeg!),
      ),
    ),
    buildings: Array.from({ length: 8 }, (_, index) => {
      const left = index * 120;
      const group = buildings.filter((ray) => ray.right > left && ray.left < left + 120);
      return {
        left,
        roof: group.length
          ? Math.max(80, Math.min(...group.map((ray) => landscapeY(ray.angleDeg!))))
          : 270,
        visible: group.length > 0,
      };
    }).filter((building) => building.visible),
    unknown: groups(samples, (ray) =>
      ray.kind === "unknown" || ray.angleDeg == null ? "unknown" : null,
    ).map((group) => ({
      left: group[0]!.left,
      width: rounded(group.at(-1)!.right - group[0]!.left),
    })),
  };
}
