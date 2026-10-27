'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Header } from '../components/chrome';
import { Demo, Mark, Toast, useToast } from '../components/ui';
import { MapView } from '../components/MapView';
import { HOTELS } from '../data/hotels';

type Reg = { n: string; sub: string; kind: 'calc' | 'open' | 'hotel'; kl: string; cov: number; c: string; r: string; fresh?: boolean };
const REG: Reg[] = [
  { n: 'Закат над морем', sub: 'по фасаду, этажу и месяцу', kind: 'calc', kl: 'расчёт', cov: 214, c: '0,78', r: 'раз в 180 дней или при изменении карты' },
  { n: 'Шум ночью', sub: 'по сторонам здания', kind: 'calc', kl: 'расчёт', cov: 214, c: '0,84', r: 'при изменении карты' },
  { n: 'Дорога до пляжа', sub: 'время, подъём, ступени', kind: 'calc', kl: 'расчёт', cov: 208, c: '0,81', r: 'при изменении карты' },
  { n: 'Вид на горы', sub: 'с названиями вершин', kind: 'calc', kl: 'расчёт', cov: 214, c: '0,80', r: 'при изменении карты' },
  { n: 'Погода и вода в даты', sub: 'норма за 10 лет', kind: 'open', kl: 'открытые данные', cov: 214, c: '0,90', r: 'раз в год' },
  { n: 'Что работает ночью', sub: 'аптеки, кафе, магазины', kind: 'open', kl: 'открытые данные', cov: 189, c: '0,66', r: 'раз в 90 дней' },
  { n: 'Детские площадки рядом', sub: 'в 5 минутах пешком', kind: 'open', kl: 'открытые данные', cov: 197, c: '0,72', r: 'раз в 90 дней' },
  { n: 'Номера по сторонам здания', sub: 'разметка фасадов', kind: 'hotel', kl: 'отель', cov: 67, c: '0,95', r: 'раз в год' },
  { n: 'С собакой', sub: 'правила и доплата', kind: 'hotel', kl: 'отель', cov: 41, c: '0,93', r: 'раз в 90 дней' },
];
const RUNS = [
  { n: 'Исследователь · Маяк', g: 'вид на море по фасадам', st: 'готово · 4,2 с', steps: [
    ['reason', 'Нужен вид на море по фасадам и этажам. Высоты соседних домов в OSM нет у 2 из 5 — оценю с разбросом.', '0:00'],
    ['tool', 'osm_buildings(радиус 300 м)', '0:01', '→ 41 здание, этажность у 26'],
    ['tool', 'horizon(фасады ×4, этажи 2–8, DEM 30 м)', '0:02', '→ 28 профилей горизонта'],
    ['tool', 'monte_carlo(высоты ±1 этаж, 100 прогонов)', '0:03', '→ ЮЗ ≥4 эт.: море в 82/100'],
    ['reason', 'Расчёт уверенный для ЮЗ, но неизвестно, какие номера там. Ставлю вопрос отелю.', '0:04'],
    ['result', 'Факт сохранён: «море с ЮЗ, этаж ≥ 4», 0,82. Вопрос отелю — приоритет 1.', '0:04'],
  ] },
  { n: 'Связной · 6 отелей', g: '«с собакой 30 кг»', st: 'готово · 38 с', steps: [
    ['reason', 'Правила для животных по карте не посчитать — только отель.', '0:00'],
    ['tool', 'ask_hotelier(6 отелей, «Можно ли с собакой 30 кг? Доплата?»)', '0:01', '→ 6 вопросов в кабинетах'],
    ['tool', 'parse_answer(«Маяк»: «да, до 40 кг, 1500 в сутки»)', '0:21', '→ pets=yes, max_kg=40, fee=1500'],
    ['tool', 'parse_answer(«Прибой»: «нет»)', '0:30', '→ pets=no'],
    ['result', '4 ответа из 6 за 38 с. Выдача гостя обновлена.', '0:38'],
  ] },
  { n: 'Куратор · новая характеристика', g: '«хинкальная в 10 минутах»', st: 'готово · 52 с', steps: [
    ['reason', 'Это вычислимо: кафе с грузинской кухней + пеший маршрут.', '0:00'],
    ['tool', 'compile_recipe(osm_query → route_to → threshold)', '0:02', '→ рецепт из 3 шагов'],
    ['tool', 'dry_run(5 отелей)', '0:05', '→ 4 да, 1 нет; проверено глазами'],
    ['result', 'Опубликовано для 214 отелей.', '0:52'],
  ] },
  { n: 'Сверщик · Маяк', g: 'описание против расчёта', st: 'ждёт отель', steps: [
    ['reason', 'Описание отеля: «море из всех номеров». Расчёт: только ЮЗ ≥ 4. Расхождение больше порога.', '0:00'],
    ['tool', 'rule(physics_over_marketing)', '0:00', '→ показываем расчёт гостям'],
    ['result', 'Конфликт открыт, отелю ушло уведомление.', '0:01'],
  ] },
] as const;
const TY: Record<string, string> = { reason: 'рассуждение', tool: 'инструмент', result: 'итог' };
const DRY = [['Маяк', 'n', 'без ступеней только в обход — 11 мин, уклон 11%', '0,82'], ['Кипарис', 'y', '5 мин по ровной улице', '0,88'], ['Лазурь', 'y', '2 мин, набережная', '0,93'], ['Прибой', 'n', 'только лестница, 140 ступеней', '0,90'], ['Сириус Парк', 'y', '7 мин, ровная дорожка', '0,91']] as const;
const RECIPE = [['osm_query', 'пешеходные пути без ступеней'], ['route_to', 'до пляжа, профиль «коляска»'], ['slope_max', 'уклон не круче 8%'], ['threshold', 'не дольше 15 минут → да / нет']];
const NAV = [['registry', 'Характеристики'], ['new', 'Новая характеристика'], ['agents', 'Работа агентов'], ['conflicts', 'Конфликты'], ['changes', 'Изменения мира'], ['quality', 'Качество']];

