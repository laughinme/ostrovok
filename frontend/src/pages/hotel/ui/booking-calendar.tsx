import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import {
  addBookingDays,
  bookingDateLabel,
  bookingMonth,
  bookingMonthDays,
  selectBookingDate,
  type BookingDates,
} from "../model/booking-dates";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function BookingCalendar({
  value,
  min,
  onChange,
}: {
  value: BookingDates;
  min: string;
  onChange: (dates: BookingDates) => void;
}) {
  const [month, setMonth] = useState(() => bookingMonth(value.from || min));
  const [focused, setFocused] = useState(value.from || min);
  const [hover, setHover] = useState("");
  const preview = !value.to && hover > value.from ? hover : "";
  const end = value.to || preview;
  const title = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  const moveMonth = (offset: number) => {
    const next = bookingMonth(month, offset);
    setMonth(next);
    setFocused(next < min ? min : next);
    setHover("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    let next: string;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      next = addBookingDays(
        date,
        { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key] ?? 0,
      );
    } else if (event.key === "Home" || event.key === "End") {
      const day = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
      next = addBookingDays(date, event.key === "Home" ? -day : 6 - day);
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      next = bookingMonth(date, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
    } else return;
    event.preventDefault();
    next = next < min ? min : next;
    setFocused(next);
    if (bookingMonth(next) !== month) setMonth(bookingMonth(next));
    const calendar = event.currentTarget.closest(".booking-calendar");
    requestAnimationFrame(() =>
      calendar?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus(),
    );
  };
  return (
    <section
      className="booking-calendar"
      aria-label="Календарь поездки"
      onMouseLeave={() => setHover("")}
    >
      <div className="booking-calendar-top">
        <span aria-live="polite">{value.to ? "Ваши даты" : "Теперь выберите выезд"}</span>
        <div>
          <button
            type="button"
            aria-label="Предыдущий месяц"
            disabled={month <= bookingMonth(min)}
            onClick={() => moveMonth(-1)}
          >
            <ChevronLeft size={19} />
          </button>
          <button type="button" aria-label="Следующий месяц" onClick={() => moveMonth(1)}>
            <ChevronRight size={19} />
          </button>
        </div>
      </div>
      <p className="sr-only">
        Выберите заезд, затем выезд. Стрелки перемещают по дням, Page Up и Page Down - по месяцам.
      </p>
      <div className="booking-months">
        {[month, bookingMonth(month, 1)].map((current, monthIndex) => {
          const days = bookingMonthDays(current);
          return (
            <div
              className={`booking-month${monthIndex ? " booking-month-next" : ""}`}
              key={current}
            >
              <h3>{title(current)}</h3>
              <table aria-label={title(current)}>
                <thead>
                  <tr>
                    {weekdays.map((day) => (
                      <th scope="col" key={day}>
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }, (_, row) => (
                    <tr key={row}>
                      {days.slice(row * 7, row * 7 + 7).map((date, column) => {
                        if (!date) return <td key={column} />;
                        const start = date === value.from;
                        const finish = date === end;
                        const within = !!end && date > value.from && date < end;
                        const selected =
                          start || (!!value.to && date >= value.from && date <= value.to);
                        return (
                          <td
                            key={date}
                            className={`${within ? "is-within" : ""}${start && end ? " is-range-start" : ""}${finish ? " is-range-end" : ""}${preview && (within || finish) ? " is-preview" : ""}`}
                          >
                            <button
                              type="button"
                              data-day={date}
                              disabled={date < min}
                              tabIndex={date === focused ? 0 : -1}
                              aria-pressed={selected}
                              aria-current={date === min ? "date" : undefined}
                              aria-label={`${bookingDateLabel(date, true)}${start ? ", заезд" : date === value.to ? ", выезд" : ""}`}
                              className={start || date === value.to ? "is-endpoint" : ""}
                              onFocus={() => setFocused(date)}
                              onMouseEnter={() => setHover(date)}
                              onKeyDown={(event) => onKeyDown(event, date)}
                              onClick={() => {
                                setHover("");
                                setFocused(date);
                                onChange(selectBookingDate(value, date));
                              }}
                            >
                              {Number(date.slice(8))}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </section>
  );
}
