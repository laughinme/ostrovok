import { CalendarDays, Check, Minus, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { tripsQuery } from "@/features/manage-trips";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hotel } from "@/entities/hotel";
import { demoApi } from "@/entities/session";
import { getApiMode, type components } from "@/shared/api";
import type { RatePlan, RoomType } from "../model/types";
import { rub } from "../lib/format";
import { tripDates } from "../model/geo";
import { BookingCalendar } from "./booking-calendar";
import {
  addBookingDays,
  bookingDateLabel,
  bookingNightLabel,
  bookingNights,
  bookingToday,
} from "../model/booking-dates";

export function BookingRequest({
  hotel,
  room,
  rate,
  titleId,
}: {
  hotel: Hotel;
  room: RoomType;
  rate: RatePlan;
  titleId: string;
}) {
  const queryClient = useQueryClient();
  const dates = tripDates(hotel.searchContext?.trip);
  const [today] = useState(bookingToday);
  const [range, setRange] = useState(() => {
    const from = dates.from < today ? today : dates.from;
    return { from, to: dates.to > from ? dates.to : addBookingDays(from, 5) };
  });
  const checkIn = range.from;
  const checkOut = range.to;
  const capacity = room.capacity ?? 4;
  const [adults, setAdults] = useState(Math.min(hotel.searchContext?.trip.adults ?? 2, capacity));
  const designDemo = getApiMode() === "demo";
  const [children, setChildren] = useState(hotel.searchContext?.trip.children ?? 0);
  const [request, setRequest] = useState(room.request ?? "");
  const nights = bookingNights(range);
  const booking = useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trips", "guest_anna"] });
      void queryClient.invalidateQueries({ queryKey: tripsQuery.queryKey });
    },
    mutationFn: () => {
      if (!rate.id || !hotel.backend) throw new Error("Для этого номера нет тарифа на сервере");
      return demoApi<components["schemas"]["BookingOut"]>("guest_anna", "/bookings", "POST", {
        hotelId: hotel.id,
        roomTypeId: room.id,
        ratePlanId: rate.id,
        checkIn,
        checkOut,
        guests: { adults, children },
        ...(hotel.searchContext ? { searchId: hotel.searchContext.id } : {}),
        request,
      });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (nights > 0 && !booking.isPending && !booking.isSuccess) booking.mutate();
  };
  return (
    <div className="booking-request">
      <header className="booking-heading">
        <span className="booking-heading-icon">
          <CalendarDays size={21} />
        </span>
        <div>
          <h2 id={titleId}>{booking.isSuccess ? "Всё готово" : "Ваш следующий отдых"}</h2>
          <p>
            {hotel.name} · {room.name}
          </p>
        </div>
      </header>
      {booking.data ? (
        <div role="status" className="booking-success">
          <Check size={28} />
          <h3>Демо-заявка создана</h3>
          <p>
            {designDemo
              ? `Заявка ${booking.data.id} создана локально. В отель и LLM ничего не отправлено.`
              : `Заявка ${booking.data.id} сохранена. Статус: запрос отправлен демо-отельеру. Оплата не списывается.`}
          </p>
          {!designDemo && (
            <Link to="/trips/$id" params={{ id: booking.data.id }}>
              Открыть мою бронь →
            </Link>
          )}
        </div>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={booking.isPending} className="booking-fields">
            <div className="booking-date-summary" aria-live="polite">
              <div>
                <span>Заезд</span>
                <b>{bookingDateLabel(checkIn, true)}</b>
              </div>
              <span className="booking-date-connector" aria-hidden="true">
                →
              </span>
              <div>
                <span>Выезд</span>
                <b>{checkOut ? bookingDateLabel(checkOut, true) : "Выберите дату"}</b>
              </div>
              <span className="booking-duration">
                {nights ? bookingNightLabel(nights) : "Выберите период"}
              </span>
            </div>
            <BookingCalendar value={range} min={today} onChange={setRange} />
            <div className="booking-guest-row">
              <GuestCounter
                label="Взрослые"
                singular="взрослого"
                value={adults}
                min={1}
                max={capacity}
                onChange={setAdults}
              />
              <GuestCounter
                label="Дети"
                singular="ребёнка"
                value={children}
                min={0}
                max={10}
                onChange={setChildren}
              />
            </div>
            {(hotel.searchContext?.trip.adults ?? 0) > capacity && (
              <p role="note" className="booking-note">
                Этот номер рассчитан на {capacity} {capacity === 1 ? "гостя" : "гостей"}, а в поиске
                вас {hotel.searchContext?.trip.adults}. Выберите категорию просторнее.
              </p>
            )}
            <label className="booking-wishes">
              <span>
                Пожелания к номеру <small>необязательно</small>
              </span>
              <textarea
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Например, тихая сторона и подальше от лифта"
              />
            </label>
            <div className="booking-rate-conditions">
              <p>{rate.meal}</p>
              <p>
                {rate.cancel} · {rate.pay}
              </p>
            </div>
          </fieldset>
          <footer className="booking-footer">
            <div className="booking-total" aria-live="polite">
              <span>
                {nights ? `Итого за ${bookingNightLabel(nights)}` : "Сначала выберите период"}
              </span>
              <b>{nights ? rub(rate.price * nights) : "—"}</b>
            </div>
            <button
              className="booking-submit"
              type="submit"
              disabled={booking.isPending || nights <= 0}
            >
              {booking.isPending ? "Отправляем…" : "Создать демо-заявку"}
            </button>
            <p className="booking-note">
              {designDemo
                ? "Тестовый сценарий: заявка и ответ имитируются без отправки на сервер."
                : "Демо-вход: Анна. Заявка сохранится в сервисе, ответ отеля симулируется."}
            </p>
            {booking.error && (
              <p className="booking-error" role="alert">
                {booking.error.message}
              </p>
            )}
          </footer>
        </form>
      )}
    </div>
  );
}

function GuestCounter({
  label,
  singular,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  singular: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="booking-guest-counter">
      <label>
        <span>{label}</span>
        <input
          type="number"
          aria-label={label}
          min={min}
          max={max}
          required
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
      <div>
        <button
          type="button"
          aria-label={`Убрать ${singular}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus size={17} />
        </button>
        <button
          type="button"
          aria-label={`Добавить ${singular}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={17} />
        </button>
      </div>
    </div>
  );
}
