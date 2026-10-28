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
import { createHotelDetails } from "../model/hotel-details";
import type { Fact, RoomType, RatePlan } from "../model/types";
import { FACADE_NAME } from "../lib/building";
import { decimal, rub } from "../lib/format";
import { verdict } from "../lib/score";
import { BookingRequest } from "./booking-request";
import { BeachSection } from "./beach-section";
import { NoiseSection } from "./noise-section";
import { WindowSection } from "./window-section";
import { ClimateSection } from "./climate-section";
import { dateLabel, tripDates } from "../model/geo";
import "./hotel-detail.css";
export function HotelPage({ hotel, query: q }: { hotel: Hotel; query?: string | undefined }) {
  const h = useMemo(() => createHotelDetails(hotel), [hotel]);
  const dates = tripDates(hotel.searchContext?.trip);
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
      ...(!h.api ? [{ kind: "view" as const }, { kind: "noise" as const }] : []),
    ],
    [h],
  );
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

        <WindowSection hotel={hotel} detail={h} />

        <NoiseSection hotel={hotel} />

        <BeachSection hotel={hotel} />

        <ClimateSection hotel={hotel} />

        <section className="sec-h2" id="rooms">
          <h2>Доступные номера</h2>
          <p>
            {dateLabel(dates.from)} — {dateLabel(dates.to)} · взрослые:{" "}
            {hotel.searchContext?.trip.adults ?? 2} · стороны и этажи — по ответу отеля, вид — по
            расчёту
          </p>
        </section>
        {h.rooms.map((r) => (
          <section key={r.id} className={`room card-w${r.recommended ? " rec" : ""}`}>
            <div className="room-l">
              {r.recommended && <span className="rec-l">Подходит вам больше всего</span>}
              <div className="room-ph">
                <Photo k={r.photo} alt={r.name} credit={false} />
                {!h.api && (
                  <span className="room-view">
                    <Panorama
                      facade={r.facades[0] ?? h.bestFacade}
                      floor={Math.min(r.floors[1], Math.max(r.floors[0], h.bestFloor))}
                      labels={false}
                    />
                  </span>
                )}
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
