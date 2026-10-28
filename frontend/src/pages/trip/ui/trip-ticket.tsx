import type { Hotel } from "@/entities/hotel";
import {
  bookingStatus,
  tripDate,
  tripGuests,
  tripNights,
  type Booking,
} from "@/features/manage-trips";
import { Building2, Check, CircleHelp, X } from "lucide-react";
import "./trip-ticket.css";

function TicketPlane({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="currentColor" aria-hidden="true">
      <path d="M88 44 58 37 36 8H25l13 30-20 2-9-12H2l7 20-7 20h7l9-12 20 2-13 30h11l22-29 30-7c8-2 8-6 0-8Z" />
    </svg>
  );
}

export function TripTicket({ booking, hotel }: { booking: Booking; hotel: Hotel | undefined }) {
  const confirmed = booking.status === "confirmed" || booking.status === "completed";
  const StatusIcon = confirmed ? Check : booking.status === "declined" ? X : CircleHelp;
  const room = hotel?.backend?.rooms.find((item) => item.id === booking.roomTypeId);
  const nights = tripNights(booking);
  const status = bookingStatus[booking.status];
  const price = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(booking.priceDemo);

  return (
    <section className="trip-ticket" aria-labelledby="trip-ticket-heading">
      <div className="ticket-main">
        <div className="ticket-masthead">
          <span className="ticket-brand">
            О!кно<span>с Островком</span>
          </span>
          <span className="ticket-document">Посадочный на отдых</span>
        </div>

        <div className="ticket-hero">
          <div className="ticket-headline">
            <span className="ticket-label">Ваша поездка</span>
            <p className="ticket-slogan">
              КУРС
              <span>
                <TicketPlane />
                НА ОТДЫХ
              </span>
            </p>
            <span className="ticket-destination">
              <i />
              {hotel?.district ?? "Сочи"}
            </span>
          </div>
          <div className="ticket-hotel">
            <div className="ticket-hotel-photo">
              <Building2 size={48} aria-hidden="true" />
              <span>Фото отсутствует</span>
            </div>
            <h1 id="trip-ticket-heading">{hotel?.name ?? "Ваша поездка"}</h1>
            <p>{room?.name ?? "Категория номера уточняется"}</p>
          </div>
        </div>

        <dl className="ticket-details">
          <div>
            <dt>Заезд</dt>
            <dd>
              {tripDate(booking.checkIn)}
              <span>{tripDate(booking.checkIn, { year: "numeric", weekday: "long" })}</span>
            </dd>
          </div>
          <div>
            <dt>Выезд</dt>
            <dd>
              {tripDate(booking.checkOut)}
              <span>{tripDate(booking.checkOut, { year: "numeric", weekday: "long" })}</span>
            </dd>
          </div>
          <div>
            <dt>Пассажиры</dt>
            <dd>
              {tripGuests(booking.guests)}
              <span>Ночей в отеле: {nights}</span>
            </dd>
          </div>
        </dl>

        <ol className="ticket-statuses" aria-live="polite">
          <li className="is-done">
            <span className="ticket-status-icon">
              <Check size={12} aria-hidden="true" />
            </span>
            <div>
              <b>Демо-заявка сохранена</b>
              <span>Без оплаты</span>
            </div>
          </li>
          <li className="is-done">
            <span className="ticket-status-icon">
              <Check size={12} aria-hidden="true" />
            </span>
            <div>
              <b>Пожелания отправлены</b>
              <span>{booking.request || "Без дополнительных пожеланий"}</span>
            </div>
          </li>
          <li className={confirmed ? "is-done" : "is-pending"}>
            <span className="ticket-status-icon">
              <StatusIcon size={12} aria-hidden="true" />
            </span>
            <div>
              <b>{status}</b>
              <span>
                {booking.hotelReply ??
                  (booking.status === "requested"
                    ? "Демо-отель обычно отвечает за 5–30 секунд"
                    : "Ответ отеля пока не поступил")}
              </span>
            </div>
          </li>
        </ol>
      </div>

      <aside className="ticket-stub" aria-label="Корешок билета: даты и заявка">
        <div className="ticket-stub-top">
          <span>О!</span>
          <TicketPlane />
          <b>
            ВАШ ОТДЫХ
            <br />
            НАЧИНАЕТСЯ ЗДЕСЬ
          </b>
        </div>
        <div className="ticket-stub-date">
          <span>ДАТЫ ПОЕЗДКИ</span>
          <b>
            {tripDate(booking.checkIn, { month: "short" })} —{" "}
            {tripDate(booking.checkOut, { month: "short" })}
          </b>
          <small>
            {booking.checkIn.slice(0, 4)}
            {booking.checkIn.slice(0, 4) !== booking.checkOut.slice(0, 4)
              ? ` / ${booking.checkOut.slice(0, 4)}`
              : ""}{" "}
            · НОЧЕЙ: {nights}
          </small>
        </div>
        <div className="ticket-stub-price">
          <span>Стоимость · демо</span>
          <b>{price}</b>
          <small>За всю поездку · без оплаты</small>
        </div>
        <div className="ticket-window">
          <TicketPlane />
          <span>Демо-поездка · Анна</span>
        </div>
        <div className="ticket-stub-bottom">
          <span className={`ticket-stamp${confirmed ? " is-confirmed" : ""}`}>
            <StatusIcon size={13} aria-hidden="true" />
            {status}
          </span>
          <div className="ticket-barcode" aria-hidden="true" />
          <span className="ticket-code">{booking.id}</span>
        </div>
      </aside>
    </section>
  );
}
