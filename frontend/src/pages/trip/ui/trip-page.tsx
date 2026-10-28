import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { hotelQuery } from "@/entities/hotel";
import { tripQuery, type Trip } from "@/features/manage-trips";
import { ApiError } from "@/shared/api";
import { TripTicket } from "./trip-ticket";
import { TripExpectations } from "./trip-expectations";
import { TripFeedback } from "./trip-feedback";
import "./trip-page.css";

export function TripPage({ id }: { id: string }) {
  const trip = useQuery(tripQuery(id));
  const missing = trip.error instanceof ApiError && [404, 422].includes(trip.error.status);
  return (
    <div className="trips-screen">
      <main className="trip-page">
        <Link to="/trips" className="trip-back">
          ← Мои поездки
        </Link>
        {trip.isPending && (
          <p role="status" className="trip-notice">
            Загружаем поездку…
          </p>
        )}
        {trip.isError && (
          <div role="alert" className="trip-notice">
            <p>
              {missing
                ? "Поездка не найдена"
                : `Не удалось обновить поездку. ${trip.error.message}`}
            </p>
            {!missing && (
              <button className="trip-action" onClick={() => void trip.refetch()}>
                Повторить
              </button>
            )}
          </div>
        )}
        {trip.data && <TripDetails key={id} trip={trip.data} />}
      </main>
    </div>
  );
}

function TripDetails({ trip }: { trip: Trip }) {
  const hotel = useQuery(hotelQuery(trip.booking.hotelId));
  const [post, setPost] = useState(false);
  return (
    <>
      <TripTicket booking={trip.booking} hotel={hotel.data} />
      {hotel.isError && (
        <p className="muted">
          Название отеля не загрузилось.{" "}
          <button className="trip-action" onClick={() => void hotel.refetch()}>
            Повторить
          </button>
        </p>
      )}
      <div className="seg big-seg" aria-label="Этап поездки">
        <button
          type="button"
          aria-pressed={!post}
          className={!post ? "on" : ""}
          onClick={() => setPost(false)}
        >
          До поездки
        </button>
        <button
          type="button"
          aria-pressed={post}
          className={post ? "on" : ""}
          onClick={() => setPost(true)}
        >
          После поездки
        </button>
      </div>
      <div hidden={post}>
        <TripExpectations trip={trip} />
      </div>
      <div hidden={!post}>
        <TripFeedback trip={trip} />
      </div>
    </>
  );
}
