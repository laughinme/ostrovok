import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/trips_/$id")({
  beforeLoad: ({ params }) => {
    if (params.id !== "mayak") throw notFound();
    throw redirect({ to: "/trips", replace: true });
  },
});
