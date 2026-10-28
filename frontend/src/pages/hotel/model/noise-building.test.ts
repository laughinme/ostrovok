import { describe, expect, it } from "vitest";
import { OrthographicCamera, Vector3 } from "three";
import {
  noiseBuilding,
  noiseCameraFit,
  noiseWindowHeight,
  NOISE_FLOOR_HEIGHT,
  NOISE_BUILDING_BASE,
} from "./noise-building";

describe("noise model storeys", () => {
  it("changes wall height proportionally without limiting hotels to three through eight floors", () => {
    expect(noiseBuilding(1).floors).toBe(1);
    expect(noiseBuilding(20).floors).toBe(20);
    expect(noiseBuilding(3).height / noiseBuilding(8).height).toBeCloseTo(3 / 8);
    expect(noiseBuilding(20).top).toBeGreaterThan(noiseBuilding(8).roofTop);
  });
  it("keeps equally spaced windows inside each storey", () => {
    for (const count of [1, 3, 8, 20, 40]) {
      for (let floor = 0; floor < count; floor++) {
        const center = noiseWindowHeight(floor);
        expect(center - 0.115).toBeGreaterThan(NOISE_BUILDING_BASE + floor * NOISE_FLOOR_HEIGHT);
        expect(center + 0.115).toBeLessThan(NOISE_BUILDING_BASE + (floor + 1) * NOISE_FLOOR_HEIGHT);
        if (floor) expect(center - noiseWindowHeight(floor - 1)).toBeCloseTo(NOISE_FLOOR_HEIGHT);
      }
    }
  });
  it("normalizes missing or invalid floor counts to one storey", () => {
    for (const count of [0, -3, NaN, Infinity]) expect(noiseBuilding(count).floors).toBe(1);
  });
});

describe("noise model framing", () => {
  it("keeps the platform, trees and roof inside the frame at every facade on desktop and mobile", () => {
    for (const [width, height] of [
      [720, 480],
      [358, 288],
    ]) {
      for (const floors of [1, 3, 8, 20, 40]) {
        const shape = noiseBuilding(floors);
        const fit = noiseCameraFit(floors, width!, height!);
        const camera = new OrthographicCamera(
          -width! / 2,
          width! / 2,
          height! / 2,
          -height! / 2,
          0.1,
          fit.far,
        );
        camera.zoom = fit.zoom;
        camera.position.set(7, fit.targetY + 4.8, 8);
        camera.lookAt(0, fit.targetY, 0);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        const points: Vector3[] = [];
        for (const x of [-3.6, 3.6])
          for (const z of [-3.2, 3.2])
            for (const y of [-0.335, 0.08]) points.push(new Vector3(x, y, z));
        for (let side = 0; side < 16; side++) {
          const angle = (side * Math.PI) / 8;
          points.push(new Vector3(Math.sin(angle) * 2.12, shape.roofTop, Math.cos(angle) * 2.12));
          points.push(new Vector3(Math.sin(angle) * 3.8, 1.5, Math.cos(angle) * 3.8));
        }
        for (let yaw = 0; yaw < 8; yaw++)
          for (const point of points) {
            const screen = point
              .clone()
              .applyAxisAngle(new Vector3(0, 1, 0), (yaw * Math.PI) / 4)
              .project(camera);
            expect(Math.abs(screen.x)).toBeLessThan(0.91);
            expect(Math.abs(screen.y)).toBeLessThan(0.91);
            expect(screen.z).toBeGreaterThan(-1);
            expect(screen.z).toBeLessThan(1);
          }
      }
    }
  });
});
