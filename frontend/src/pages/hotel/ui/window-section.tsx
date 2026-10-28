import { useState } from "react";
import type { Hotel } from "@/entities/hotel";
import { useGeoQuery } from "../lib/use-geo-query";
import {
  FACADE_LABEL,
  dateLabel,
  localTime,
  numberLabel,
  solarVisibility,
  tripDates,
  type GeoFacade,
  type WindowData,
} from "../model/geo";
import type { HotelDetails } from "../model/types";
import { WindowPanorama } from "./window-panorama";
import { GeoNotes, GeoStatus } from "./geo-status";

export function WindowSection({ hotel, detail }: { hotel: Hotel; detail: HotelDetails }) {
  const facades = hotel.backend?.facades ?? [];
  const [selectedFacade, setFacade] = useState<GeoFacade>(detail.bestFacade);
  const facade = facades.includes(selectedFacade) ? selectedFacade : facades[0];
  const [floor, setFloor] = useState(Math.min(detail.totalFloors, Math.max(1, detail.bestFloor)));
  const dates = tripDates(hotel.searchContext?.trip);
  const [selectedDate, setDate] = useState<string>();
  const date = selectedDate ?? dates.date;
  const query = useGeoQuery<WindowData>(
    hotel.id,
    `window?${new URLSearchParams({ facade: facade ?? "", floor: String(floor), date })}`,
    !!hotel.backend && !!facade && !!date,
  );
  const data = query.data;
  const known = data?.horizon.some((ray) => ray.kind !== "unknown" && ray.angleDeg != null);
  const rooms = detail.rooms.filter((room) => facade && room.facades.includes(facade));
  return (
    <section className="window-card card-w" id="window" ref={query.ref}>
      <div className="w-head">
        <h3>Ваше окно</h3>
        <div className="fac" role="group" aria-label="Сторона здания">
          {facades.map((value) => (
            <button
              key={value}
              className={facade === value ? "on" : ""}
              aria-pressed={facade === value}
              onClick={() => setFacade(value)}
            >
              {FACADE_LABEL[value]}
            </button>
          ))}
        </div>
        <label className="read geo-date">
          Дата{" "}
          <input
            type="date"
            aria-label="Дата вида из окна"
            value={date}
            onChange={(event) => {
              if (event.target.value) setDate(event.target.value);
            }}
          />
        </label>
      </div>
      <div className="w-stage">
        <GeoStatus
          pending={query.isLoading}
          error={query.error}
          retry={query.refetch}
          available={!!facade}
        />
        {data &&
          (known ? (
            <WindowPanorama data={data} />
          ) : (
            <p className="geo-status">Нет данных горизонта для этого окна</p>
          ))}
      </div>
      <div className="w-foot">
        <label className="floor">
          Этаж <b className="num">{floor}</b>
          <input
            type="range"
            min="1"
            max={detail.totalFloors}
            value={floor}
            onChange={(event) => setFloor(Number(event.target.value))}
            aria-label="Этаж"
          />
        </label>
        <span className="read">
          Море в{" "}
          <b>
            {known
              ? numberLabel(
                  data?.seaFraction == null ? null : data.seaFraction * 100,
                  "% направлений",
                )
              : "нет данных"}
          </b>
        </span>
        <span className="read">
          Минимальный этаж с морем:{" "}
          <b>
            {known
              ? data?.minimumSeaFloor == null
                ? "не найден"
                : data.minimumSeaFloor
              : "нет данных"}
          </b>
        </span>
      </div>
      {data && (
        <div className="geo-sun">
          {(["sunrise", "sunset"] as const).map((event) => (
            <div key={event}>
              <b>
                {event === "sunrise" ? "Восход" : "Закат"} ·{" "}
                {localTime(data[event].at, data.timezone)}
              </b>
              <span>
                {numberLabel(data[event].azimuthDeg, "°")} · {solarVisibility(data, event)}
              </span>
              <span>
                {event === "sunrise" ? "Появление в окне" : "Солнце скрывается"}:{" "}
                {(() => {
                  const point = event === "sunrise" ? data.appearance : data.disappearance;
                  return point
                    ? `${localTime(point.at, data.timezone)} · ${point.behind}`
                    : known
                      ? "не наблюдается"
                      : "нет данных";
                })()}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="w-note">
        <span>
          {dates.fallback && !selectedDate
            ? "Даты поездки не заданы; расчёт на середину ноября. "
            : ""}
          {dateLabel(date)} · время в Сочи.{" "}
          {rooms.length
            ? `На эту сторону выходят: ${rooms.map((room) => room.name).join(", ")}. Этаж и номер подтвердит отель.`
            : "Размещение номеров на этой стороне не подтверждено."}
        </span>
      </div>
      {data && <GeoNotes attribution={data.attribution} caveats={data.caveats} />}
    </section>
  );
}
