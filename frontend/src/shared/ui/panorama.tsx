import { useEffect, useRef } from "react";
import { drawPanorama, type PanoReading } from "@/shared/lib";
type Facade = "NE" | "SE" | "SW" | "NW";

export function Panorama({
  facade,
  floor,
  labels = true,
  onReading,
  className = "",
}: {
  facade: Facade;
  floor: number;
  labels?: boolean;
  onReading?: (reading: PanoReading) => void;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const renderer = useRef<((floor: number) => PanoReading) | null>(null);
  useEffect(() => {
    if (ref.current) renderer.current = drawPanorama(ref.current, facade, { labels });
    return () => {
      renderer.current = null;
    };
  }, [facade, labels]);
  useEffect(() => {
    const reading = renderer.current?.(floor);
    if (reading) onReading?.(reading);
  }, [facade, floor, labels, onReading]);
  return (
    <svg
      ref={ref}
      className={`pano ${className}`}
      role="img"
      aria-label={`Вид из окна, фасад ${facade}, ${floor} этаж`}
    />
  );
}
