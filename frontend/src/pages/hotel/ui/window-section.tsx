import { useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  BedDouble,
  CalendarDays,
  ChevronDown,
  Eye,
  Info,
  Minus,
  Plus,
  Sun,
  Waves,
} from "lucide-react";
import type { Hotel } from "@/entities/hotel";
import { getApiMode } from "@/shared/api";
import { readPanorama } from "@/shared/lib";
import { useGeoQuery } from "../lib/use-geo-query";
import {
  FACADE_ANGLE,
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
import { WindowMethodTooltip } from "./window-method-tooltip";
import { calculatedWindowView, demoWindowView } from "../model/window-view";
import { GeoNotes, GeoStatus } from "./geo-status";
import "./window-section.css";

const names: Record<GeoFacade, string> = {
  N: "Север",
  NE: "Северо-восток",
  E: "Восток",
  SE: "Юго-восток",
  S: "Юг",
  SW: "Юго-запад",
  W: "Запад",
  NW: "Северо-запад",
};
const demoFacades: GeoFacade[] = ["NE", "SE", "SW", "NW"];

export function WindowSection({ hotel, detail }: { hotel: Hotel; detail: HotelDetails }) {
  const demo = getApiMode() === "demo";
  const facades = demo ? demoFacades : (hotel.backend?.facades ?? []);
  const totalFloors = Math.max(1, detail.totalFloors);
  const [selectedFacade, setFacade] = useState<GeoFacade>(detail.bestFacade);
  const facade = facades.includes(selectedFacade) ? selectedFacade : facades[0];
  const [floor, setFloor] = useState(Math.min(totalFloors, Math.max(1, detail.bestFloor)));
  const dates = tripDates(hotel.searchContext?.trip);
  const [selectedDate, setDate] = useState<string>();
  const date = selectedDate ?? dates.date;
  const query = useGeoQuery<WindowData>(
    hotel.id,
    `window?${new URLSearchParams({ facade: facade ?? "", floor: String(floor), date })}`,
    !demo && !!hotel.backend && !!facade && !!date,
  );
  const data = demo ? undefined : query.data;
  const scene = demo
    ? demoWindowView(facade ?? "SW", floor)
    : calculatedWindowView({ facade: facade ?? "SW", floor, date }, data, hotel.backend?.facts);
  const known = scene.known;
  const demoFacade = facade === "NE" || facade === "SE" || facade === "NW" ? facade : "SW";
  const reading = readPanorama(demoFacade, floor);
  const rooms = detail.rooms.filter((room) => facade && room.facades.includes(facade));
  const metrics = [
    {
      label: "Море в окне",
      value: known
        ? demo
          ? `${reading.seaShare}%`
          : data
            ? numberLabel(data.seaFraction * 100, "%")
            : scene.sea.length
              ? "Видно"
              : "Нет данных"
        : "Нет данных",
      hint: demo
        ? "Демонстрационная оценка"
        : data?.minimumSeaFloor != null
          ? `Море видно с ${data.minimumSeaFloor} этажа`
          : "Доля направлений с морем",
      Icon: Waves,
    },
    {
      label: "Закат",
      value: demo
        ? reading.sunVisible
          ? "Виден"
          : "Не виден"
        : data
          ? solarVisibility(data, "sunset")
          : "Нет данных",
      hint: demo
        ? "Пример · 11 ноября, 16:58"
        : data
          ? `${localTime(data.sunset.at, data.timezone)} · время Сочи`
          : "Уточняем горизонт",
      Icon: Sun,
    },
    {
      label: "Горы",
      value: scene.mountains.length
        ? "Видны"
        : demo ||
            (data?.horizon.length &&
              data.horizon.every((ray) => ray.kind !== "unknown" && ray.angleDeg != null))
          ? "Не видны"
          : "Нет данных",
      hint: demo ? "Иллюстрация выбранной стороны" : "По расчёту для выбранного окна",
      Icon: Eye,
    },
  ];
  return (
    <section
      className="window-explorer"
      id="window"
      ref={query.ref}
      aria-labelledby="window-heading"
    >
      <header className="window-explorer-heading">
        <div>
          <div className="window-title-row">
            <h3 id="window-heading">Ваше окно</h3>
            <WindowMethodTooltip>
              {demo ? (
                <p>
                  Демонстрационная сцена. Расположение объектов и геометрия условные. ©
                  OpenStreetMap contributors · Copernicus DEM GLO-30.
                </p>
              ) : (
                <>
                  <p>
                    Иллюстрация собирается из готовых объектов: море, горы, дома и деревья. Они
                    появляются по расчёту видимости или фактам для выбранной стороны и этажа. Форма,
                    размер и расположение объектов условные: это не фотография из номера.
                    Заштрихованные участки означают, что данных не хватает.
                  </p>
                  <p>
                    {dates.fallback && !selectedDate
                      ? "Даты поездки не заданы; расчёт на середину ноября. "
                      : ""}
                    {dateLabel(date)} · время в Сочи.
                  </p>
                  {data && <GeoNotes attribution={data.attribution} caveats={data.caveats} />}
                </>
              )}
            </WindowMethodTooltip>
          </div>
        </div>
        {!demo && (
          <label className="window-date">
            <CalendarDays size={17} aria-hidden="true" />
            <span>
              Дата вида
              <input
                type="date"
                aria-label="Дата вида из окна"
                value={date}
                onChange={(event) => {
                  if (event.target.value) setDate(event.target.value);
                }}
              />
            </span>
          </label>
        )}
      </header>
      <div className="window-explorer-layout">
        <aside className="window-controls" aria-label="Настройки вида из окна">
          <div className="window-side-heading">
            <span>Сторона номера</span>
            <span className="window-north" aria-hidden="true">
              <ArrowUp size={13} />С
            </span>
          </div>
          <div className="window-directions" role="group" aria-label="Сторона здания">
            {facades.map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={facade === value}
                aria-label={`${FACADE_LABEL[value]} — ${names[value]}`}
                onClick={() => setFacade(value)}
              >
                <ArrowUp
                  size={16}
                  style={{ transform: `rotate(${FACADE_ANGLE[value]}deg)` }}
                  aria-hidden="true"
                />
                <span>
                  <b>{FACADE_LABEL[value]}</b>
                  <small>{names[value]}</small>
                </span>
              </button>
            ))}
            {!facades.length && (
              <p className="window-control-empty">Стороны здания пока не размечены.</p>
            )}
          </div>
          <div className="window-floor-control">
            <label htmlFor="window-floor">Этаж</label>
            <div className="window-floor-stepper">
              <button
                type="button"
                aria-label="Этаж ниже"
                disabled={floor <= 1}
                onClick={() => setFloor((value) => Math.max(1, value - 1))}
              >
                <Minus size={18} />
              </button>
              <span>
                <b>{floor}</b>
                <small>из {totalFloors}</small>
              </span>
              <button
                type="button"
                aria-label="Этаж выше"
                disabled={floor >= totalFloors}
                onClick={() => setFloor((value) => Math.min(totalFloors, value + 1))}
              >
                <Plus size={18} />
              </button>
            </div>
            <input
              id="window-floor"
              type="range"
              min="1"
              max={totalFloors}
              value={floor}
              disabled={totalFloors <= 1}
              onChange={(event) => setFloor(Number(event.target.value))}
              aria-label="Этаж"
              aria-valuetext={`${floor} этаж из ${totalFloors}`}
            />
            <div className="window-floor-scale" aria-hidden="true">
              <span>1</span>
              <span>{totalFloors}</span>
            </div>
          </div>
          <p className="window-control-note">
            <Info size={15} aria-hidden="true" />
            {demo
              ? "Иллюстрация помогает сравнить стороны. Это не фотография из номера."
              : "Выберите сторону и этаж: в окне появятся объекты, видимость которых подтверждают данные."}
          </p>
        </aside>
        <div className="window-preview">
          <div className="window-view-shell">
            <div className="window-view-caption">
              <span>{facade ? names[facade] : "Сторона не указана"}</span>
              <span>{floor} этаж</span>
            </div>
            <div className="window-frame window-frame-landscape">
              {known ? (
                <>
                  <div className="window-scene" key={`${facade}-${date}`}>
                    <WindowPanorama scene={scene} floor={floor} />
                  </div>
                  <span className="window-mullion" aria-hidden="true" />
                  <span className="window-handle" aria-hidden="true" />
                </>
              ) : (
                <div className="window-scene-state">
                  <Eye size={34} aria-hidden="true" />
                  <GeoStatus
                    pending={query.isLoading}
                    error={query.error}
                    retry={query.refetch}
                    available={!!facade}
                  />
                  {data && <p>Нет данных о виде из этого окна</p>}
                </div>
              )}
            </div>
            <div className="window-sill" aria-hidden="true" />
            <span className="window-scene-label">
              {demo ? "Демонстрационная иллюстрация" : "Условная иллюстрация по данным"}
            </span>
            {known && (
              <ul
                className="window-visible-objects"
                aria-label="Объекты в поле зрения"
                aria-live="polite"
              >
                {scene.objects.map((object) => (
                  <li key={object}>{object}</li>
                ))}
                {!scene.objects.length && <li>Подтверждённых объектов нет</li>}
              </ul>
            )}
          </div>
          <dl className="window-view-metrics" aria-live="polite" aria-atomic="true">
            {metrics.map(({ label, value, hint, Icon }) => (
              <div key={label}>
                <dt>
                  <Icon size={15} aria-hidden="true" />
                  {label}
                </dt>
                <dd>{value}</dd>
                <small>{hint}</small>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="window-room-options">
        <BedDouble size={22} aria-hidden="true" />
        <div>
          <h4>Номера на этой стороне</h4>
          {rooms.length ? (
            <ul>
              {rooms.map((room) => (
                <li key={room.id}>
                  <b>{room.name}</b>
                  <span>этажи {room.floors.join("–")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Размещение номеров на этой стороне пока не подтверждено.</p>
          )}
          <small>
            {demo
              ? "Условное распределение в прототипе. Этаж и номер уточните у отеля."
              : "Вид зависит от этажа. Конкретный номер и размещение подтвердит отель."}
          </small>
        </div>
        <a href="#rooms">
          Все номера <ArrowRight size={17} aria-hidden="true" />
        </a>
      </div>
      {data && (
        <details className="window-solar-details">
          <summary>
            <Sun size={17} aria-hidden="true" />
            Солнце в выбранную дату
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <div className="window-solar-grid">
            {(["sunrise", "sunset"] as const).map((event) => {
              const point = event === "sunrise" ? data.appearance : data.disappearance;
              return (
                <div key={event}>
                  <span>{event === "sunrise" ? "Восход" : "Закат"}</span>
                  <b>{localTime(data[event].at, data.timezone)}</b>
                  <p>
                    {numberLabel(data[event].azimuthDeg, "°")} · {solarVisibility(data, event)}
                  </p>
                  <p>
                    {event === "sunrise" ? "Появление в окне" : "Солнце скрывается"}:{" "}
                    {point
                      ? `${localTime(point.at, data.timezone)} · ${point.behind}`
                      : known
                        ? "не наблюдается"
                        : "нет данных"}
                  </p>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}
