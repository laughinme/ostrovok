import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

maplibregl.setWorkerUrl(workerUrl);
import { useEffect, useRef, useState } from 'react';

export interface MapPin { id: string; lngLat: [number, number]; label: string; top?: boolean; sub?: string }
export interface MapLine { coords: [number, number][]; color?: string; dashed?: boolean }
export interface MapPoi { lngLat: [number, number]; label: string; kind?: 'poi' | 'start' | 'end' }

const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export function MapView({ pins = [], line, pois = [], hover, onHover, onPick, className = '', fit = true, interactive = true }: {
  pins?: MapPin[]; line?: MapLine; pois?: MapPoi[]; hover?: string | null; onHover?: (id: string | null) => void; onPick?: (id: string) => void; className?: string; fit?: boolean; interactive?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, { m: maplibregl.Marker; el: HTMLElement }>());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const handlers = useRef({ onHover, onPick });
  handlers.current = { onHover, onPick };

  useEffect(() => {
    if (!box.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({ container: box.current, style: STYLE, center: [39.75, 43.58], zoom: 10, attributionControl: { compact: true }, interactive, cooperativeGestures: false });
    } catch { setFailed(true); return; }
    map.current = m;
    if (interactive) m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    m.on('load', () => setReady(true));
    m.on('error', () => { if (!m.isStyleLoaded()) setFailed(true); });
    m.on('styledata', () => setFailed(false));
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; markers.current.clear(); };
  }, [interactive]);

  // метки отелей
  const pinKey = pins.map((p) => `${p.id}:${p.label}:${p.top}`).join('|');
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    pins.forEach((p, i) => {
      seen.add(p.id);
      let rec = markers.current.get(p.id);
      if (!rec) {
        // MapLibre двигает внешний элемент через transform, поэтому анимируем и красим внутренний
        const el = document.createElement('div');
        el.className = 'pin-w';
        const inner = document.createElement('button');
        inner.type = 'button';
        inner.className = 'pin';
        inner.style.animationDelay = `${120 + i * 50}ms`;
        el.appendChild(inner);
        el.addEventListener('mouseenter', () => handlers.current.onHover?.(p.id));
        el.addEventListener('mouseleave', () => handlers.current.onHover?.(null));
        el.addEventListener('click', () => handlers.current.onPick?.(p.id));
        rec = { m: new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(p.lngLat).addTo(m), el };
        markers.current.set(p.id, rec);
      }
      const inner = rec.el.firstElementChild as HTMLElement;
      inner.innerHTML = `<b>${p.label}</b>${p.sub ? `<span>${p.sub}</span>` : ''}`;
      inner.classList.toggle('is-top', !!p.top);
      inner.setAttribute('aria-label', `${p.sub ?? ''} ${p.label}`);
    });
    for (const [id, rec] of markers.current) if (!seen.has(id)) { rec.m.remove(); markers.current.delete(id); }
    if (fit && pins.length > 1) {
      const b = new maplibregl.LngLatBounds(pins[0].lngLat, pins[0].lngLat);
      pins.forEach((p) => b.extend(p.lngLat));
      m.fitBounds(b, { padding: { top: 70, bottom: 40, left: 50, right: 50 }, duration: 0, maxZoom: 13 });
    } else if (pins.length === 1 && !line) m.jumpTo({ center: pins[0].lngLat, zoom: 15 });
  }, [pinKey, fit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { for (const [id, rec] of markers.current) { rec.el.firstElementChild?.classList.toggle('hl', id === hover); rec.el.style.zIndex = id === hover ? '3' : ''; } }, [hover]);

  // маршрут и точки по пути
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !line) return;
    const data = { type: 'Feature', properties: {}, geometry: { type: 'LineString' as const, coordinates: line.coords } };
    if (m.getSource('route')) (m.getSource('route') as maplibregl.GeoJSONSource).setData(data);
    else {
      m.addSource('route', { type: 'geojson', data });
      m.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 9 } });
      m.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': line.color ?? '#1B4DE4', 'line-width': 5, ...(line.dashed ? { 'line-dasharray': [1, 1.5] } : {}) } });
    }
    const b = new maplibregl.LngLatBounds(line.coords[0], line.coords[0]);
    line.coords.forEach((c) => b.extend(c));
    m.fitBounds(b, { padding: 50, duration: 0 });
    const ms = pois.map((p) => {
      const el = document.createElement('div');
      el.className = `poi poi-${p.kind ?? 'poi'}`;
      el.innerHTML = `<i></i><span>${p.label}</span>`;
      return new maplibregl.Marker({ element: el, anchor: 'left', offset: [-7, 0] }).setLngLat(p.lngLat).addTo(m);
    });
    return () => ms.forEach((x) => x.remove());
  }, [ready, line, pois]);

  return (
    <div className={`mapview ${className}`}>
      <div ref={box} className="mapview-c" />
      {failed && <div className="map-fallback">Карта не загрузилась: нужен доступ к tiles.openfreemap.org</div>}
    </div>
  );
}