export default function ConsolePage() {
  const [toast, show] = useToast();
  const [reg, setReg] = useState(REG);
  const [desc, setDesc] = useState('Можно дойти с коляской до моря без ступеней');
  const [stage, setStage] = useState<'idle' | 'recipe' | 'publishing' | 'done'>('idle');
  const [run, setRun] = useState(0);
  const [built, setBuilt] = useState(false);
  const [feed, setFeed] = useState([
    ['В OSM появилась стройка рядом с «Прибоем»', '3 дня назад · пересчитали шум для 2 отелей', false],
    ['Отель «Кипарис» ответил про животных', '5 дней назад · новый факт', false],
    ['Плановая перепроверка климата', 'неделю назад · 214 отелей, изменений нет', false],
  ] as [string, string, boolean][]);
  const [active, setActive] = useState('registry');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('main section[id]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const publish = () => {
    setStage('publishing');
    timers.current.push(window.setTimeout(() => {
      setReg((r) => [{ n: desc, sub: 'новая · сегодня', kind: 'calc', kl: 'расчёт', cov: 206, c: '0,85', r: 'при изменении карты', fresh: true }, ...r]);
      setStage('done'); show('Характеристика доступна в поиске');
      document.getElementById('registry')?.scrollIntoView({ behavior: 'smooth' });
    }, 1600));
  };
  const build = () => {
    setBuilt(true);
    const add = (t: string, s: string, d: number) => timers.current.push(window.setTimeout(() => setFeed((f) => [[t, s, true], ...f]), d));
    add('В OSM появилось здание: 7 этажей, 40 м от «Маяка»', 'только что', 600);
    add('Пересчитали вид для 3 отелей', 'Исследователь · 3,1 с', 1500);
    add('«Маяк»: море со 2–5 этажей ЮЗ-фасада пропало', 'уверенность «закат, этаж ≥ 4» → «этаж ≥ 6»', 2300);
    add('Уведомили отель и 1 гостя с будущей бронью', 'гостю предложили этаж 6–8 без доплаты', 3000);
  };

  return (
    <div className="canvas-page">
      <Header />
      <div className="shell">
        <nav className="side-nav" aria-label="Консоль">
          <div className="who"><b>Большой Сочи</b><span>214 отелей · 38 характеристик</span></div>
          {NAV.map(([id, l]) => <a key={id} href={`#${id}`} className={active === id ? 'on' : ''}>{l}{id === 'conflicts' && <span className="cnt">2</span>}</a>)}
          <Link href="/developers">API и MCP</Link>
          <div className="foot">Данные: OSM (ODbL), Copernicus DEM, Open-Meteo. Карточки и цены — демо.</div>
        </nav>
        <main className="page console">
          <div className="page-h"><h1>Знания об отелях Сочи</h1><p>Что умеем узнавать, откуда, насколько уверены и когда перепроверим</p></div>
          <div className="cov-map card-w">
            <MapView pins={HOTELS.map((h) => ({ id: h.id, lngLat: h.lngLat, label: h.name }))} className="cmap" />
            <div className="cov-legend"><b className="num">214</b><span>отелей посчитано по фасадам и этажам</span><b className="num">92%</b><span>фактов без вопросов отелю</span></div>
          </div>

          <section className="sec" id="registry">
            <div className="sec-h"><h2>Характеристики</h2><p>Каждая — рецепт из инструментов и источник данных</p></div>
            <div className="regs">
              <AnimatePresence initial={false}>
                {reg.map((r) => (
                  <motion.div layout key={r.n} className={`rc-card${r.fresh ? ' fresh' : ''}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="rc-h"><b>{r.n}</b><span className={`src-k ${r.kind}`}>{r.kl}</span></div>
                    <span className="scope">{r.sub}</span>
                    <div className="cov"><span className="bar"><span style={{ width: `${(r.cov / 214) * 100}%` }} /></span><span className="num">{r.cov}/214</span></div>
                    <div className="rc-f"><span>уверенность <b className="num">{r.c}</b></span><span>{r.r}</span></div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          <section className="sec" id="new">
            <div className="sec-h"><h2>Новая характеристика</h2><p>Опишите словами — агент соберёт рецепт из инструментов и проверит на 5 отелях</p></div>
            <div className="composer card-w">
              <form className="in" onSubmit={(e) => { e.preventDefault(); setStage('recipe'); }}><input value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Описание характеристики" /><button className="btn btn-primary">Собрать рецепт</button></form>
              {stage !== 'idle' && (
                <div className="recipe">
                  <span className="lbl">Рецепт</span>
                  <div className="chain">{RECIPE.map(([c, p], i) => <motion.div key={c} className="step" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 + i * 0.35 } }}><code>{c}</code><p>{p}</p></motion.div>)}</div>
                  <span className="lbl">Пробный прогон</span>
                  <div className="drys">{DRY.map(([n, v, t, c]) => <div className="dt" key={n}><div className="dt-h"><Mark v={v === 'y' ? 'yes' : 'no'} /><b>{n}</b><span className="num">{c}</span></div><span>{t}</span></div>)}</div>
                  <div className="acts"><button className="btn btn-primary" disabled={stage !== 'recipe'} onClick={publish}>{stage === 'publishing' ? 'Считаем для 214 отелей…' : stage === 'done' ? 'Опубликовано ✓' : 'Опубликовать для 214 отелей'}</button><span className="muted">Займёт около минуты. Гости смогут искать по ней сразу.</span></div>
                </div>
              )}
            </div>
          </section>

          <section className="sec" id="agents">
            <div className="sec-h"><h2>Работа агентов</h2><p>Каждый шаг: что агент решил, какой инструмент вызвал и что получил</p></div>
            <div className="runs card-w">
              <div className="run-list">{RUNS.map((r, i) => <button key={r.n} className={`run${run === i ? ' on' : ''}`} onClick={() => setRun(i)}><span className="st">{r.st}</span><b>{r.n}</b><span>{r.g}</span></button>)}</div>
              <div className="trace">{RUNS[run].steps.map((s, i) => <motion.div key={`${run}-${i}`} className="tr" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.05 } }}><span className={`ty ${s[0]}`}>{TY[s[0]]}</span><span>{s[1]}{s[3] && <small>{s[3]}</small>}</span><span className="t num">{s[2]}</span></motion.div>)}</div>
            </div>
          </section>

          <section className="sec" id="conflicts">
            <div className="sec-h"><h2>Конфликты</h2><p>Когда источники расходятся, решаем по правилу и сообщаем отелю</p></div>
            <div className="cf card-w"><div><span className="lbl">Отель «Маяк»</span>«Вид на море из всех номеров»</div><div><span className="lbl">Расчёт</span>Только ЮЗ-фасад, этаж ≥ 4 · уверенность 0,9</div><div className="rule"><span className="lbl">Решение</span>Физика сильнее описания: показываем расчёт, отелю ушёл вопрос. <span className="tag warn">ждём отель</span></div></div>
            <div className="cf card-w"><div><span className="lbl">Гость после поездки</span>«Ночью было шумно» (Прибой)</div><div><span className="lbl">Расчёт</span>Ночью тихо · 0,75</div><div className="rule"><span className="lbl">Решение</span>Снизили уверенность до 0,6 и нашли причину: в OSM появилась стройка в 200 м. <span className="tag ok">исправлено</span></div></div>
          </section>

          <section className="sec" id="changes">
            <div className="sec-h"><h2>Изменения мира</h2><p>Карта меняется — факты пересчитываются сами</p><button className="btn btn-primary btn-sm right" disabled={built} onClick={build}>Демо: построить дом у «Маяка»</button></div>
            <div className="changes">
              <ul className="feed card-w">{feed.map(([t, s, hot], i) => <motion.li key={t} className={hot ? 'hot' : ''} initial={i === 0 && hot ? { opacity: 0, y: -8, backgroundColor: '#C9F59A' } : false} animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(0,0,0,0)' }} transition={{ duration: 1.2 }}><b>{t}</b><span>{s}</span></motion.li>)}</ul>
              <div className="city card-w">
                <svg viewBox="0 0 420 300" role="img" aria-label="Схема квартала у отеля «Маяк»">
                  <rect width="420" height="300" fill="var(--map-land)" />
                  <path d="M0 300 L 0 230 C 120 250, 260 270, 420 210 L 420 300 Z" fill="var(--map-sea)" />
                  <path d="M0 218 C 120 238, 260 258, 420 198" fill="none" stroke="var(--ink)" strokeWidth="2" strokeDasharray="8 6" opacity=".5" />
                  <motion.path d="M210 120 L 90 260 L 300 270 Z" fill="var(--verified)" animate={{ opacity: built ? 0.12 : 0.6 }} transition={{ delay: built ? 1.7 : 0, duration: 0.7 }} />
                  <rect x="180" y="80" width="64" height="44" fill="var(--primary)" rx="3" />
                  <text x="212" y="107" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="700">Маяк</text>
                  <rect x="60" y="60" width="50" height="40" fill="#D4DEFB" /><rect x="300" y="60" width="60" height="50" fill="#D4DEFB" /><rect x="280" y="140" width="44" height="36" fill="#D4DEFB" />
                  <motion.rect x="168" y="150" width="78" height="40" fill="var(--critical)" rx="3" style={{ transformOrigin: '207px 190px' }} initial={false} animate={{ scaleY: built ? 1 : 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
                  <text x="20" y="290" fontSize="12" fill="var(--muted)">море</text>
                  <text x="300" y="196" fontSize="12" fill="var(--muted)">ж/д</text>
                </svg>
              </div>
            </div>
          </section>

          <section className="sec" id="quality">
            <div className="sec-h"><h2>Качество</h2><p>Эталон: 48 отелей, размечено вручную <Demo>демо-цифры</Demo></p></div>
            <div className="qk num">
              {[['0,87', 'точность «вид на море» на эталоне'], ['0,06', 'ошибка калибровки уверенности (ECE)'], ['92%', 'фактов без вопросов отелю'], ['14%', 'фактов потребовали вопроса'], ['0,81', 'nDCG@5 поиска на 20 запросах']].map(([b, s]) => <div key={s}><b>{b}</b><span>{s}</span></div>)}
            </div>
            <div className="charts">
              <div className="card-w"><h3>Точность по характеристикам</h3><p className="muted">Доля совпадений с эталоном</p>
                <div className="bars">{[['Шум ночью', 0.91], ['Вид на море', 0.87], ['Дорога до пляжа', 0.85], ['Закат над морем', 0.83], ['Что работает ночью', 0.74]].map(([n, v]) => <div key={n} className="bar-row"><span>{n}</span><div><motion.i initial={{ width: 0 }} whileInView={{ width: `${(v as number) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} /></div><b className="num">{String(v).replace('.', ',')}</b></div>)}</div>
              </div>
              <div className="card-w"><h3>Калибровка уверенности</h3><p className="muted">Когда мы говорим «0,8», мы правы примерно в 80% случаев</p><Calibration /></div>
            </div>
          </section>
        </main>
      </div>
      <Toast text={toast} />
    </div>
  );
}

function Calibration() {
  const pts = [[0.15, 0.12], [0.35, 0.31], [0.55, 0.58], [0.72, 0.69], [0.85, 0.86], [0.95, 0.91]];
  const X = (v: number) => 50 + v * 380, Y = (v: number) => 190 - v * 170;
  return (
    <svg viewBox="0 0 460 222" className="cal" role="img" aria-label="Диаграмма калибровки">
      <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(0)} stroke="var(--line)" /><line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(1)} stroke="var(--line)" />
      <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} stroke="var(--muted)" strokeDasharray="4 4" />
      <text x={X(0.62)} y={Y(0.78)} fontSize="12" fill="var(--muted)" transform={`rotate(-24 ${X(0.62)} ${Y(0.78)})`}>идеальная калибровка</text>
      <polyline points={pts.map(([a, b]) => `${X(a)},${Y(b)}`).join(' ')} fill="none" stroke="var(--primary)" strokeWidth="2.5" />
      {pts.map(([a, b]) => <circle key={a} cx={X(a)} cy={Y(b)} r="5" fill="var(--primary)" />)}
      <text x={X(0)} y="212" fontSize="12" fill="var(--muted)">0</text><text x={X(1)} y="212" fontSize="12" fill="var(--muted)" textAnchor="end">заявленная уверенность → 1,0</text>
      <text x={X(0) + 8} y={Y(1) + 4} fontSize="12" fill="var(--muted)">доля верных</text>
    </svg>
  );
}
