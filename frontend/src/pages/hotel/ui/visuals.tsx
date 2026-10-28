import { useEffect, useMemo, useRef, useState } from "react";
import type { Facade } from "../model/types";
import { drawBuilding, type SideStyle } from "../lib/building";
import { Panorama as DemoPanorama } from "@/shared/ui";
import { getApiMode } from "@/shared/api";

export function Panorama(props: {
  facade: Facade;
  floor: number;
  labels?: boolean;
  onReading?: (reading: { seaShare: number; sunVisible: boolean; mountains: boolean }) => void;
}) {
  if (props.facade === "N" || props.facade === "E" || props.facade === "S" || props.facade === "W")
    return <div className="map-fallback">Нет данных панорамы</div>;
  return <DemoPanorama {...props} facade={props.facade} />;
}

export function Building({
  name,
  sides,
  floors = 8,
  className = "",
}: {
  name: string;
  floors?: number;
  sides: Partial<Record<Facade, SideStyle>>;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const sideKey = JSON.stringify(sides);
  const colors = useMemo(
    () => JSON.parse(sideKey) as Partial<Record<Facade, SideStyle>>,
    [sideKey],
  );
  useEffect(() => {
    if (ref.current) drawBuilding(ref.current, { name, floors }).set(colors);
  }, [name, colors, floors]);
  return (
    <svg ref={ref} className={`bld ${className}`} role="img" aria-label={`Схема здания ${name}`} />
  );
}

export function Photo({
  k,
  alt,
  facade = "SW",
  floor = 5,
  className = "",
}: {
  k: string;
  alt: string;
  facade?: Facade;
  floor?: number;
  credit?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!k || failed)
    return (
      <div className={`ph ph-fallback ${className}`} role="img" aria-label={alt}>
        {getApiMode() === "demo" ? (
          <Panorama facade={facade} floor={floor} labels={false} />
        ) : (
          <span>Фото пока нет</span>
        )}
      </div>
    );
  return (
    <figure className={`ph ${className}`}>
      <img src={k} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </figure>
  );
}
