import type { Hotel } from "@/entities/hotel";
import { useGeoQuery } from "../lib/use-geo-query";
import { elevationPath, numberLabel, type RouteData } from "../model/geo";
import { DetailMap } from "./detail-map";
import { GeoNotes, GeoStatus } from "./geo-status";

export function BeachSection({ hotel }: { hotel: Hotel }) {
  const query = useGeoQuery<RouteData>(hotel.id, "routes/beach?profile=walk", !!hotel.backend);
  const route = query.data;
  const path = route ? elevationPath(route.elevationProfile) : "";
  const heights =
    route?.elevationProfile.flatMap(([, height]) => (height == null ? [] : [height])) ?? [];
  return (
    <section className="row-panel card-w morning" id="morning" ref={query.ref}>
      <div className="rp-media">{route && <DetailMap hotel={hotel} route={route} />}</div>
      <div className="rp-side">
        <div className="rp-h">
          <h3>Дорога к морю</h3>
        </div>
        <GeoStatus
          pending={query.isLoading}
          error={query.error}
          retry={query.refetch}
          available={!!hotel.backend}
        />
        {route && (
          <>
            <p className="sub">
              {route.targetName ?? "Пляж"} · {numberLabel(route.there.lengthM, " м пешком")}
            </p>
            {path ? (
              <>
                <svg
                  className="elev"
                  viewBox="0 0 400 115"
                  role="img"
                  aria-label="Рассчитанный профиль высоты маршрута"
                >
                  <path
                    d={path}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <text x="10" y="12" fontSize="11" fill="var(--muted)">
                    {numberLabel(Math.min(...heights), " м")} –{" "}
                    {numberLabel(Math.max(...heights), " м")}
                  </text>
                  <text x="10" y="110" fontSize="11" fill="var(--muted)">
                    отель
                  </text>
                  <text x="390" y="110" fontSize="11" fill="var(--muted)" textAnchor="end">
                    пляж
                  </text>
                </svg>
                <p className="sub">Высота над уровнем моря; разрывы — нет данных</p>
              </>
            ) : (
              <p className="geo-status">Нет данных профиля высоты</p>
            )}
            <div className="times num">
              <div>
                <b>{numberLabel(route.there.minutes, " мин")}</b>
                <span>туда</span>
              </div>
              <div>
                <b>{numberLabel(route.back.minutes, " мин")}</b>
                <span>обратно</span>
              </div>
            </div>
            <dl className="geo-route-stats">
              {(
                [
                  ["Подъём", "climbM", " м"],
                  ["Спуск", "descentM", " м"],
                  ["Ступени", "steps", ""],
                  ["Переходы", "crossings", ""],
                ] as const
              ).map(([label, key, unit]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {numberLabel(route.there[key], unit)} туда ·{" "}
                    {numberLabel(route.back[key], unit)} обратно
                  </dd>
                </div>
              ))}
            </dl>
            <p className="sub">
              {route.estimated ? "Оценочный маршрут" : "Маршрут по пешеходной сети"} ·
              неопределённость{" "}
              {numberLabel(
                route.uncertainShare == null ? null : route.uncertainShare * 100,
                "% пути",
              )}
            </p>
            <GeoNotes caveats={route.caveats} attribution={route.attribution} />
          </>
        )}
      </div>
    </section>
  );
}
