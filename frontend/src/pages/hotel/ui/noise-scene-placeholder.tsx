import { noiseBuilding } from "../model/noise-building";

export function NoiseScenePlaceholder({ floors = 6 }: { floors?: number }) {
  const building = noiseBuilding(floors);
  const height = Math.min(280, 50 + building.height * 38);
  return (
    <div
      className="noise-scene-placeholder"
      role="img"
      aria-label={`Схематичный объёмный макет отеля. Этажей: ${building.floors}`}
    >
      <div className="noise-placeholder-platform" />
      <div
        className="noise-placeholder-building"
        style={{ height, top: "auto", bottom: "40%", transform: "translateX(-50%)" }}
      >
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
