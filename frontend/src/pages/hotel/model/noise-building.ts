export const NOISE_FLOOR_HEIGHT = 0.44;
export const NOISE_BUILDING_BASE = 0.25;
const PLATFORM_RADIUS = Math.hypot(3.6, 3.2);
const CAMERA_RISE = 4.8;
const CAMERA_DISTANCE = Math.hypot(7, 8);

export function noiseBuilding(floors: number) {
  const count = Number.isFinite(floors) ? Math.max(1, Math.round(floors)) : 1;
  const height = count * NOISE_FLOOR_HEIGHT;
  return {
    floors: count,
    height,
    center: NOISE_BUILDING_BASE + height / 2,
    top: NOISE_BUILDING_BASE + height,
    roofTop: NOISE_BUILDING_BASE + height + 0.69,
  };
}

export function noiseWindowHeight(floor: number) {
  return NOISE_BUILDING_BASE + (floor + 0.5) * NOISE_FLOOR_HEIGHT;
}

export function noiseCameraFit(floors: number, width: number, height: number) {
  const building = noiseBuilding(floors);
  const elevation = Math.atan2(CAMERA_RISE, CAMERA_DISTANCE);
  const sine = Math.sin(elevation),
    cosine = Math.cos(elevation);
  const low = -0.335 * cosine - PLATFORM_RADIUS * sine;
  const high = Math.max(
    building.roofTop * cosine + 2.12 * sine,
    1.5 * cosine + 3.8 * sine,
    0.08 * cosine + PLATFORM_RADIUS * sine,
  );
  return {
    targetY: (high + low) / (2 * cosine),
    zoom: Math.min(
      Math.max(1, width) / (PLATFORM_RADIUS * 2 * 1.15),
      Math.max(1, height) / ((high - low) * 1.18),
    ),
    far: Math.max(60, building.roofTop * 3),
  };
}
