import { TripPage } from "@/pages/trip";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/trips_/$id")({
  beforeLoad: ({ params }) => {
    if (params.id === "mayak") throw redirect({ to: "/trips", replace: true });
  },
  component: TripRoute,
});

function TripRoute() {
  const { id } = Route.useParams();
  return <TripPage key={id} id={id} />;
}
