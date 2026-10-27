'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Footer, Header } from '../components/chrome';
import { Demo, Icon } from '../components/ui';
import { Panorama, Photo } from '../components/visuals';
import { byId } from '../data/hotels';

const PROMISES = [
  ['Закат над морем из окна', 'обещали: ЮЗ-сторона, этаж ≥ 4'],
  ['Ночью тихо', 'обещали: ≈55 дБ на ЮЗ, слышны ночные поезда'],
  ['До пляжа 6 минут', 'обещали: спуск, 64 ступени, тоннель'],
];

export default function TripPage() {
  const h = byId(useParams<{ id: string }>()?.id);
  const [confirmed, setConfirmed] = useState(false);
  const [post, setPost] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  useEffect(() => { const t = setTimeout(() => setConfirmed(true), 2500); return () => clearTimeout(t); }, []);

  return (
    <div className="canvas-page">
      <Header />
      <main className="trip-page">
        <section className="trip-hero">
          <div className="trip-photo"><Photo k={h.photos[0]} alt={h.name} credit={false} /></div>
          <div className="trip-info">
            <span className="k">Ваша поездка</span>
            <h1>{h.name}, 10–15 ноября</h1>
            <p>{h.rooms.find((r) => r.recommended)?.name ?? h.bestRoom} · 2 взрослых <Demo /></p>
            <ol className="status-list" aria-live="polite">
              <li className="done"><i />Бронь оплачена<small>сегодня, 14:02</small></li>
              <li className="done"><i />Запрос ушёл в отель: {h.rooms.find((r) => r.recommended)?.request ?? 'ЮЗ-сторона, этаж ≥ 4'}<small>14:02</small></li>
              <li className={confirmed ? 'done' : 'live'}><i />{confirmed ? 'Отель подтвердил: ЮЗ-сторона, 5 этаж, номер 512' : 'Ждём подтверждения отеля'}<small>{confirmed ? 'только что' : 'обычно до 2 часов'}</small></li>
            </ol>
          </div>
          <div className="trip-view"><Panorama facade={h.bestFacade} floor={5} /><span>Вид из номера 512 · расчёт</span></div>
        </section>

        <div className="seg big-seg">
          <button className={!post ? 'on' : ''} onClick={() => setPost(false)}>До поездки</button>
          <button className={post ? 'on' : ''} onClick={() => setPost(true)}>После поездки</button>
        </div>

        {!post ? (
          <section>
            <h2 className="h-md">Что вас ждёт</h2>
            <div className="expect">
              <div className="card-w"><Icon name="sun" size={22} /><h3>Закат из окна</h3><b className="num">16:58 → 16:53</b><p>С 10 по 15 ноября солнце садится в море прямо напротив ЮЗ-фасада.</p></div>
              <div className="card-w"><Icon name="wave" size={22} /><h3>Погода и вода</h3><b className="num">16° / 17°</b><p>Обычно 1–2 дождливых дня. Возьмите ветровку.</p></div>
              <div className="card-w"><Icon name="steps" size={22} /><h3>Дорога к морю</h3><b className="num">6 мин</b><p>Вниз по лестнице, 64 ступени, тоннель под ж/д. Обратно — 9 минут.</p></div>
              <div className="card-w"><Icon name="food" size={22} /><h3>Рядом вечером</h3><b>«Сулико»</b><p>Хинкальная в 7 минутах, работает до 23:00. Кофейня «Зерно» открывается в 7:00.</p></div>
            </div>
          </section>
        ) : (
          <section>
            <h2 className="h-md">Всё было так, как мы обещали?</h2>
            <p className="muted">Ваш ответ уточнит факты для следующих гостей</p>
            <div className="fb card-w">
              {PROMISES.map(([t, s], i) => (
                <div className="fb-row" key={t}>
                  <div><b>{t}</b><span>{s}</span></div>
                  <div className="seg">{['Да', 'Частично', 'Нет'].map((a) => <button key={a} className={answers[i] === a ? 'on' : ''} onClick={() => setAnswers((x) => ({ ...x, [i]: a }))}>{a}</button>)}</div>
                </div>
              ))}
            </div>
            {Object.keys(answers).length === 3 && <p className="thanks">Спасибо! Уверенность в трёх фактах «{h.name}» обновлена.</p>}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
