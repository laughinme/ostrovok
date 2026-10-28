import * as THREE from "three";
import type { GlobePin } from "./globe-pins";

export function globePosition(lat: number, lon: number, radius: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function flightCurve(from: GlobePin, to: GlobePin) {
  const start = globePosition(from.lat, from.lon, 1);
  const end = globePosition(to.lat, to.lon, 1);
  const points = Array.from({ length: 41 }, (_, index) => {
    const t = index / 40;
    return new THREE.Vector3()
      .lerpVectors(start, end, t)
      .normalize()
      .multiplyScalar(1.025 + Math.sin(t * Math.PI) * 0.19);
  });
  return new THREE.CatmullRomCurve3(points);
}
