import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getApiMode } from "@/shared/api";
import { RequestState, Reveal, TravelAirplane } from "@/shared/ui";
import { hotelQuery } from "@/entities/hotel";
import { bookingTripQuery, bookingTripRecord, bookingTripsQuery } from "../model/booking-trips";
import { demoExpectations } from "../model/demo-expectations";
import { TripBookingDetails } from "./trip-booking-details";
import { TripExpectations } from "./trip-expectations";
import { demoTrips } from "../model/trip";
import { TripTicket } from "./trip-ticket";
import "./trip-page.css";

export function TripPage({ initialBookingId }: { initialBookingId?: string } = {}) {
  const demo = getApiMode() === "demo";
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState("Все поездки");
  const [expanded, setExpanded] = useState<string | null>(initialBookingId ?? null);
  const [post, setPost] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const bookings = useQuery(bookingTripsQuery);
  const selected = useQuery({
    ...bookingTripQuery(initialBookingId ?? ""),
    enabled: !!initialBookingId && (!demo || initialBookingId.startsWith("demo-booking-")),
  });
  const selectedHotel = useQuery({
    ...hotelQuery(selected.data?.booking.hotelId ?? ""),
    enabled: !demo && !!selected.data,
  });
  const summaries = bookings.data ?? [];
  const records = summaries.map(bookingTripRecord);
  if (selected.data && !records.some((item) => item.id === selected.data.booking.id)) {
    records.unshift(
      bookingTripRecord({
        booking: selected.data.booking,
        hotelName: selectedHotel.data?.name ?? "Ваша бронь",
        hotelArea: selectedHotel.data?.district ?? "",
        createdAt: "",
      }),
    );
  }
  const trips = (demo ? [...records, ...demoTrips] : records).filter(
    (item) =>
      filter === "Все поездки" ||
      (filter === "Предстоящие"
        ? item.status !== "completed" && item.status !== "declined"
        : item.status === "completed"),
  );
  return (
    <main className="trips-screen">
      <div className="trip-page">
        <Reveal className="trips-heading">
          <div>
            <span className="trips-eyebrow">Мои поездки</span>
            <h1>
              Ваш следующий
              <br />
              хороший день.
            </h1>
          </div>
        </Reveal>
        <div className="trip-list-toolbar">
          <div className="trip-filter" role="group" aria-label="Поездки">
            {["Все поездки", "Предстоящие", "Завершённые"].map((label) => (
              <button
                type="button"
                key={label}
                aria-pressed={filter === label}
                onClick={() => setFilter(label)}
              >
                {label}
              </button>
            ))}
          </div>
          {demo && <span className="trips-demo-label">Примеры поездок · демо</span>}
        </div>
        {!demo && (
          <RequestState
            page
            pending={bookings.isPending}
            error={bookings.error}
            retry={() => void bookings.refetch()}
          />
        )}
        {!demo && initialBookingId && (
          <RequestState
            page
            pending={selected.isPending}
            error={selected.error}
            retry={() => void selected.refetch()}
          />
        )}
        <div className="trip-ticket-list">
          {trips.map((item, index) => (
            <Reveal key={item.id} delay={index * 0.06}>
              <TripTicket
                trip={item}
                expanded={expanded === item.id}
                onToggle={() => {
                  setExpanded(expanded === item.id ? null : item.id);
                  setPost(item.status === "completed");
                }}
              />
              <AnimatePresence initial={false}>
                {expanded === item.id && (
                  <motion.section
                    id={`trip-details-${item.id}`}
                    className="trip-expanded"
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.3 }}
                    aria-label={`Детали поездки: ${item.hotel.name}`}
                  >
                    <div className="trip-expanded-inner">
                      <div className="trip-expanded-heading">
                        <h3>Всё важное перед отъездом</h3>
                        {
                          <div className="trip-detail-tabs">
                            <button aria-pressed={!post} onClick={() => setPost(false)}>
                              До поездки
                            </button>
                            <button aria-pressed={post} onClick={() => setPost(true)}>
                              После поездки
                            </button>
                          </div>
                        }
                      </div>
                      {item.bookingId ? (
                        <TripBookingDetails id={item.bookingId} post={post} />
                      ) : !post ? (
                        <>
                          {item.highlights.length > 0 && (
                            <div className="trip-highlights">
                              {item.highlights.map((highlight) => (
                                <div key={highlight.label}>
                                  <span>{highlight.label}</span>
                                  <b>{highlight.value}</b>
                                  <p>{highlight.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <TripExpectations data={demoExpectations(item)} />
                        </>
                      ) : (
                        <div className="trip-feedback">
                          <p>
                            <MessageSquare size={18} />
                            Совпало ли то, что мы обещали, с вашим отдыхом?
                          </p>
                          {item.highlights.map((highlight, i) => (
                            <div key={highlight.label}>
                              <b>{highlight.label}</b>
                              <div>
                                {["Да", "Частично", "Нет"].map((answer) => (
                                  <button
                                    key={answer}
                                    aria-pressed={answers[`${item.id}-${i}`] === answer}
                                    onClick={() =>
                                      setAnswers((current) => ({
                                        ...current,
                                        [`${item.id}-${i}`]: answer,
                                      }))
                                    }
                                  >
                                    {answers[`${item.id}-${i}`] === answer && <Check size={12} />}
                                    {answer}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          <small>Ответы в этом примере сохраняются только на экране.</small>
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </Reveal>
          ))}
        </div>
        {trips.length === 0 &&
          (demo ||
            (bookings.isSuccess &&
              (!initialBookingId || (!selected.isPending && !selected.error)))) && (
            <div className="trips-empty">
              <TravelAirplane />
              <h2>Здесь появятся новые маршруты</h2>
              <p>Пока нет поездок в этой категории.</p>
            </div>
          )}
        <Reveal className="trips-more">
          <div>
            <span>А куда дальше?</span>
            <h2>
              Хороший отдых
              <br />
              начинается с желания.
            </h2>
          </div>
          <Link to="/">
            Подобрать отель
            <ChevronRight size={18} />
          </Link>
        </Reveal>
      </div>
    </main>
  );
}
