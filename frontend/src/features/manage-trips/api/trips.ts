import { queryOptions } from "@tanstack/react-query";
import { sessionApi } from "@/entities/session";
import type { components } from "@/shared/api";

export type Trip = components["schemas"]["TripOut"];
export type TripSummary = components["schemas"]["TripSummaryOut"];
export type Booking = Trip["booking"];
export type Feedback = components["schemas"]["FeedbackIn"];

export const tripsQuery = queryOptions({
  queryKey: ["trips"],
  queryFn: () => sessionApi<TripSummary[]>("/me/trips?limit=100"),
});

export function tripQuery(id: string) {
  return queryOptions({
    queryKey: ["trips", id],
    queryFn: () => sessionApi<Trip>(`/trips/${encodeURIComponent(id)}`),
    refetchInterval: (query) => (query.state.data?.booking.status === "requested" ? 2000 : false),
  });
}

export function sendTripFeedback(id: string, feedback: Feedback) {
  return sessionApi<void>(`/trips/${encodeURIComponent(id)}/feedback`, {
    method: "POST",
    body: feedback,
  });
}
