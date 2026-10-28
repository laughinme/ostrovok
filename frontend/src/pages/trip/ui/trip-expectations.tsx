import { Footprints, Sun, Waves } from "lucide-react";
import { promisedQuestions, sunsetTime, tripDate, type Trip } from "@/features/manage-trips";

function temperature(value: number | null | undefined) {
  return value == null ? "Нет данных" : `${Math.round(value)} °C`;
}

export function TripExpectations({ trip }: { trip: Trip }) {
  const { climate, beachRoute: route, sunsets, facts } = trip;
  const promises = promisedQuestions(trip.promised);
  const caveats = [
    ...new Set([...trip.caveats, ...(climate?.caveats ?? []), ...(route?.caveats ?? [])]),
  ];
  const first = sunsets[0];
  const last = sunsets.at(-1);
  return (
    <section>
      <h2 className="h-md">Что вас ждёт</h2>
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
      <h2 className="h-md">Ожидания при бронировании</h2>
      <p className="muted">Снимок фактов на момент заявки. Ответ отеля указан в билете.</p>
      {promises.length ? (
        <ul className="trip-facts card-w">
          {promises.map((promise) => (
            <li key={promise.id}>
              {promise.statement}
              <p className="muted">{promise.scopeText}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="trip-notice muted">Для этой заявки обещанные факты не сохранены.</p>
      )}
      <details className="trip-notice card-w">
        <summary>Актуальные факты об отеле · {facts.length}</summary>
        {facts.length ? (
          <ul className="trip-facts">
            {facts.map((fact) => (
              <li key={fact.id}>
                <b>{fact.statement}</b>
                <p className="muted">
                  {fact.scopeText} · {fact.sourceLabel} · {fact.confidenceLabel}
                  {fact.isDemo ? " · демо" : ""}
                  {fact.status === "stale"
                    ? " · данные устарели"
                    : fact.status === "conflict"
                      ? " · источники расходятся"
                      : ""}
                </p>
                {fact.caveats.map((caveat, index) => (
                  <p className="muted" key={index}>
                    {caveat}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Актуальные факты пока отсутствуют.</p>
        )}
      </details>
      {caveats.length > 0 && (
        <aside className="trip-notice card-w" aria-label="Оговорки к данным поездки">
          <h3>Что важно учесть</h3>
          <ul className="trip-facts">
            {caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </aside>
      )}
    </section>
  );
}
