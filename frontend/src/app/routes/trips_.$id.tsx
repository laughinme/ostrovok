import { TripPage } from "@/pages/trip";
import { SessionGate } from "@/features/authenticate";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/trips_/$id")({
  beforeLoad: ({ params }) => {
    if (params.id === "mayak") throw redirect({ to: "/trips", replace: true });
  },
  head: () => ({ meta: [{ title: "Детали брони - О!кно" }] }),
  component: BookingTripPage,
});

function BookingTripPage() {
  const { id } = Route.useParams();
  return (
    <SessionGate role="guest">
      <TripPage initialBookingId={id} />
    </SessionGate>
  );
}
