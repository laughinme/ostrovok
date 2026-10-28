import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { tripsQuery } from "@/features/manage-trips";
import type { Hotel } from "@/entities/hotel";
import { demoApi } from "@/entities/session";
import type { components } from "@/shared/api";
import type { RatePlan, RoomType } from "../model/types";
import { rub } from "../lib/format";
import { Mark } from "./detail-ui";
import { tripDates } from "../model/geo";

export function BookingRequest({
  hotel,
  room,
  rate,
}: {
  hotel: Hotel;
  room: RoomType;
  rate: RatePlan;
}) {
  const queryClient = useQueryClient();
  const dates = tripDates(hotel.searchContext?.trip);
  const [checkIn, setCheckIn] = useState(dates.from);
  const [checkOut, setCheckOut] = useState(dates.to);
  const [adults, setAdults] = useState(
    hotel.searchContext?.trip.adults ?? Math.min(2, room.capacity ?? 2),
  );
  const [children, setChildren] = useState(hotel.searchContext?.trip.children ?? 0);
  const [request, setRequest] = useState(room.request ?? "");
  const nights = Math.max(0, (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
  const booking = useMutation({
    onSuccess: () => {
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
      <h2>{booking.isSuccess ? "Демо-заявка создана" : "Бронь в один шаг"}</h2>
      <p>
        {hotel.name} · {room.name}
      </p>
      <div className="booking-summary">
        <b>{rub(rate.price * nights)}</b>
        <span>
          за {nights} ночей · {rate.meal}
        </span>
      </div>
      <p>
        {rate.cancel} · {rate.pay}
      </p>
      {booking.data ? (
        <div role="status" className="verdict-box">
          <Mark v="yes" />
          <span>
            Заявка {booking.data.id} сохранена. Статус: запрос отправлен демо-отельеру. Оплата не
            списывается.
            <Link to="/trips/$id" params={{ id: booking.data.id }} className="btn btn-primary">
              Открыть поездку
            </Link>
          </span>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label>
            Заезд
            <input
              type="date"
              required
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
            />
          </label>
          <label>
            Выезд
            <input
              type="date"
              required
              min={checkIn}
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </label>
          <label>
            Взрослые
            <input
              type="number"
              required
              min={1}
              max={10}
              value={adults}
              onChange={(event) => setAdults(Number(event.target.value))}
            />
          </label>
          <label>
            Дети
            <input
              type="number"
              required
              min={0}
              max={10}
              value={children}
              onChange={(event) => setChildren(Number(event.target.value))}
            />
          </label>
          <label>
            Пожелания к номеру
            <textarea
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              rows={4}
              maxLength={4000}
            />
          </label>
          <p className="sub">
            Демо-вход: Анна. Заявка сохранится в сервисе, ответ отеля симулируется.
          </p>
          {booking.error && <p role="alert">{booking.error.message}</p>}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={booking.isPending || nights <= 0}
          >
            {booking.isPending ? "Отправляем…" : "Создать демо-заявку"}
          </button>
        </form>
      )}
    </div>
  );
}
