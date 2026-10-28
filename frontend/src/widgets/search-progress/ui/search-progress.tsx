import type { FlightDeparture } from "@/features/search-flight";
import { TravelAirplane } from "@/shared/ui";
import { useEffect, useRef } from "react";
import { startSearchFlight, type SearchFlightController } from "./search-flight-motion";
import { VectorEarth } from "./vector-earth";
import "./search-progress.css";

export function SearchProgress({
  active = true,
  title = "Загружаем данные",
  departure,
}: {
  active?: boolean;
  title?: string;
  departure?: FlightDeparture | undefined;
}) {
  const scene = useRef<HTMLElement>(null);
  const controller = useRef<SearchFlightController | null>(null);

  useEffect(() => {
    if (!scene.current) return;
    const flight = startSearchFlight(scene.current, departure);
    controller.current = flight;
    return () => {
      flight.stop();
      controller.current = null;
    };
  }, [departure]);

  useEffect(() => {
    if (active) controller.current?.resume();
    else controller.current?.finish();
  }, [active]);

  return (
    <section ref={scene} className="search-flight-screen" aria-label={title}>
      <div className="search-flight-art" aria-hidden="true">
        <div className="search-flight-earth">
          <VectorEarth />
        </div>
        <div className="search-flight-plane">
          <TravelAirplane className="search-flight-airplane" />
        </div>
      </div>
      <section className="search-flight-copy" role="status" aria-live="polite">
        <h1>{title}</h1>
        <div
          className="search-flight-progress"
          role="progressbar"
          aria-label={title}
          aria-valuetext={active ? "Загрузка продолжается" : "Готово"}
          aria-valuenow={active ? undefined : 100}
        >
          <span />
        </div>
      </section>
    </section>
  );
}
