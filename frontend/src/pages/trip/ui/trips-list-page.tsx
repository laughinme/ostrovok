import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import {
  bookingStatus,
  newestTrips,
  tripDate,
  tripGuests,
  tripNights,
  tripsQuery,
} from "@/features/manage-trips";
import "./trip-page.css";

export function TripsListPage() {
  const trips = useQuery(tripsQuery);
  return (
    <div className="trips-screen">
      <main className="trip-page">
        <h1 className="h-md">Мои поездки</h1>
        <p className="muted">Заявки Анны · демо-бронирования без оплаты</p>
        {trips.isPending && (
          <p role="status" className="trip-notice">
            Загружаем поездки…
          </p>
        )}
        {trips.isError && (
          <div className="trip-notice" role="alert">
            <p>Не удалось загрузить поездки. {trips.error.message}</p>
            <button className="trip-action" onClick={() => void trips.refetch()}>
              Повторить
            </button>
          </div>
        )}
        {trips.data?.length === 0 && (
          <div className="card-w trip-notice">
            <p>Здесь появятся ваши поездки после отправки заявки отелю.</p>
            <Link to="/results" className="trip-action">
              Найти отель
            </Link>
          </div>
        )}
        {trips.data && trips.data.length > 0 && (
          <ul className="trip-list">
            {newestTrips(trips.data).map(({ booking, hotelName, hotelArea, createdAt }) => (
              <li key={booking.id}>
                <Link to="/trips/$id" params={{ id: booking.id }} className="trip-list-ticket">
                  <div>
                    <span className="muted">{hotelArea}</span>
                    <h2>{hotelName}</h2>
                    <p>
                      {tripDate(booking.checkIn, { year: "numeric" })} —{" "}
                      {tripDate(booking.checkOut, { year: "numeric" })}
                    </p>
                    <p className="muted">
                      {tripGuests(booking.guests)} · ночей: {tripNights(booking)}
                    </p>
                    <small className="muted">
                      Заявка от{" "}
                      {tripDate(createdAt, { year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </small>
                  </div>
                  <div className="trip-list-stub">
                    <span>{bookingStatus[booking.status]}</span>
                    <span>
                      Открыть поездку <ArrowUpRight size={18} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
