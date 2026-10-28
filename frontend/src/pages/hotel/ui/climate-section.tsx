import type { Hotel } from "@/entities/hotel";
import type { components } from "@/shared/api";
import { useGeoQuery } from "../lib/use-geo-query";
import { dateLabel, numberLabel, tripDates } from "../model/geo";
import { GeoNotes, GeoStatus } from "./geo-status";

const METRICS = [
  ["airMaxC", "Воздух днём", "°C"],
  ["airMinC", "Воздух ночью", "°C"],
  ["waterC", "Вода", "°C"],
  ["sunHours", "Солнечное сияние", " ч/день"],
  ["daylightH", "Световой день", " ч/день"],
  ["rainDays", "Дождливые дни", " дн./месяц"],
] as const;
export function ClimateSection({ hotel }: { hotel: Hotel }) {
  const dates = tripDates(hotel.searchContext?.trip);
  const query = useGeoQuery<components["schemas"]["ClimateOut"]>(
    hotel.id,
    `climate?${new URLSearchParams({ from: dates.from, to: dates.to })}`,
    !!hotel.backend,
  );
  const data = query.data;
  return (
    <section className="dates card-w" id="dates" ref={query.ref}>
      <div className="rp-h">
        <h3>Ваши даты</h3>
        <span className="sub">Климатические нормы, не прогноз</span>
      </div>
      <p className="sub">
        {dateLabel(dates.from)} — {dateLabel(dates.to)} · выезд {dateLabel(dates.to)}
        {dates.fallback ? " · пример поездки: даты не заданы" : ""}
      </p>
      <GeoStatus
        pending={query.isLoading}
        error={query.error}
        retry={query.refetch}
        available={!!hotel.backend}
      />
      {data && (
        <>
          <div className="days num geo-climate">
            {METRICS.map(([key, label, unit]) => (
              <div className="day" key={key}>
                <span className="d">{label}</span>
                <b>
                  {numberLabel(data.values[key])}
                  {data.values[key] != null && <small>{unit}</small>}
                </b>
                <span>
                  Покрытие{" "}
                  {numberLabel(data.coverage[key] == null ? null : data.coverage[key] * 100, "%")}
                </span>
                <span>
                  Уверенность{" "}
                  {numberLabel(
                    data.confidence[key] == null ? null : data.confidence[key] * 100,
                    "%",
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="sub">
            Станция: {data.station} · период: {data.period} · {data.days} ночей. Дождливые дни —
            месячная норма, не вероятность дождя в поездке.
          </p>
          <GeoNotes attribution={data.attribution} caveats={data.caveats} />
        </>
      )}
    </section>
  );
}
