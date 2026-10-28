import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CRITERIA, formatReviewCount, type Hotel } from "@/entities/hotel";
import { parseQuery, scoreHotel } from "@/features/hotel-search";
import { useCompare } from "@/features/compare-hotels";
import { useHotelFavorite } from "@/features/favorite-hotels";
import { useAskHotel } from "@/features/live-research";
import { AgentTrace } from "@/widgets/agent-trace";
import { CoastMap } from "@/widgets/hotel-map";
import { Drawer, Lightbox, WhyPanel, type GalleryItem } from "./overlays";
import { Conf, Icon, Mark, Ring, SrcTag, Stars, Toast } from "./detail-ui";
import { useToast } from "../lib/use-toast";
import { Building, Panorama, Photo } from "./visuals";
import { createHotelDetails, nearbyRoute } from "../model/hotel-details";
import type { Facade, Fact, RoomType, RatePlan } from "../model/types";
import { FACADE_NAME } from "../lib/building";
import { decimal, rub } from "../lib/format";
import { verdict } from "../lib/score";
import { BookingRequest } from "./booking-request";
import { DetailMap } from "./detail-map";
import "./hotel-detail.css";
const FACADE_TEXT: Record<Facade, string> = {
  NE: "горы",
  SE: "море частично",
  SW: "море и закат",
  NW: "город",
};
const FACADE_COLOR: Record<Facade, string> = {
  NE: "#9BD08A",
  SE: "#9DB5F5",
  SW: "var(--primary)",
  NW: "#C9D0E2",
};
const DAYS = [
  ["пн", 10, 17, "16:58", 18, 10],
  ["вт", 11, 16, "16:57", 18, 25],
  ["ср", 12, 15, "16:56", 17, 40],
  ["чт", 13, 16, "16:55", 17, 20],
  ["пт", 14, 17, "16:54", 17, 10],
  ["сб", 15, 16, "16:53", 17, 15],
] as const;
export function HotelPage({ hotel, query: q }: { hotel: Hotel; query?: string | undefined }) {
  const h = useMemo(() => createHotelDetails(hotel), [hotel]);
  const criteria = useMemo(() => parseQuery(q ?? ""), [q]);
  const chips = criteria.map((key) => ({ key }));
  const match = hotel.searchMatch
    ? Math.round(hotel.searchMatch.score * 100)
    : scoreHotel(hotel, criteria);
  const m = {
    score: match,
    risk: hotel.searchMatch ? Math.round(hotel.searchMatch.disappointmentRisk * 100) : 100 - match,
  };
  const { ids: compare, toggle: toggleCompare } = useCompare();
  const { selected: fav, toggle: toggleFavorite } = useHotelFavorite(hotel.id);
  const [booking, setBooking] = useState<{
    room: RoomType;
    rate: RatePlan;
  } | null>(null);
  const [facade, setFacade] = useState<Facade>(h.bestFacade);
  const [floor, setFloor] = useState(h.bestFloor);
  const [reading, setReading] = useState({ seaShare: 0, sunVisible: false });
  const [noise, setNoise] = useState<"night" | "day">("night");
  const [why, setWhy] = useState<Fact | null>(null);
  const [lb, setLb] = useState<number | null>(null);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const ask = useAskHotel(hotel.id, hotel.searchContext?.id);
  const [toast, showToast] = useToast();
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const f = () => setStuck(scrollY > 640);
    addEventListener("scroll", f, { passive: true });
    return () => removeEventListener("scroll", f);
  }, []);
  const gallery: GalleryItem[] = useMemo(
    () => [
      ...h.photos.map((key) => ({ kind: "photo" as const, key })),
      { kind: "view" as const },
      { kind: "noise" as const },
    ],
    [h],
  );
  const route = useMemo(() => nearbyRoute(hotel), [hotel]);
  const noiseSides = h.noise[noise];
  const roomsForFacade = h.rooms.filter((r) => r.facades.includes(facade));
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const inCmp = compare.includes(h.id);
  return (
    <main className="hotel-detail hotel-page">
      <div className="hp">
        <div className="crumbs-row">
          <Link className="pill-btn" to="/results" search={{ q }}>
            <Icon name="back" size={16} />
            Все варианты в Сочи
          </Link>
          <Link className="pill-btn" to="/">
            <Icon name="spark" size={16} />
            Новый поиск
          </Link>
        </div>

        <section className="hp-head card-w">
          <div>
            <h1>
              {h.name} <Stars n={h.stars} />
            </h1>
            <div className="hp-addr">
              <b>{h.address}</b> ·{" "}
              <button className="link" onClick={() => scrollTo("where")}>
                Показать на карте
              </button>
            </div>
            <div className="hp-dist">
              {h.toCenter} · {h.toSea}
            </div>
          </div>
          <div className="hp-cta">
            <div className="hp-price">
              от <b className="num">{rub(h.priceFrom)}</b>
            </div>
            <button
              className={`fav-btn${fav ? " on" : ""}`}
              aria-pressed={fav}
              aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
              onClick={toggleFavorite}
            >
              <Icon name="heart" size={20} />
            </button>
            <button className="btn btn-primary" onClick={() => scrollTo("rooms")}>
              Выбрать номер
            </button>
          </div>
        </section>

        <section className={`mosaic${gallery.length <= 5 ? " compact" : ""}`}>
          {gallery.slice(0, 7).map((g, i) => (
            <button
              key={i}
              className={`mz mz-${i}`}
              onClick={() => setLb(i)}
              aria-label={`Открыть фото ${i + 1}`}
            >
              {g.kind === "photo" && (
                <Photo
                  k={g.key}
                  alt={`${h.name}, фото ${i + 1}`}
                  credit={i === 0}
                  facade={h.bestFacade}
                  floor={h.bestFloor}
                />
              )}
              {g.kind === "view" && (
                <div className="mz-scene">
                  <Panorama facade={h.bestFacade} floor={h.bestFloor} labels={false} />
                  <span>Вид из окна · расчёт</span>
                </div>
              )}
              {g.kind === "noise" && (
                <div className="mz-light">
                  <Building
                    floors={h.totalFloors}
                    name={h.name}
                    sides={Object.fromEntries(
                      Object.entries(h.noise.night).map(([key, [color, text]]) => [
                        key,
                        { color, text },
                      ]),
                    )}
                  />
                </div>
              )}
              {i === 6 && gallery.length > 7 && (
                <span className="more">+{gallery.length - 7} фото</span>
              )}
            </button>
          ))}
        </section>

        <section className="trio">
          <div className="card-w t-match">
            <div className="t-h">
              <Ring value={m.score} size={74} label="" />
              <div>
                <b>Совпадение с вашим запросом</b>
                <span>риск разочарования {m.risk}%</span>
              </div>
            </div>
            <ul className="vlist">
              {chips.map((c) => {
                const p = h.wish[c.key]?.[0] ?? null;
                return (
                  <li key={c.key}>
                    <Mark v={verdict(p)} />
                    {p == null
                      ? `${CRITERIA[c.key].label}: выясняем`
                      : (h.wish[c.key]?.[1] ?? CRITERIA[c.key].label)}
                  </li>
                );
              })}
            </ul>
            <p className="trade">{h.tradeoff}</p>
          </div>
          <div className="card-w">
            <div className="t-rating">
              <span className="rating-v num">{decimal(h.rating)}</span>
              <div>
                <b>{h.ratingLabel}</b>
                <span>
                  {hotel.backend ? "Рейтинг демонстрационный" : formatReviewCount(h.reviewCount)}
                </span>
              </div>
            </div>
            <h3 className="t-title">Популярные удобства</h3>
            <ul className="amen">
              {h.amenities.map((a) => (
                <li key={a}>
                  <Icon name="check" size={16} />
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-w">
            <h3 className="t-title">Что есть рядом</h3>
            <ul className="near">
              {h.nearby.map(([ic, n, d]) => (
                <li key={n}>
                  <span className="near-ic">
                    <Icon name={ic} size={17} />
                  </span>
                  <span>{n}</span>
                  <b className="num">{d}</b>
                </li>
              ))}
            </ul>
            <button className="btn-ghost wide" onClick={() => scrollTo("morning")}>
              Как дойти до моря
            </button>
          </div>
        </section>

        <section className="sec-h2">
          <h2>Как это будет</h2>
          <p>Ваш номер в ваши даты: вид, ночь, утро и погода — с доказательствами</p>
        </section>

        <section className="window-card card-w" id="window">
          <div className="w-head">
            <h3>Ваше окно</h3>
            <svg className="compass" viewBox="-30 -30 60 60" aria-hidden="true">
              <g transform="rotate(45)">
                {(["NE", "SE", "SW", "NW"] as Facade[]).map((f, i) => (
                  <path
                    key={f}
                    d={
                      [
                        "M0 0 L0 -26 A26 26 0 0 1 26 0 Z",
                        "M0 0 L26 0 A26 26 0 0 1 0 26 Z",
                        "M0 0 L0 26 A26 26 0 0 1 -26 0 Z",
                        "M0 0 L-26 0 A26 26 0 0 1 0 -26 Z",
                      ][i]
                    }
                    fill={FACADE_COLOR[f]}
                    opacity={f === facade ? 1 : 0.35}
                  />
                ))}
              </g>
              <circle r="6" fill="#fff" stroke="var(--ink)" strokeWidth="1.5" />
              <text y="-29" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--ink)">
                С
              </text>
            </svg>
            <div className="fac" role="group" aria-label="Сторона здания">
              {(["NE", "SE", "SW", "NW"] as Facade[]).map((f) => (
                <button
                  key={f}
                  className={f === facade ? "on" : ""}
                  aria-pressed={f === facade}
                  onClick={() => setFacade(f)}
                >
                  <i style={{ background: FACADE_COLOR[f] }} />
                  {FACADE_NAME[f]} · {FACADE_TEXT[f]}
                </button>
              ))}
            </div>
            <span className="read">
              10–15 ноября · закат <b>16:53–16:58</b>
            </span>
          </div>
          <div className="w-stage">
            <Panorama facade={facade} floor={floor} onReading={setReading} />
          </div>
          <div className="w-foot">
            <label className="floor">
              Этаж <b className="num">{floor}</b>
              <input
                type="range"
                min={1}
                max={h.totalFloors}
                value={floor}
                onChange={(e) => setFloor(+e.target.value)}
                aria-label="Этаж"
              />
            </label>
            <span className="read">
              море в окне{" "}
              <b className="num">{reading.seaShare ? `${reading.seaShare}%` : "не видно"}</b>
            </span>
            <span className="read">
              закат <b>{reading.sunVisible ? "видно" : "не видно"}</b>
            </span>
          </div>
          <div className="w-note">
            {roomsForFacade.length ? (
              <>
                <Mark v="yes" />
                <span>
                  На {FACADE_NAME[facade]} выходят номера{" "}
                  <b>{roomsForFacade.map((r) => r.name).join(", ")}</b>, этажи{" "}
                  {roomsForFacade[0]!.floors.join("–")}. Условное распределение номеров в прототипе;
                  уточните у отеля.
                </span>
              </>
            ) : (
              <>
                <Mark v="partial" />
                <span>На {FACADE_NAME[facade]} размещение номеров пока не подтверждено.</span>
              </>
            )}
          </div>
          <div className="attrib">
            © OpenStreetMap contributors · Copernicus DEM GLO-30 · геометрия в прототипе условная
          </div>
        </section>

        <section className="row-panel card-w" id="night">
          <div className="rp-media light">
            <Building
              floors={h.totalFloors}
              name={h.name}
              sides={Object.fromEntries(
                Object.entries(noiseSides).map(([k, v]) => [k, { color: v[0], text: v[1] }]),
              )}
            />
          </div>
          <div className="rp-side">
            <div className="rp-h">
              <h3>Ваша ночь</h3>
              <div className="seg">
                <button className={noise === "day" ? "on" : ""} onClick={() => setNoise("day")}>
                  <Icon name="sun" size={14} /> День
                </button>
                <button className={noise === "night" ? "on" : ""} onClick={() => setNoise("night")}>
                  <Icon name="moon" size={14} /> Ночь
                </button>
              </div>
            </div>
            <p className="sub">Сколько шума у каждой стороны здания</p>
            <ul className="legend">
              {Object.entries(noiseSides).map(([k, [c, db, src]]) => (
                <li key={k}>
                  <span className="sw" style={{ background: c }} />
                  <span>
                    {FACADE_NAME[k as Facade]} · {src}
                  </span>
                  <b className="num">{db}</b>
                </li>
              ))}
            </ul>
            <div className="verdict-box">
              <Mark v="yes" />
              <span>
                Ночью от{" "}
                <b>{hotel.noise.length ? Math.round(Math.min(...hotel.noise)) : "нет данных"} дБ</b>{" "}
                по данным карточки. Распределение шума по сторонам условное: перед поездкой уточним
                сторону и тип окон.
              </span>
            </div>
          </div>
        </section>

        <section className="row-panel card-w morning" id="morning">
          <div className="rp-media">
            <DetailMap hotel={hotel} route={route} />
          </div>
          <div className="rp-side">
            <div className="rp-h">
              <h3>Ваше утро</h3>
            </div>
            <p className="sub">{route.destination} и что есть поблизости</p>
            <svg className="elev" viewBox="0 0 400 110" aria-label="Профиль высот">
              <defs>
                <linearGradient id="elevg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--primary)" stopOpacity=".22" />
                  <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect
                x="120"
                y="8"
                width="70"
                height="70"
                fill="var(--verified)"
                opacity=".5"
                rx="4"
              />
              <path
                d="M10 14 C 60 15, 90 20, 120 26 L 190 70 C 230 86, 290 92, 390 96 L 390 100 L 10 100 Z"
                fill="url(#elevg)"
              />
              <path
                d="M10 14 C 60 15, 90 20, 120 26 L 190 70 C 230 86, 290 92, 390 96"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
              />
              <text
                x="155"
                y="20"
                fontSize="11"
                textAnchor="middle"
                fill="var(--ink)"
                fontWeight="600"
              >
                Схема пути
              </text>
              <text x="10" y="108" fontSize="11" fill="var(--muted)">
                отель
              </text>
              <text x="390" y="108" fontSize="11" fill="var(--muted)" textAnchor="end">
                {route.destination}
              </text>
            </svg>
            <ol className="route">
              {route.stops.map(([name, description]) => (
                <li key={name}>
                  <b>{name}</b>
                  <span>{description}</span>
                </li>
              ))}
            </ol>
            <div className="times num">
              <div>
                <b>{route.minutes} мин</b>
                <span>до места</span>
              </div>
              <div>
                <b>{hotel.walk.length}</b>
                <span>мест рядом</span>
              </div>
              <div>
                <b>уточним</b>
                <span>перепад высот</span>
              </div>
            </div>
          </div>
        </section>

        <section className="dates card-w">
          <div className="rp-h">
            <h3>Ваши даты</h3>
            <span className="sub">Демонстрационная сводка, не прогноз</span>
          </div>
          <div className="days num">
            {DAYS.map(([wd, d, t, s, w, r]) => (
              <div className="day" key={d}>
                <span className="d">
                  {wd}, {d} ноября
                </span>
                <b>{t}°</b>
                <span className="row">
                  <Icon name="sun" size={14} />
                  закат {s}
                </span>
                <span className="row">
                  <Icon name="wave" size={14} />
                  вода {w}°
                </span>
                <span className="row">
                  <Icon name="question" size={14} />
                  дождь {r}%
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="sec-h2" id="rooms">
          <h2>Доступные номера</h2>
          <p>
            10–15 ноября · 5 ночей · 2 взрослых · стороны и этажи — по ответу отеля, вид — по
            расчёту
          </p>
        </section>
        {h.rooms.map((r) => (
          <section key={r.id} className={`room card-w${r.recommended ? " rec" : ""}`}>
            <div className="room-l">
              {r.recommended && <span className="rec-l">Подходит вам больше всего</span>}
              <div className="room-ph">
                <Photo k={r.photo} alt={r.name} credit={false} />
                <span className="room-view">
                  <Panorama
                    facade={r.facades[0] ?? h.bestFacade}
                    floor={Math.min(r.floors[1], Math.max(r.floors[0], h.bestFloor))}
                    labels={false}
                  />
                </span>
              </div>
              <h3>{r.name}</h3>
              <ul className="feat">
                <li>
                  <Icon name="bed" size={16} />
                  {r.bed}, {r.area} м²
                </li>
                <li>
                  <Icon name="pin" size={16} />
                  {r.facades.map((f) => FACADE_NAME[f]).join(" + ")} · этажи {r.floors.join("–")}
                </li>
                <li>
                  <Icon name="sun" size={16} />
                  Вид: {r.view}
                </li>
              </ul>
              <ul className="foryou">
                {r.forYou.map(([v, t]) => (
                  <li key={t}>
                    <Mark v={v} />
                    {t}
                  </li>
                ))}
              </ul>
              {r.request && (
                <div className="req-pill">
                  <span className="lbl">Попросим у отеля</span>
                  {r.request}
                </div>
              )}
            </div>
            <div className="rates">
              {r.rates.map((rt, i) => (
                <div className="rate" key={i}>
                  <ul>
                    <li>
                      <Icon name="meal" size={16} />
                      <span className={rt.meal.startsWith("Завтрак") ? "good" : ""}>{rt.meal}</span>
                    </li>
                    <li>
                      <Icon name="undo" size={16} />
                      <span className={rt.cancel.startsWith("Бесплатная") ? "good" : ""}>
                        {rt.cancel}
                      </span>
                    </li>
                    <li>
                      <Icon name="card" size={16} />
                      <span>{rt.pay}</span>
                    </li>
                  </ul>
                  {rt.tag && <span className="rate-tag">{rt.tag}</span>}
                  <b className="num">{rub(rt.price)}</b>
                  <span className="rate-sub">за ночь · налоги включены</span>
                  <button
                    className="btn btn-primary"
                    onClick={() => setBooking({ room: r, rate: rt })}
                  >
                    Забронировать
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="sec-h2">
          <h2>Что ещё мы знаем</h2>
          <p>Нажмите на факт, чтобы увидеть доказательство</p>
        </section>
        <div className="tiles">
          {h.facts.map((f) => {
            const v = verdict(f.confidence);
            return (
              <button
                key={f.id}
                className={`tile${why?.id === f.id ? " sel" : ""}`}
                onClick={() => setWhy(f)}
              >
                <span className="t-top">
                  <Mark v={v} />
                  {f.group}
                  <SrcTag kind={f.source}>{f.sourceLabel}</SrcTag>
                </span>
                <b>{f.statement}</b>
                <span className="scope">{f.scopeText}</span>
                <span className="t-foot">
                  <Conf p={f.confidence} />
                  <span className="go">почему →</span>
                </span>
              </button>
            );
          })}
        </div>

        <section className="sec-h2">
          <h2>Чего мы не знаем</h2>
          <p>Спросим отель — обычно отвечают за день</p>
        </section>
        <div className="asks">
          {h.unknowns.map(({ key, question, why }) => {
            const sent = key ? ask.asked.has(key) : asked.has(question);
            return (
              <div key={question} className={`ask-tile${sent ? " sent" : ""}`}>
                <b>{question}</b>
                <span>{why}</span>
                <button
                  disabled={sent}
                  onClick={() => {
                    if (key && hotel.backend) {
                      void ask.ask(key, question);
                      showToast("Вопрос отправлен отелю. Агент следит за ответом.");
                    } else {
                      setAsked((a) => new Set(a).add(question));
                      showToast("Вопрос записан. В демо-отеле его некому отправить.");
                    }
                  }}
                >
                  {sent ? "✓ Спросили отель" : "Спросить отель →"}
                </button>
              </div>
            );
          })}
        </div>
        {(ask.run || ask.error) && (
          <div className="mt-4">
            {ask.error ? (
              <p className="rounded-2xl border bg-card px-4 py-3 text-sm">{ask.error}</p>
            ) : (
              <AgentTrace run={ask.run} compact />
            )}
          </div>
        )}

        <section className="sec-h2" id="where">
          <h2>Где находится</h2>
          <p>{h.address}</p>
        </section>
        <div className="where card-w">
          <CoastMap items={[{ hotel }]} />
        </div>

        <div className="hp-actions">
          <button className={`btn-ghost${inCmp ? " on" : ""}`} onClick={() => toggleCompare(h.id)}>
            {inCmp ? "✓ В сравнении" : "+ Добавить в сравнение"}
          </button>
          <Link className="btn-ghost" to="/compare">
            Сравнить с другими
          </Link>
        </div>
      </div>

      <motion.div
        className="sticky-cta"
        aria-hidden={!stuck}
        inert={!stuck}
        initial={false}
        animate={{ y: stuck ? 0 : 120, opacity: stuck ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
      >
        <span>
          <b>{h.name}</b> · {h.bestRoom}
        </span>
        <b className="num">от {rub(h.priceFrom)}</b>
        <button className="btn btn-primary btn-sm" onClick={() => scrollTo("rooms")}>
          Выбрать номер
        </button>
      </motion.div>

      <Drawer open={!!why} onClose={() => setWhy(null)} label="Почему мы так думаем">
        {why && <WhyPanel fact={why} hotel={h} />}
      </Drawer>
      <Lightbox items={gallery} index={lb} hotel={h} onClose={() => setLb(null)} onIndex={setLb} />
      <Toast text={toast} />
      <Drawer
        open={booking != null}
        onClose={() => setBooking(null)}
        label="Заявка на бронирование"
      >
        {booking && <BookingRequest hotel={hotel} room={booking.room} rate={booking.rate} />}
      </Drawer>
    </main>
  );
}
