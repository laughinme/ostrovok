import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { RequestState } from "@/shared/ui";
import { bookingTripQuery } from "../model/booking-trips";
import { TripFeedback } from "./trip-feedback";
import { TripConditions } from "./trip-conditions";
import { TripExpectations } from "./trip-expectations";

export function TripBookingDetails({ id, post = false }: { id: string; post?: boolean }) {
  const query = useQuery(bookingTripQuery(id));
  return (
    <>
      <RequestState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data &&
        (post ? (
          <TripFeedback trip={query.data} />
        ) : (
          <>
            {query.data.booking.hotelReply && (
              <div className="trip-request">
                <MessageSquare size={19} />
                <div>
                  <b>Ответ отеля</b>
                  <p>{query.data.booking.hotelReply}</p>
                </div>
              </div>
            )}
            <TripConditions trip={query.data} />
            <TripExpectations
              data={{
                ...query.data,
                caveats: [
                  ...new Set([
                    ...query.data.caveats,
                    ...(query.data.climate?.caveats ?? []),
                    ...(query.data.beachRoute?.caveats ?? []),
                  ]),
                ],
              }}
              roomNames={{ [query.data.booking.roomTypeId]: "ваша категория номера" }}
            />
          </>
        ))}
    </>
  );
}
