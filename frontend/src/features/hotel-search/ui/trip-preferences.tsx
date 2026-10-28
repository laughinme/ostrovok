import { useState } from "react";
import type { components } from "@/shared/api";

type Trip = components["schemas"]["TripModel"];

export function TripPreferences({ trip, onApply }: { trip: Trip; onApply: (trip: Trip) => void }) {
  const [from, setFrom] = useState(trip.from ?? "");
  const [to, setTo] = useState(trip.to ?? "");
  const [adults, setAdults] = useState(trip.adults ?? 2);
  const [children, setChildren] = useState(trip.children ?? 0);
  const invalid = !!from !== !!to || (!!from && to <= from);
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3"
      aria-label="Даты и гости"
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid)
          onApply({
            from: from || null,
            to: to || null,
            month: from ? Number(from.slice(5, 7)) : null,
            adults,
            children,
          });
      }}
    >
      <label className="grid gap-1 text-xs">
        Заезд
        <input
          type="date"
          className="min-h-11 rounded-xl border bg-card px-3"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs">
        Выезд
        <input
          type="date"
          className="min-h-11 rounded-xl border bg-card px-3"
          value={to}
          min={from || undefined}
          onChange={(event) => setTo(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs">
        Взрослые
        <input
          type="number"
          className="min-h-11 w-20 rounded-xl border bg-card px-3"
          min={1}
          max={10}
          required
          value={adults}
          onChange={(event) => setAdults(Number(event.target.value))}
        />
      </label>
      <label className="grid gap-1 text-xs">
        Дети
        <input
          type="number"
          className="min-h-11 w-20 rounded-xl border bg-card px-3"
          min={0}
          max={10}
          required
          value={children}
          onChange={(event) => setChildren(Number(event.target.value))}
        />
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-xl border bg-card px-4 text-sm disabled:opacity-50"
        disabled={invalid}
      >
        Применить
      </button>
      {invalid && (
        <p className="basis-full text-sm text-destructive" role="status">
          Укажите обе даты. Выезд должен быть позже заезда.
        </p>
      )}
    </form>
  );
}
