import { tripQuery, tripsQuery } from "@/features/manage-trips";
import type { components } from "@/shared/api";
import type { TripRecord } from "./trip";
import type { TripDetails } from "./expectations";

type Booking = components["schemas"]["BookingOut"];
export interface BookingTripSummary {
  booking: Booking;
  hotelName: string;
  hotelArea: string;
  createdAt: string;
}
export const bookingTripsQuery = tripsQuery;
export const bookingTripQuery = tripQuery;
export function bookingTripRecord(item: BookingTripSummary): TripRecord {
  const booking = item.booking;
  return {
    id: booking.id,
    bookingId: booking.id,
    hotelId: booking.hotelId,
    hotel: {
      name: item.hotelName,
      photos: ["/hotel-placeholder.svg"],
      bestFacade: null,
      bestRoom: "Ваше размещение",
      rooms: [{ name: "Ваше размещение", recommended: false, request: booking.request }],
    },
    destination: item.hotelArea,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: `${booking.guests.adults} взр.${booking.guests.children ? ` · ${booking.guests.children} дет.` : ""}`,
    status: booking.status,
    room: null,
    floor: null,
    highlights: [],
  };
}
