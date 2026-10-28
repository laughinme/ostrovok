import { queryOptions } from "@tanstack/react-query";
import { demoApi } from "@/entities/session";
import type { components } from "@/shared/api";

export type Trip = components["schemas"]["TripOut"];
export type TripSummary = components["schemas"]["TripSummaryOut"];
export type Booking = Trip["booking"];
export type Feedback = components["schemas"]["FeedbackIn"];

export const tripsQuery = queryOptions({
  queryKey: ["guest_anna", "trips"],
  queryFn: () => demoApi<TripSummary[]>("guest_anna", "/me/trips?limit=50"),
});

export function tripQuery(id: string) {
  return queryOptions({
    queryKey: ["guest_anna", "trips", id],
    queryFn: () => demoApi<Trip>("guest_anna", `/trips/${encodeURIComponent(id)}`),
    refetchInterval: (query) => (query.state.data?.booking.status === "requested" ? 2000 : false),
  });
}

export function sendTripFeedback(id: string, feedback: Feedback) {
  return demoApi<void>("guest_anna", `/trips/${encodeURIComponent(id)}/feedback`, "POST", feedback);
}
