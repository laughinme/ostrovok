import type { Hotel } from "@/entities/hotel";
import type { RouteData } from "../model/geo";
import { RouteScheme } from "./route-scheme";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef, useState } from "react";
maplibregl.setWorkerUrl(workerUrl);
export default function RouteMap({ hotel, route }: { hotel: Hotel; route: RouteData }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    const coords = route.geometry.coordinates;
    if (coords.length < 2) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: hotel.lngLat,
        zoom: 15,
        interactive: false,
        attributionControl: { compact: true },
      });
    } catch {
      setFailed(true);
      return;
    }
    map.on("error", () => {
      if (!map.getStyle()) setFailed(true);
    });
    map.on("load", () => {
      setFailed(false);
      map.addSource("walking-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "walking-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#fff", "line-width": 9 },
      });
      map.addLayer({
        id: "walking-route",
        type: "line",
        source: "walking-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#1B4DE4", "line-width": 5 },
      });
    });
    const markers = [
      [coords[0]!, hotel.name],
      [coords.at(-1)!, route.targetName ?? "Пляж"],
    ] as const;
    for (const [point, name] of markers) {
      const element = document.createElement("div");
      element.className = "poi";
      const dot = document.createElement("i");
      const label = document.createElement("span");
      label.textContent = name;
      element.append(dot, label);
      new maplibregl.Marker({ element }).setLngLat(point).addTo(map);
    }
    const resize = () => {
      map.resize();
      const bounds = coords.reduce(
        (bounds, point) => bounds.extend(point),
        new maplibregl.LngLatBounds(),
      );
      bounds.extend(hotel.lngLat);
      map.fitBounds(bounds, { padding: 55, maxZoom: 17, duration: 0 });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container.current);
    resize();
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [hotel.lngLat, hotel.name, route.geometry.coordinates, route.targetName]);
  return (
    <>
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
      {failed && <RouteScheme route={route} />}
      <span className="route-note">
        {route.estimated ? "Оценочный маршрут · см. оговорки" : "Пеший маршрут по OSM"}
      </span>
    </>
  );
}
