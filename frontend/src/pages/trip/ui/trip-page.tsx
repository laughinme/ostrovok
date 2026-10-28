import { useEffect, useState } from "react";
import { Sun, Waves, Footprints, Utensils } from "lucide-react";
import { trip } from "../model/trip";
import { TripTicket } from "./trip-ticket";
import "./trip-page.css";

const PROMISES = [
  ["Закат над морем из окна", "обещали: ЮЗ-сторона, этаж ≥ 4"],
  ["Ночью тихо", "обещали: ≈55 дБ на ЮЗ, слышны ночные поезда"],
  ["До пляжа 6 минут", "обещали: спуск, 64 ступени, тоннель"],
];

export function TripPage() {
  const h = trip.hotel;
  const [confirmed, setConfirmed] = useState(false);
  const [post, setPost] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  useEffect(() => {
    const t = setTimeout(() => setConfirmed(true), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="trips-screen">
      <main className="trip-page">
        <TripTicket hotel={h} confirmed={confirmed} />

        <div className="seg big-seg">
          <button
            type="button"
            aria-pressed={!post}
            className={!post ? "on" : ""}
            onClick={() => setPost(false)}
          >
            До поездки
          </button>
          <button
            type="button"
            aria-pressed={post}
            className={post ? "on" : ""}
            onClick={() => setPost(true)}
          >
            После поездки
          </button>
        </div>

        {!post ? (
          <section>
            <h2 className="h-md">Что вас ждёт</h2>
            <div className="expect">
              <div className="card-w">
                <Sun size={22} aria-hidden="true" />
                <h3>Закат из окна</h3>
                <b className="num">16:58 → 16:53</b>
                <p>С 10 по 15 ноября солнце садится в море прямо напротив ЮЗ-фасада.</p>
              </div>
              <div className="card-w">
                <Waves size={22} aria-hidden="true" />
                <h3>Погода и вода</h3>
                <b className="num">16° / 17°</b>
                <p>Обычно 1–2 дождливых дня. Возьмите ветровку.</p>
              </div>
              <div className="card-w">
                <Footprints size={22} aria-hidden="true" />
                <h3>Дорога к морю</h3>
                <b className="num">6 мин</b>
                <p>Вниз по лестнице, 64 ступени, тоннель под ж/д. Обратно — 9 минут.</p>
              </div>
              <div className="card-w">
                <Utensils size={22} aria-hidden="true" />
                <h3>Рядом вечером</h3>
                <b>«Сулико»</b>
                <p>
                  Хинкальная в 7 минутах, работает до 23:00. Кофейня «Зерно» открывается в 7:00.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section>
            <h2 className="h-md">Всё было так, как мы обещали?</h2>
            <p className="muted">Ваш ответ уточнит факты для следующих гостей</p>
            <div className="fb card-w">
              {PROMISES.map(([t, s], i) => (
                <div className="fb-row" key={t}>
                  <div>
                    <b>{t}</b>
                    <span>{s}</span>
                  </div>
                  <div className="seg">
                    {["Да", "Частично", "Нет"].map((a) => (
                      <button
                        type="button"
                        aria-pressed={answers[i] === a}
                        key={a}
                        className={answers[i] === a ? "on" : ""}
                        onClick={() => setAnswers((x) => ({ ...x, [i]: a }))}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {Object.keys(answers).length === 3 && (
              <p className="thanks" role="status">
                Спасибо! Уверенность в трёх фактах «{h.name}» обновлена.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
