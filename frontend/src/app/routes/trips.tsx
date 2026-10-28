import { TripsListPage } from "@/pages/trip";
import { SessionGate } from "@/features/authenticate";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/trips")({
  head: () => ({ meta: [{ title: "Мои поездки — О!кно" }] }),
  component: () => (
    <SessionGate role="guest">
      <TripsListPage />
    </SessionGate>
  ),
});
