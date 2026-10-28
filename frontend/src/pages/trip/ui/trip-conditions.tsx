import { Footprints, Sun, Waves } from "lucide-react";
import { sunsetTime, tripDate, type Trip } from "@/features/manage-trips";
function temperature(value: number | null | undefined) {
  return value == null ? "Нет данных" : `${Math.round(value)} °C`;
}
export function TripConditions({ trip }: { trip: Trip }) {
  const { climate, beachRoute: route, sunsets } = trip;
  const first = sunsets[0];
  const last = sunsets.at(-1);
  return (
    <section className="trip-conditions" aria-label="Условия в даты поездки">
      {" "}
      <div className="expect">
        <div className="card-w">
          <Sun size={22} aria-hidden="true" />
          <h3>Закаты в ваши даты</h3>
          <b className="num">
            {first ? sunsetTime(first.at) : "Нет данных"}
            {last && last !== first ? ` → ${sunsetTime(last.at)}` : ""}
          </b>
          <p>Время Сочи · астрономический закат, без учёта видимости из окна.</p>
          {sunsets.length > 0 && (
            <details>
              <summary>Время по дням</summary>
              <dl className="trip-sunsets">
                {sunsets.map((sunset) => (
                  <div key={sunset.date}>
                    <dt>{tripDate(sunset.date)}</dt>
                    <dd>
                      <time dateTime={sunset.at}>{sunsetTime(sunset.at)}</time>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
        <div className="card-w">
          <Waves size={22} aria-hidden="true" />
          <h3>Воздух и вода</h3>
          <b className="num">{temperature(climate?.values.airMaxC)}</b>
          <p>
            Дневной максимум · ночью {temperature(climate?.values.airMinC).toLowerCase()} · вода{" "}
            {temperature(climate?.values.waterC).toLowerCase()}.
          </p>
          <p>Климатические нормы, не прогноз погоды.</p>
          {climate && (
            <small className="muted">
              {climate.station} · {climate.period}
              <br />
              {climate.attribution}
            </small>
          )}
        </div>
        <div className="card-w">
          <Footprints size={22} aria-hidden="true" />
          <h3>Дорога к морю</h3>
          <b className="num">{route ? `${Math.round(route.there.minutes)} мин` : "Нет данных"}</b>
          {route ? (
            <>
              <p>
                {route.targetName ?? "До пляжа"} · обратно {Math.round(route.back.minutes)} мин.
                {route.estimated ? " Примерная оценка." : " Расчёт по пешеходному маршруту."}
              </p>
              <p>
                {route.there.lengthM != null && `${Math.round(route.there.lengthM)} м · `}
                {route.there.steps != null
                  ? `ступеней: ${route.there.steps}`
                  : "Число ступеней неизвестно"}
                {route.back.climbM != null &&
                  ` · подъём обратно ${Math.round(route.back.climbM)} м`}
              </p>
              <small className="muted">{route.attribution}</small>
            </>
          ) : (
            <p>Пеший маршрут для этого отеля пока не рассчитан.</p>
          )}
        </div>
      </div>
    </section>
  );
}
