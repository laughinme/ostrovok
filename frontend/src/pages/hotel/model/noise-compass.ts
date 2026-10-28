import { FACADE_ANGLE, type GeoFacade } from "./geo";

export function unwrapBearing(current: number, target: number) {
  return current + ((((target - current) % 360) + 540) % 360) - 180;
}

export function pointerBearing(x: number, y: number) {
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
}

export function nearestFacade(angle: number, facades: GeoFacade[]) {
  return [...facades]
    .sort((a, b) => FACADE_ANGLE[a] - FACADE_ANGLE[b])
    .reduce<GeoFacade | undefined>((best, facade) => {
      if (!best) return facade;
      return Math.abs(unwrapBearing(angle, FACADE_ANGLE[facade]) - angle) <
        Math.abs(unwrapBearing(angle, FACADE_ANGLE[best]) - angle)
        ? facade
        : best;
    }, undefined);
}
