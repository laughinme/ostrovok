import { useEffect, useMemo, useRef, useState } from "react";
import type { Facade } from "../model/types";
import { drawBuilding, type SideStyle } from "../lib/building";
import { Panorama as DemoPanorama } from "@/shared/ui";
import { photoInfo } from "@/entities/hotel";

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
  credit = true,
}: {
  k: string;
  alt: string;
  facade?: Facade;
  floor?: number;
  credit?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const info = photoInfo(k);
  if (!k || failed === k)
    return (
      <div className={`ph ph-fallback ${className}`}>
        <Panorama facade={facade} floor={floor} labels={false} />
      </div>
    );
  return (
    <figure className={`ph ${className}`}>
      <img
        key={k}
        src={k}
        alt={info?.alt ?? alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(k)}
      />
      {credit && info && <figcaption className="hotel-photo-label">{info.label}</figcaption>}
    </figure>
  );
}
