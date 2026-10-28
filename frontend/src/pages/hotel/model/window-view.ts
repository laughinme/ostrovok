import type { ApiFact } from "@/entities/hotel";
import { readPanorama, readPanoramaLayout } from "@/shared/lib";
import { relativeAzimuth, solarVisibility, type GeoFacade, type WindowData } from "./geo";

export interface ViewSpan {
  from: number;
  to: number;
}
export interface ViewBuilding extends ViewSpan {
  roof: number;
  base: number;
  floors: number;
}
export interface WindowView {
  sea: ViewSpan[];
  mountains: (ViewSpan & { height: number })[];
  buildings: ViewBuilding[];
  trees: { x: number; base: number; scale: number }[];
  sun: number | null;
  unknown: ViewSpan[];
  objects: string[];
  known: boolean;
}
interface Selection {
  facade: GeoFacade;
  floor: number;
  date: string;
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const rounded = (value: number) => Number(value.toFixed(4));

function assertion(facts: ApiFact[], key: string, selection: Selection) {
  const month = Number(selection.date.slice(5, 7));
  const relevant = facts.filter((fact) => {
    const scope = fact.scope;
    return (
      fact.characteristic === key &&
      !fact.isDemo &&
      fact.status === "ok" &&
      (!fact.validUntil || fact.validUntil.slice(0, 10) >= selection.date) &&
      (!scope.facades?.length || scope.facades.includes(selection.facade)) &&
      (scope.floorFrom == null || selection.floor >= scope.floorFrom) &&
      (scope.floorTo == null || selection.floor <= scope.floorTo) &&
      (!scope.months?.length || scope.months.includes(month)) &&
      !scope.roomTypeIds?.length
    );
  });
  if (!relevant.length || relevant.some((fact) => typeof fact.value !== "boolean")) return null;
  const values = new Set(relevant.map((fact) => fact.value));
  return values.size === 1 ? relevant[0]!.value === true : null;
}

function finish(scene: Omit<WindowView, "objects">): WindowView {
  return {
    ...scene,
    objects: [
      ...(scene.sea.length ? ["Море"] : []),
      ...(scene.mountains.length ? ["Горы"] : []),
      ...(scene.buildings.length ? ["Дома"] : []),
      ...(scene.trees.length ? ["Деревья"] : []),
      ...(scene.sun !== null ? ["Закат"] : []),
    ],
  };
}

export function demoWindowView(facade: GeoFacade, floor: number): WindowView {
  const side = facade === "NE" || facade === "SE" || facade === "NW" ? facade : "SW";
  const layout = readPanoramaLayout(side, floor);
  const reading = readPanorama(side, floor);
  return finish({
    sea: layout.sea && reading.seaShare > 0 ? [layout.sea] : [],
    mountains: reading.mountains
      ? [{ from: side === "SE" ? -0.1 : 0, to: side === "SE" ? 0.65 : 1, height: 140 }]
      : [],
    buildings: layout.buildings.map((building) => ({
      from: building.from,
      to: building.to,
      roof: rounded(270 - building.elevation * 6.4),
      base: rounded(270 - building.baseElevation * 6.4),
      floors: building.floors,
    })),
    trees: [0.04, 0.08, 0.9, 0.96]
      .filter((x) => !layout.sea || x < layout.sea.from || x > layout.sea.to)
      .map((x, index) => ({
        x,
        base: 490 + floor * 5 + (index % 2) * 12,
        scale: index % 2 ? 0.85 : 1,
      })),
    sun: reading.sunVisible ? layout.sun : null,
    unknown: [],
    known: true,
  });
}

export function calculatedWindowView(
  selection: Selection,
  data?: WindowData,
  facts: ApiFact[] = [],
): WindowView {
  const current =
    data?.facade === selection.facade &&
    data.floor === selection.floor &&
    data.date === selection.date
      ? data
      : undefined;
  const rays = (current?.horizon ?? [])
    .map((ray) => ({ ...ray, offset: relativeAzimuth(ray.azimuthDeg, selection.facade) }))
    .filter((ray) => Number.isFinite(ray.offset) && Math.abs(ray.offset) <= 90)
    .sort((a, b) => a.offset - b.offset);
  const from = rays[0]?.offset ?? -70;
  const to = rays.at(-1)?.offset ?? 70;
  const x = (angle: number) => rounded(clamp((angle - from) / Math.max(1, to - from), 0, 1));
  const samples = rays.map((ray, index) => ({
    ...ray,
    from: rays.length === 1 ? 0 : x(index ? (rays[index - 1]!.offset + ray.offset) / 2 : from),
    to:
      rays.length === 1
        ? 1
        : x(index < rays.length - 1 ? (ray.offset + rays[index + 1]!.offset) / 2 : to),
    known: ray.kind !== "unknown" && ray.angleDeg !== null && Number.isFinite(ray.angleDeg),
  }));
  const spans = (matches: (ray: (typeof samples)[number]) => boolean) => {
    const result: ViewSpan[] = [];
    let connected = false;
    for (const ray of samples) {
      if (matches(ray)) {
        if (connected) result.at(-1)!.to = ray.to;
        else result.push({ from: ray.from, to: ray.to });
        connected = true;
      } else connected = false;
    }
    return result;
  };
  const known = samples.some((ray) => ray.known);
  const sea = spans(
    (ray) =>
      ray.known &&
      (current?.seaFraction ?? 0) > 0 &&
      ray.seaLowDeg !== null &&
      ray.seaHighDeg !== null &&
      ray.seaHighDeg > ray.seaLowDeg,
  );
  if (!known && assertion(facts, "sea_view", selection) === true) sea.push({ from: 0.2, to: 0.8 });
  const buildings = spans((ray) => ray.known && ray.kind === "building").flatMap((span) => {
    const count = Math.max(1, Math.ceil((span.to - span.from) / 0.17));
    return Array.from({ length: count }, (_, index) => {
      const left = span.from + ((span.to - span.from) * index) / count;
      const right = span.from + ((span.to - span.from) * (index + 1)) / count;
      const angles = samples
        .filter((ray) => ray.known && ray.kind === "building" && ray.to > left && ray.from < right)
        .map((ray) => ray.angleDeg!);
      const roof = rounded(clamp(270 - Math.max(...angles) * 6.4, 25, 530));
      const base = Math.max(roof + 30, 440 + selection.floor * 7);
      return { from: rounded(left), to: rounded(right), roof, base, floors: 5 };
    });
  });
  const mountains = (current?.peaks ?? [])
    .filter((peak) => {
      const offset = relativeAzimuth(peak.azimuthDeg, selection.facade);
      const position = x(offset);
      return (
        offset >= from &&
        offset <= to &&
        samples.some((ray) => ray.known && position >= ray.from && position <= ray.to)
      );
    })
    .map((peak) => {
      const center = x(relativeAzimuth(peak.azimuthDeg, selection.facade));
      return {
        from: center - 0.22,
        to: center + 0.22,
        height: clamp(peak.elevationDeg * 6.4, 45, 180),
      };
    });
  if (!known && assertion(facts, "mountain_view", selection) === true)
    mountains.push({ from: 0.05, to: 0.95, height: 130 });
  const trees =
    assertion(facts, "tree_view", selection) === true
      ? [0.09, 0.18, 0.89].map((position) => ({
          x: position,
          base: 475 + selection.floor * 5,
          scale: 1,
        }))
      : [];
  const sunset = current ? relativeAzimuth(current.sunset.azimuthDeg, selection.facade) : null;
  const hasObjects = sea.length + mountains.length + buildings.length + trees.length > 0;
  return finish({
    sea,
    mountains,
    buildings,
    trees,
    sun:
      current && sunset !== null && solarVisibility(current, "sunset") === "виден"
        ? x(sunset)
        : null,
    unknown: hasObjects && !known ? [] : spans((ray) => !ray.known),
    known: known || hasObjects,
  });
}
