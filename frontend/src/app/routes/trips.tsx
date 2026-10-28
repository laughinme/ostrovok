import { TripsListPage } from "@/pages/trip";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/trips")({
  head: () => ({ meta: [{ title: "Мои поездки — О!кно" }] }),
  component: TripsListPage,
});
