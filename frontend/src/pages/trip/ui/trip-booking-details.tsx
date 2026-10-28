import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { RequestState } from "@/shared/ui";
import { bookingTripQuery } from "../model/booking-trips";
import { TripExpectations } from "./trip-expectations";

export function TripBookingDetails({ id }: { id: string }) {
  const query = useQuery(bookingTripQuery(id));
  return (
    <>
      <RequestState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && (
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
          <TripExpectations
            data={query.data}
            roomNames={{ [query.data.booking.roomTypeId]: "ваша категория номера" }}
          />
        </>
      )}
    </>
  );
}
