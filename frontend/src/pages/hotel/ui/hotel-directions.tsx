import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  Baby,
  ChevronDown,
  Footprints,
  MapPin,
  Navigation,
  Search,
  TrainFront,
  Waves,
  Accessibility,
  X,
  LocateFixed,
} from "lucide-react";
import type { Hotel } from "@/entities/hotel";
import { api, getApiMode } from "@/shared/api";
import { ClientOnly, RequestState } from "@/shared/ui";
import {
  directionEndpoint,
  directionPlaces,
  type DirectionPlace,
  type DirectionProfile,
  type DirectionTarget,
} from "../model/directions";
import { elevationPath, numberLabel, type RouteData } from "../model/geo";
import { useTravelOptions } from "../model/use-travel-options";
import { travelTime, yandexDirections, type TravelMode } from "../model/travel-options";
import { HotelTravelOptions } from "./hotel-travel-options";
import { GeoNotes } from "./geo-status";
import { RouteScheme } from "./route-scheme";
import "./hotel-directions.css";

const DirectionsMap = lazy(() => import("./directions-map"));
const profiles = [
  ["walk", "Пешком", Footprints],
  ["stroller", "С коляской", Baby],
  ["wheelchair", "Кресло-коляска", Accessibility],
] as const;

export function HotelDirections({ hotel }: { hotel: Hotel }) {
  const ref = useRef<HTMLElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const defaultDestination = hotel.backend?.nearby.find((place) => place.kind === "beach");
  const [text, setText] = useState(defaultDestination?.name ?? "");
  const [submitted, setSubmitted] = useState("");
  const [profile, setProfile] = useState<DirectionProfile>("walk");
  const [target, setTarget] = useState<DirectionTarget | null>(() =>
    defaultDestination
      ? {
          key: defaultDestination.osmRef ?? `${defaultDestination.kind}:${defaultDestination.name}`,
          name: defaultDestination.name || defaultDestination.title,
          location: defaultDestination.location,
        }
      : null,
  );
  const [travelMode, setTravelMode] = useState<TravelMode>("walk");
  const [pickedMode, setPickedMode] = useState(false);
  const [reset, setReset] = useState(0);
  const reducedMotion = !!useReducedMotion();
  const demo = getApiMode() === "demo";
  const nearby = directionPlaces(hotel);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const routeQuery = useQuery({
    queryKey: ["hotel-directions", hotel.id, target, profile],
    queryFn: ({ signal }) =>
      api<RouteData>(
        `/hotels/${encodeURIComponent(hotel.id)}/${directionEndpoint(target!, profile)}`,
        { signal },
      ),
    enabled: visible && !!target,
    staleTime: 300000,
    placeholderData: keepPreviousData,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const places = useQuery({
    queryKey: ["hotel-places", hotel.id, submitted],
    queryFn: ({ signal }) =>
      api<DirectionPlace[]>(
        `/hotels/${encodeURIComponent(hotel.id)}/places?q=${encodeURIComponent(submitted)}`,
        { signal },
      ),
    enabled: !!submitted,
    staleTime: 86400000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const route = target && !routeQuery.isPlaceholderData ? routeQuery.data : undefined;
  const heights =
    route?.elevationProfile.flatMap(([, height]) => (height == null ? [] : [height])) ?? [];
  const externalPoint = target?.location ?? route?.geometry.coordinates.at(-1);
  const travel = useTravelOptions({
    origin: hotel.lngLat,
    destination: externalPoint,
    name: route?.targetName ?? target?.name ?? "Пункт назначения",
    walking: route,
    pending: routeQuery.isFetching,
    walkError: !!routeQuery.error,
    walkProfile: profile,
    demo,
    enabled: visible && !!target,
  });
  const selectedOption = travel.options.find((option) => option.mode === travelMode)!;
  const mapRoute = target ? selectedOption.drawing : undefined;
  useEffect(() => {
    setPickedMode(false);
    setTravelMode("walk");
  }, [target?.key]);
  useEffect(() => {
    if (pickedMode || travel.options.some((option) => option.pending)) return;
    const fastest = travel.options.find((option) => option.drawing);
    if (fastest) setTravelMode(fastest.mode);
  }, [pickedMode, travel.options]);
  const selectMode = (mode: TravelMode) => {
    setTravelMode(mode);
    setPickedMode(true);
  };
  const select = (place: DirectionPlace) => {
    if (submitted) searchButton.current?.focus({ preventScroll: true });
    setTarget({ key: place.ref, name: place.name, location: place.location });
    setText(place.name);
    setSubmitted("");
  };
  const preset = (key: "beach" | "station" | "center", name: string) => {
    setTarget({ key, name, preset: key });
    setText(name);
    setSubmitted("");
  };
  return (
    <section
      className="hotel-directions"
      id="where"
      ref={ref}
      aria-labelledby="hotel-directions-title"
    >
      <header className="directions-heading">
        <div>
          <h2 id="hotel-directions-title">Где находится</h2>
          <p>{hotel.address}</p>
        </div>
        <span>Маршруты от вашего отеля</span>
      </header>
      <div className="directions-layout">
        <aside className="directions-panel" aria-label="Построение маршрута">
          <div className="directions-origin">
            <span className="directions-point">А</span>
            <div>
              <small>Откуда</small>
              <b>{hotel.name}</b>
            </div>
          </div>
          <ArrowDown className="directions-connector" size={16} aria-hidden="true" />
          <form
            className="directions-search"
            onSubmit={(event) => {
              event.preventDefault();
              if (text.trim().length >= 3) setSubmitted(text.trim());
            }}
          >
            <MapPin size={18} aria-hidden="true" />
            <input
              aria-label="Куда построить маршрут"
              placeholder="Адрес или название места"
              value={text}
              onChange={(event) => setText(event.target.value)}
              minLength={3}
              maxLength={200}
              required
            />
            <button
              ref={searchButton}
              type="submit"
              aria-label="Найти адрес"
              disabled={text.trim().length < 3 || places.isFetching}
            >
              <Search size={18} />
            </button>
          </form>
          {submitted && (
            <div className="directions-search-results" role="region" aria-label="Найденные адреса">
              <RequestState
                pending={places.isFetching}
                error={places.error}
                retry={() => {
                  void places.refetch();
                }}
              />
              {places.data?.map((place) => (
                <button type="button" key={place.ref} onClick={() => select(place)}>
                  <MapPin size={16} />
                  <span>
                    <b>{place.name}</b>
                    <small>{place.address}</small>
                  </span>
                </button>
              ))}
              {places.isSuccess && !places.data.length && (
                <p>
                  {demo
                    ? "В демо доступны места рядом с отелем: попробуйте «пляж» или «аптека»."
                    : "Адрес не найден. Укажите улицу, дом и город."}
                </p>
              )}
            </div>
          )}
          <div className="directions-quick" aria-label="Быстрые маршруты">
            <button
              type="button"
              aria-pressed={target?.key === "beach"}
              onClick={() => preset("beach", "К морю")}
            >
              <Waves size={15} />К морю
            </button>
            <button
              type="button"
              aria-pressed={target?.key === "station"}
              onClick={() => preset("station", "К станции")}
            >
              <TrainFront size={15} />
              Транспорт
            </button>
            <button
              type="button"
              aria-pressed={target?.key === "center"}
              onClick={() => preset("center", "В центр")}
            >
              <Navigation size={15} />В центр
            </button>
          </div>
          {nearby.length > 0 && (
            <details className="directions-nearby-chooser">
              <summary>
                Выбрать место рядом <ChevronDown size={15} />
              </summary>
              {nearby.map((place) => (
                <button type="button" key={place.ref} onClick={() => select(place)}>
                  <MapPin size={15} />
                  <span>{place.name}</span>
                </button>
              ))}
            </details>
          )}
          <HotelTravelOptions
            externalEnabled={!demo}
            options={travel.options}
            selected={travelMode}
            onSelect={selectMode}
            origin={hotel.lngLat}
            destination={externalPoint}
            name={target?.name ?? ""}
          />
          {travelMode === "walk" && (
            <div className="directions-profiles" aria-label="Способ прогулки">
              {profiles.map(([key, label, Icon]) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={profile === key}
                  onClick={() => {
                    setProfile(key);
                    selectMode("walk");
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="directions-result" aria-live="polite">
            {target && travelMode === "walk" && !selectedOption.drawing && (
              <RequestState
                pending={routeQuery.isFetching || travel.foot.isFetching}
                error={travel.foot.isFetching ? null : routeQuery.error}
                retry={() => {
                  void routeQuery.refetch();
                }}
              />
            )}
            {route && !routeQuery.error && travelMode === "walk" ? (
              <>
                <div className="directions-result-heading">
                  <h3>{route.targetName ?? target?.name}</h3>
                  <button
                    type="button"
                    aria-label="Убрать маршрут"
                    onClick={() => {
                      setTarget(null);
                      setText("");
                    }}
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="directions-metrics">
                  <div>
                    <b>{numberLabel(route.there.minutes, " мин")}</b>
                    <small>от отеля</small>
                  </div>
                  <div>
                    <b>{numberLabel(route.there.lengthM, " м")}</b>
                    <small>длина пути</small>
                  </div>
                  <div>
                    <b>{numberLabel(route.back.minutes, " мин")}</b>
                    <small>обратно</small>
                  </div>
                </div>
                <p className="directions-route-kind">
                  {demo
                    ? "Демонстрационная схема"
                    : route.estimated
                      ? "Оценка, не навигационный маршрут"
                      : "Пешеходная сеть OpenStreetMap"}
                </p>
                <details className="directions-route-details">
                  <summary>
                    Подъёмы и детали пути <ChevronDown size={15} />
                  </summary>
                  {heights.length > 0 && (
                    <div className="directions-elevation">
                      <b>
                        {numberLabel(Math.min(...heights), " м")} –{" "}
                        {numberLabel(Math.max(...heights), " м")}
                      </b>
                      <svg viewBox="0 0 400 100" role="img" aria-label="Профиль высоты маршрута">
                        <path
                          d={elevationPath(route.elevationProfile)}
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="3"
                        />
                      </svg>
                      <small>Высота над уровнем моря; разрывы — нет данных</small>
                    </div>
                  )}
                  <dl>
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
                  <p>
                    Неопределённость:{" "}
                    {numberLabel(
                      route.uncertainShare == null ? null : route.uncertainShare * 100,
                      "% пути",
                    )}
                  </p>
                  <GeoNotes caveats={route.caveats} attribution={route.attribution} />
                </details>
              </>
            ) : (
              !target && (
                <p className="directions-empty">
                  Куда отправимся? Выберите место рядом, найдите адрес или поставьте точку на карте.
                </p>
              )
            )}
            {target && (travelMode !== "walk" || !route) && selectedOption.drawing && (
              <>
                <div className="directions-result-heading">
                  <h3>{selectedOption.drawing.targetName ?? target.name}</h3>
                  <button
                    type="button"
                    aria-label="Убрать маршрут"
                    onClick={() => {
                      setTarget(null);
                      setText("");
                    }}
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="directions-metrics directions-metrics--travel">
                  <div>
                    <b>{travelTime(selectedOption.minutes)}</b>
                    <small>от отеля</small>
                  </div>
                  <div>
                    <b>{numberLabel(selectedOption.distanceM, " м")}</b>
                    <small>длина пути</small>
                  </div>
                </div>
                <p className="directions-route-kind">{selectedOption.note}</p>
                {!demo && (
                  <p className="directions-route-kind">OSRM · © OpenStreetMap contributors</p>
                )}
              </>
            )}
            {target && !demo && externalPoint && (
              <a
                className="directions-external"
                href={yandexDirections(hotel.lngLat, externalPoint, travelMode)}
                target="_blank"
                rel="noreferrer"
              >
                Открыть в Яндекс Картах <ArrowUpRight size={15} />
              </a>
            )}
          </div>
          <p className="directions-attribution">
            {demo ? (
              "Демо-данные · схемы не подходят для навигации"
            ) : (
              <>
                © OpenStreetMap contributors (ODbL). Поиск: Nominatim.{" "}
                <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">
                  Сообщить об ошибке на карте
                </a>
              </>
            )}
          </p>
        </aside>
        <div
          className="directions-map"
          role="region"
          aria-label="Карта маршрута от отеля"
          onClick={(event) => {
            if (!demo || (event.target instanceof Element && event.target.closest("button")))
              return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const point: [number, number] = [
              hotel.lngLat[0] + ((event.clientX - bounds.left) / bounds.width - 0.48) * 0.04,
              hotel.lngLat[1] - ((event.clientY - bounds.top) / bounds.height - 0.45) * 0.04,
            ];
            setTarget({
              key: `demo-point:${point.join(",")}`,
              name: "Точка на демо-карте",
              location: point,
            });
            setText("Точка на демо-карте");
            setSubmitted("");
          }}
        >
          {visible &&
            (demo ? (
              mapRoute ? (
                <RouteScheme key={`${target?.key}-${travelMode}-${reset}`} route={mapRoute!} demo />
              ) : (
                <div className="directions-demo-map">
                  <div className="directions-demo-roads" />
                  <span className="directions-demo-sea">Море</span>
                  <span className="directions-demo-hotel">
                    <MapPin size={22} />
                    {hotel.name}
                  </span>
                </div>
              )
            ) : (
              <ClientOnly>
                <Suspense fallback={<RequestState pending />}>
                  <DirectionsMap
                    hotel={hotel}
                    route={mapRoute}
                    destination={target?.location}
                    reducedMotion={reducedMotion}
                    reset={reset}
                    onPick={(point) => {
                      setTarget({
                        key: `point:${point.join(",")}`,
                        name: "Точка на карте",
                        location: point,
                      });
                      setText("Точка на карте");
                      setSubmitted("");
                    }}
                  />
                </Suspense>
              </ClientOnly>
            ))}
          <button
            className="directions-map-reset"
            type="button"
            onClick={() => setReset((value) => value + 1)}
            aria-label="Показать весь маршрут"
          >
            <LocateFixed size={18} />
          </button>
          <span className="directions-map-hint">
            {demo ? "Демонстрационная карта" : "Нажмите на карту, чтобы выбрать пункт назначения"}
          </span>
        </div>
      </div>
    </section>
  );
}
