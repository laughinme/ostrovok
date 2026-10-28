import type { Hotel } from "@/entities/hotel";
import type { components } from "@/shared/api";
import { useGeoQuery } from "../lib/use-geo-query";
import { numberLabel, tripDates } from "../model/geo";
import { GeoStatus } from "./geo-status";

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
    <section
      className="dates card-w"
      id="dates"
      ref={query.ref}
      aria-description={`Климатические нормы, не прогноз погоды. ${data?.attribution ?? ""}`}
    >
      <div className="rp-h">
        <h3>Ваши даты</h3>
      </div>
      <GeoStatus
        pending={query.isLoading}
        error={query.error}
        retry={query.refetch}
        available={!!hotel.backend}
      />
      {data && (
        <div className="days num geo-climate">
          {METRICS.map(([key, label, unit]) => (
            <div className="day" key={key}>
              <span className="d">{label}</span>
              <b>
                {numberLabel(data.values[key])}
                {data.values[key] != null && <small>{unit}</small>}
              </b>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
