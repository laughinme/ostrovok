import type { TripRecord } from "../model/trip";
import {
  ArrowDown,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Users,
  X,
} from "lucide-react";
import { TravelAirplane } from "@/shared/ui";
import "./trip-ticket.css";

const FACADES = { NE: "СВ", SE: "ЮВ", SW: "ЮЗ", NW: "СЗ" };
const STATUS = {
  confirmed: "Отель подтвердил",
  requested: "Ждём подтверждения",
  completed: "Поездка завершена",
  alternative_offered: "Отель предложил вариант",
  declined: "Отель не подтвердил",
};
function date(value: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("ru-RU", options);
}
export function TripTicket({
  trip: item,
  expanded,
  onToggle,
}: {
  trip: TripRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const nights = Math.round((Date.parse(item.checkOut) - Date.parse(item.checkIn)) / 86400000);
  const StatusIcon =
    item.status === "declined"
      ? X
      : item.status === "requested" || item.status === "alternative_offered"
        ? Clock3
        : Check;
  return (
    <article
      className={`trip-ticket trip-ticket--${item.status}`}
      aria-labelledby={`ticket-${item.id}`}
    >
      <div className="ticket-photo">
        <img src={item.hotel.photos[0]} alt={item.hotel.name} width={360} height={420} />
        <span>
          <MapPin size={13} />
          {item.destination}
        </span>
      </div>
      <div className="ticket-content">
        <div className="ticket-topline">
          <span>
            О!кно <i>/</i> билет на отдых
          </span>
          <span className="ticket-status">
            <StatusIcon size={13} />
            {STATUS[item.status]}
          </span>
        </div>
        <h2 id={`ticket-${item.id}`}>{item.hotel.name}</h2>
        <p className="ticket-room-name">{item.hotel.bestRoom}</p>
        <div className="ticket-dates">
          <div>
            <span>Заезд</span>
            <b>{date(item.checkIn, { day: "numeric", month: "short" })}</b>
          </div>
          <div className="ticket-flight-line">
            <span />
            <TravelAirplane />
            <span />
          </div>
          <div>
            <span>Выезд</span>
            <b>{date(item.checkOut, { day: "numeric", month: "short" })}</b>
          </div>
          <small>
            {nights}{" "}
            {nights % 100 >= 11 && nights % 100 <= 14
              ? "ночей"
              : nights % 10 === 1
                ? "ночь"
                : nights % 10 >= 2 && nights % 10 <= 4
                  ? "ночи"
                  : "ночей"}
          </small>
        </div>
        <div className="ticket-bottomline">
          <span>
            <Users size={15} />
            {item.guests}
          </span>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`trip-details-${item.id}`}
            onClick={onToggle}
          >
            {expanded ? "Скрыть детали" : "Детали поездки"}
            <ArrowDown size={15} className={expanded ? "is-expanded" : ""} />
          </button>
        </div>
      </div>
      <aside className="ticket-stub" aria-label="Данные размещения">
        <div className="ticket-stub-heading">
          <span>ПОСАДОЧНЫЙ НА ОТДЫХ</span>
          <ArrowUpRight size={18} />
        </div>
        <div className="ticket-stub-code">
          {item.bookingId ? "ОТДЫХ" : item.destination === "Красная Поляна" ? "ГОРЫ" : "МОРЕ"}
          <TravelAirplane />
        </div>
        <div className="ticket-room-grid">
          <div>
            <span>Номер</span>
            <b>{item.room ?? "—"}</b>
          </div>
          <div>
            <span>Этаж</span>
            <b>{item.floor ? String(item.floor).padStart(2, "0") : "—"}</b>
          </div>
          <div>
            <span>Сторона</span>
            <b>
              {item.status === "requested" || !item.hotel.bestFacade
                ? "—"
                : FACADES[item.hotel.bestFacade]}
            </b>
          </div>
        </div>
        <div className="ticket-barcode" aria-hidden="true" />
        <div className="ticket-serial">
          <span title={item.id}>{item.id}</span>
          <span>
            <CalendarDays size={10} />
            {date(item.checkIn, { year: "numeric" })}
          </span>
        </div>
      </aside>
    </article>
  );
}
