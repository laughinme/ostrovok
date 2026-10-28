import { getFlightDeparture } from "@/features/search-flight";
import { useSearchFilters } from "@/features/hotel-search";
import { TravelAirplane } from "@/shared/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { startSearchFlight } from "./search-flight-motion";
import { VectorEarth } from "./vector-earth";
import "./search-progress.css";

export function SearchProgress({ query: q }: { query: string }) {
  useSearchFilters(q);
  const navigate = useNavigate();
  const scene = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!scene.current) return;
    return startSearchFlight(scene.current, getFlightDeparture(q), () => {
      void navigate({ to: "/results", search: { q }, replace: true });
    });
  }, [navigate, q]);

  return (
    <main ref={scene} className="search-flight-screen">
      <div className="search-flight-art" aria-hidden="true">
        <div className="search-flight-earth">
          <VectorEarth />
        </div>
        <div className="search-flight-plane">
          <TravelAirplane className="search-flight-airplane" />
        </div>
      </div>
      <section className="search-flight-copy" role="status" aria-live="polite">
        <h1>Подбираем ваш отдых</h1>
        <div
          className="search-flight-progress"
          role="progressbar"
          aria-label="Подбор отелей"
          aria-valuetext="Подбираем отели под ваш запрос"
        >
          <span />
        </div>
      </section>
    </main>
  );
}
