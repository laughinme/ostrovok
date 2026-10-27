import { useEffect, useRef, useState } from 'react';
import type { Facade } from '@/shared/model';
import { drawBuilding, type BuildingApi, type SideStyle } from '@/shared/lib/building';
import { drawPanorama, type PanoReading } from '@/shared/lib/panorama';
import { photo } from '@/shared/lib/photos';

/** Панорама «Ваше окно». Перерисовывается при смене фасада, этаж двигает дома плавно. */
export function Panorama({ facade, floor, labels = true, onReading, className = '' }: { facade: Facade; floor: number; labels?: boolean; onReading?: (r: PanoReading) => void; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const setFloor = useRef<((f: number) => PanoReading) | null>(null);
  const cb = useRef(onReading);
  cb.current = onReading;
  useEffect(() => {
    if (!ref.current) return;
    setFloor.current = drawPanorama(ref.current, facade, { labels });
    const id = requestAnimationFrame(() => { const r = setFloor.current?.(floor); if (r) cb.current?.(r); });
    return () => cancelAnimationFrame(id);
    // этаж применяется отдельным эффектом, чтобы не перерисовывать сцену
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facade, labels]);
  useEffect(() => { const r = setFloor.current?.(floor); if (r) cb.current?.(r); }, [floor]);
  return <svg ref={ref} className={`pano ${className}`} role="img" aria-label={`Вид из окна, фасад ${facade}, ${floor} этаж`} />;
}

export function Building({ name, sides, picked, onPick, className = '' }: { name: string; sides: Partial<Record<Facade, SideStyle>>; picked?: Facade | null; onPick?: (f: Facade) => void; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const api = useRef<BuildingApi | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  useEffect(() => {
    if (!ref.current) return;
    api.current = drawBuilding(ref.current, { name, onPick: pickRef.current ? (f) => pickRef.current?.(f) : undefined });
  }, [name]);
  const key = JSON.stringify(sides);
  useEffect(() => { api.current?.set(sides); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.current?.pick(picked ?? null, getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()); }, [picked]);
  return <svg ref={ref} className={`bld ${className}`} role="img" aria-label={`Схема здания ${name}`} />;
}

/** Фото с подписью-атрибуцией. Если демо-фото не скачано, показываем нашу визуализацию. */
export function Photo({ k, alt, facade = 'SW', floor = 5, credit = true, className = '' }: { k: string; alt: string; facade?: Facade; floor?: number; credit?: boolean; className?: string }) {
  const m = photo(k);
  const [failed, setFailed] = useState(false);
  if (!m || failed) return <div className={`ph ph-fallback ${className}`}><Panorama facade={facade} floor={floor} labels={false} /></div>;
  return (
    <figure className={`ph ${className}`}>
      <img src={m.src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      {credit && <figcaption title={`${m.title} · ${m.author} · ${m.license}`}>фото: {m.author.length > 28 ? m.author.slice(0, 26) + '…' : m.author} · {m.license}</figcaption>}
    </figure>
  );
}
