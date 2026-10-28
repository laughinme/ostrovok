import * as maplibre from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef, useState } from "react";
import type { Hotel } from "@/entities/hotel";
import type { RouteData } from "../model/geo";
import { routePrefix } from "../model/directions";
import { RouteScheme } from "./route-scheme";

maplibre.setWorkerUrl(workerUrl);

export default function DirectionsMap({
  hotel,
  route,
  destination,
  reducedMotion,
  reset,
  onPick,
}: {
  hotel: Hotel;
  route?: RouteData | undefined;
  destination?: [number, number] | undefined;
  reducedMotion: boolean;
  reset: number;
  onPick: (point: [number, number]) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibre.Map>(null);
  const pick = useRef(onPick);
  const targetMarker = useRef<maplibre.Marker>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);
  useEffect(() => {
    if (!container.current) return;
    setLoaded(false);
    let instance: maplibre.Map;
    try {
      instance = new maplibre.Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: hotel.lngLat,
        zoom: 15,
        scrollZoom: false,
        cooperativeGestures: true,
        attributionControl: { compact: true },
        locale: {
          "NavigationControl.ZoomIn": "Приблизить",
          "NavigationControl.ZoomOut": "Отдалить",
        },
      });
    } catch {
      setFailed(true);
      return;
    }
    map.current = instance;
    instance.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
    const origin = document.createElement("div");
    origin.className = "directions-pin directions-pin--hotel";
    const dot = document.createElement("i");
    const text = document.createElement("span");
    text.textContent = hotel.name;
    origin.append(dot, text);
    new maplibre.Marker({ element: origin }).setLngLat(hotel.lngLat).addTo(instance);
    const destinationElement = document.createElement("div");
    destinationElement.className = "directions-pin directions-pin--target";
    destinationElement.textContent = "Б";
    targetMarker.current = new maplibre.Marker({ element: destinationElement });
    instance.on("click", (event) => pick.current([event.lngLat.lng, event.lngLat.lat]));
    instance.on("error", () => {
      if (!instance.getStyle()) setFailed(true);
    });
    instance.on("load", () => {
      setFailed(false);
      setLoaded(true);
    });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      targetMarker.current = null;
    };
  }, [hotel.id, hotel.lngLat, hotel.name]);
  useEffect(() => {
    const instance = map.current;
    if (!instance || !loaded) return;
    const coordinates = route?.geometry.coordinates ?? [];
    const point = destination ?? coordinates.at(-1);
    if (point) targetMarker.current?.setLngLat(point).addTo(instance);
    else targetMarker.current?.remove();
    const geojson = (points: [number, number][]) => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: points },
    });
    if (!instance.getSource("hotel-directions")) {
      instance.addSource("hotel-directions", { type: "geojson", data: geojson([]) });
      instance.addLayer({
        id: "hotel-directions-case",
        type: "line",
        source: "hotel-directions",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 9 },
      });
      instance.addLayer({
        id: "hotel-directions-line",
        type: "line",
        source: "hotel-directions",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#2146e4", "line-width": 5 },
      });
    }
    instance.setPaintProperty(
      "hotel-directions-line",
      "line-dasharray",
      route?.estimated ? [1.5, 2] : [1, 0],
    );
    const source = instance.getSource("hotel-directions") as maplibre.GeoJSONSource;
    if (coordinates.length < 2) source.setData(geojson([]));
    const bounds = new maplibre.LngLatBounds(hotel.lngLat, hotel.lngLat);
    coordinates.forEach((coordinate) => bounds.extend(coordinate));
    if (point) bounds.extend(point);
    instance.fitBounds(bounds, { padding: 65, maxZoom: 17, duration: reducedMotion ? 0 : 750 });
    let frame = 0;
    const start = performance.now();
    const draw = (time: number) => {
      const progress = reducedMotion ? 1 : Math.min(1, (time - start) / 850);
      source.setData(geojson(routePrefix(coordinates, progress)));
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    if (coordinates.length >= 2) frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      instance.stop();
    };
  }, [loaded, route, destination, reducedMotion, reset, hotel.lngLat]);
  return (
    <>
      <div ref={container} className="directions-map-canvas" />
      {failed && (
        <div className="directions-map-fallback">
          {route ? (
            <RouteScheme route={route} />
          ) : (
            <p>Карта временно недоступна. Адрес отеля: {hotel.address}</p>
          )}
        </div>
      )}
    </>
  );
}
