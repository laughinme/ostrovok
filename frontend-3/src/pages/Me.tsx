import { useState } from 'react';
import { Link } from 'react-router';
import { Footer, Header } from '../components/chrome';
import { Demo } from '../components/ui';
import { Photo } from '../components/visuals';

const TASTE = [
  { t: 'Тишина важнее вида', why: '3 из 4 броней — номера во двор, даже когда был вид на море', a: 'вид', b: 'тишина', v: 72, on: true },
  { t: 'Не любите подъёмы', why: 'Дважды убирали отели «на холме» из сравнения', a: 'неважно', b: 'важно', v: 80, on: true },
  { t: 'Едете осенью', why: 'Октябрь и ноябрь в трёх поездках из четырёх — показываем закаты и воду по сезону', a: 'редко', b: 'часто', v: 65, on: true },
  { t: 'Бюджет до 9 000 ₽ за ночь', why: 'Средняя цена ваших броней — 7 800 ₽', a: 'ниже', b: 'выше', v: 55, on: false },
];
const PAST = [
  ['kiparis', 'ext-3', 'Кипарис, Сочи', 'октябрь 2025', '✓ всё так'],
  ['sosny', 'mountains-1', 'Сосновый склон', 'ноябрь 2024', '✓ всё так'],
  ['priboy', 'ext-4', 'Прибой, Хоста', 'сентябрь 2024', '⚠ шумнее, чем ждали'],
  ['lazur', 'ext-2', 'Лазурь, Адлер', 'октябрь 2023', '✓ всё так'],
];

export default function MePage() {
  const [taste, setTaste] = useState(TASTE);
  return (
    <div className="canvas-page">
      <Header />
      <main className="me">
        <h1 className="page-title">Что мы поняли о вас</h1>
        <p className="lead">По 4 прошлым поездкам и тому, что вы сохраняли. Поправьте, если мы ошиблись. <Demo>демо-история</Demo></p>
        <div className="taste">
          {taste.map((x, i) => (
            <div key={x.t} className={`card-w t${x.on ? '' : ' off'}`}>
              <div><h2>{x.t}</h2><p>{x.why}</p></div>
              <label className="scale">{x.a}<input type="range" min={0} max={100} value={x.v} aria-label={x.t} onChange={(e) => setTaste((s) => s.map((y, j) => (j === i ? { ...y, v: +e.target.value } : y)))} />{x.b}</label>
              <button className={`tog${x.on ? ' on' : ''}`} role="switch" aria-checked={x.on} aria-label={`Учитывать: ${x.t}`} onClick={() => setTaste((s) => s.map((y, j) => (j === i ? { ...y, on: !y.on } : y)))} />
            </div>
          ))}
        </div>
        <div className="note"><button className="btn-ghost" onClick={() => setTaste(TASTE.map((t) => ({ ...t, on: false })))}>Сбросить профиль</button><span>Профиль меняет только порядок отелей и подсказки. Факты об отелях от него не зависят.</span></div>

        <h2 className="h-md">Прошлые поездки</h2>
        <div className="past">
          {PAST.map(([id, ph, n, d, s]) => (
            <Link key={id} to={`/hotels/${id}`} className="card-w past-c"><Photo k={ph} alt={n} credit={false} /><b>{n}</b><span>{d} · {s}</span></Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
