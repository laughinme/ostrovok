import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { type Hotel } from "@/entities/hotel";
import { parseQuery, scoreHotel } from "@/features/hotel-search";
import { useCompare } from "@/features/compare-hotels";
import { useHotelFavorite } from "@/features/favorite-hotels";
import { useAskHotel } from "@/features/live-research";
import { AgentTrace } from "@/widgets/agent-trace";
import { CoastMap } from "@/widgets/hotel-map";
import { Drawer, Lightbox, WhyPanel, type GalleryItem } from "./overlays";
import { Icon, Mark, Toast } from "./detail-ui";
import { useToast } from "../lib/use-toast";
import { Panorama, Photo } from "./visuals";
import { createHotelDetails } from "../model/hotel-details";
import type { Fact, RoomType, RatePlan } from "../model/types";
import { FACADE_NAME } from "../lib/building";
import { rub } from "../lib/format";
import { BookingRequest } from "./booking-request";
import { BeachSection } from "./beach-section";
import { NoiseSection } from "./noise-section";
import { WindowSection } from "./window-section";
import { ClimateSection } from "./climate-section";
import { tripDates } from "../model/geo";
import "./hotel-detail.css";
import "./hotel-refresh.css";
import { HotelAbout, HotelOverview } from "./hotel-overview";
import { HotelNearby } from "./hotel-nearby";
import { getApiMode } from "@/shared/api";
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
  const reduceMotion = useReducedMotion();
  const designDemo = getApiMode() === "demo";
  const dates = tripDates(hotel.searchContext?.trip);
  const criteria = useMemo(() => parseQuery(q ?? ""), [q]);
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
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" });
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

        <HotelOverview
          hotel={hotel}
          details={h}
          criteria={criteria}
          score={m.score}
          favorite={fav}
          inComparison={inCmp}
          onFavorite={toggleFavorite}
          onCompare={() => toggleCompare(h.id)}
          onPhoto={setLb}
          onSection={scrollTo}
        />

        <HotelAbout
          hotel={hotel}
          details={h}
          selectedId={why?.id}
          onFact={setWhy}
          demo={designDemo}
        />

        <section className="sec-h2" id="rooms">
          <h2>Доступные номера</h2>
        </section>
        {h.rooms.length === 0 && (
          <div className="hotel-empty-state">
            Категории номеров пока не добавлены. Условия размещения можно уточнить у отеля.
          </div>
        )}
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
                  {r.orientationLabel ||
                    r.facades.map((f) => FACADE_NAME[f]).join(" + ") ||
                    "Сторона уточняется"}{" "}
                  · этажи {r.floors.join("–")}
                </li>
                <li>
                  <Icon name="sun" size={16} />
                  Вид: {r.view}
                </li>
              </ul>
              {r.capacity && (
                <p className="hotel-room-capacity">Размещение: до {r.capacity} гостей</p>
              )}
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
              {r.rates.length === 0 && (
                <div className="hotel-empty-state">
                  Тарифы по этой категории пока не опубликованы.
                </div>
              )}
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
          <h2>Как это будет</h2>
          <p>Ваш номер в ваши даты: вид, ночь, утро и погода — с доказательствами</p>
        </section>

        <WindowSection hotel={hotel} detail={h} />

        <NoiseSection hotel={hotel} />

        <BeachSection hotel={hotel} />

        {designDemo ? (
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
        ) : (
          <ClimateSection hotel={hotel} />
        )}

        {h.unknowns.length > 0 && (
          <section className="sec-h2">
            <h2>Осталось уточнить</h2>
            <p>Спросим отель — обычно отвечают за день</p>
          </section>
        )}
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
        <HotelNearby places={h.nearby} onRoute={() => scrollTo("morning")} />
        <div className="where card-w">
          <CoastMap items={[{ hotel }]} scrollZoom={false} />
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
        transition={
          reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 32 }
        }
      >
        <span>
          <b>{h.name}</b> · {h.bestRoom}
        </span>
        <b className="num">{h.priceFrom > 0 ? `от ${rub(h.priceFrom)}` : "Цена уточняется"}</b>
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
