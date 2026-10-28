import type { TripHotel } from "../model/trip";
import { Check, CircleHelp } from "lucide-react";
import { Panorama } from "@/shared/ui";
import "./trip-ticket.css";

const FACADES = { NE: "СВ", SE: "ЮВ", SW: "ЮЗ", NW: "СЗ" };

function TicketPlane({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 96 96" fill="currentColor" aria-hidden="true">
      <path d="M88 44 58 37 36 8H25l13 30-20 2-9-12H2l7 20-7 20h7l9-12 20 2-13 30h11l22-29 30-7c8-2 8-6 0-8Z" />
    </svg>
  );
}

export function TripTicket({ hotel: h, confirmed }: { hotel: TripHotel; confirmed: boolean }) {
  const StatusIcon = confirmed ? Check : CircleHelp;
  const room = h.rooms.find((item) => item.recommended);
  const facade = FACADES[h.bestFacade];

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
              Сочи, Россия
            </span>
          </div>
          <div className="ticket-hotel">
            <div className="ticket-hotel-photo">
              <img src={h.photos[0]} alt={h.name} width={312} height={200} />
            </div>
            <h1 id="trip-ticket-heading">{h.name}</h1>
            <p>{room?.name ?? h.bestRoom}</p>
          </div>
        </div>

        <dl className="ticket-details">
          <div>
            <dt>Заезд</dt>
            <dd>
              10 ноября<span>2026 · вторник</span>
            </dd>
          </div>
          <div>
            <dt>Выезд</dt>
            <dd>
              15 ноября<span>2026 · воскресенье</span>
            </dd>
          </div>
          <div>
            <dt>Пассажиры</dt>
            <dd>
              2 взрослых<span>5 ночей в отеле</span>
            </dd>
          </div>
        </dl>

        <ol className="ticket-statuses" aria-live="polite">
          <li className="is-done">
            <span className="ticket-status-icon">
              <Check size={12} aria-hidden="true" />
            </span>
            <div>
              <b>Бронь оплачена</b>
              <span>Сегодня, 14:02</span>
            </div>
          </li>
          <li className="is-done">
            <span className="ticket-status-icon">
              <Check size={12} aria-hidden="true" />
            </span>
            <div>
              <b>Пожелания отправлены</b>
              <span>{room?.request ?? `${facade}-сторона · этаж ≥ 4`}</span>
              <small>14:02</small>
            </div>
          </li>
          <li className={confirmed ? "is-done" : "is-pending"}>
            <span className="ticket-status-icon">
              <StatusIcon size={12} aria-hidden="true" />
            </span>
            <div>
              <b>{confirmed ? "Отель подтвердил" : "Ждём подтверждения"}</b>
              <span>
                {confirmed ? `${facade}-сторона · 5 этаж · номер 512` : "Обычно до 2 часов"}
              </span>
              {confirmed && <small>Только что</small>}
            </div>
          </li>
        </ol>
      </div>

      <aside className="ticket-stub" aria-label="Корешок билета: даты и номер">
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
          <span>НОЯБРЬ / 2026</span>
          <b>10—15</b>
          <small>СОЧИ · 5 НОЧЕЙ</small>
        </div>
        <div className="ticket-stub-room">
          <div>
            <span>Номер</span>
            <b>{confirmed ? "512" : "—"}</b>
          </div>
          <div>
            <span>Этаж</span>
            <b>{confirmed ? "05" : "—"}</b>
          </div>
          <div>
            <span>Сторона</span>
            <b>{confirmed ? facade : "—"}</b>
          </div>
        </div>
        <div className="ticket-window">
          <Panorama facade={h.bestFacade} floor={5} labels={false} />
          <span>Ваше окно · расчёт</span>
        </div>
        <div className="ticket-stub-bottom">
          <span className={`ticket-stamp${confirmed ? " is-confirmed" : ""}`}>
            <StatusIcon size={13} aria-hidden="true" />
            {confirmed ? "ОТЕЛЬ ПОДТВЕРДИЛ" : "ПОДТВЕРЖДАЕМ"}
          </span>
          <div className="ticket-barcode" aria-hidden="true" />
          <span className="ticket-code">10NOV / 15NOV / 2ADT</span>
        </div>
      </aside>
    </section>
  );
}
