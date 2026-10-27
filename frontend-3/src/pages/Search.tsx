import { LayoutGroup, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Footer, Header } from '../components/chrome';
import { HotelCard } from '../components/HotelCard';
import { MapView } from '../components/MapView';
import { Demo, Icon } from '../components/ui';
import { Panorama, Photo } from '../components/visuals';
import { WishBox } from '../components/WishBox';
import { CHARACTERISTICS, DEFAULT_INTENT, MOODS, parseIntent } from '../data/characteristics';
import { HOTELS } from '../data/hotels';
import { rub } from '../lib/format';
import { rank } from '../lib/score';
import { useStore } from '../state/store';

type Phase = 'landing' | 'thinking' | 'loading' | 'results';
const STEPS = ['Понимаю запрос', 'Считаю вид и шум для 214 отелей', 'Сверяю ответы отелей'];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const AGENT_SCRIPTS: Record<string, { run: string; done: string; steps: [string, string][] }> = {
  ask: { run: 'Агент спрашивает 6 отелей', done: 'Ответили 4 отеля из 6 · выдача обновлена', steps: [['рассуждение', 'По карте это не посчитать — знает только отель'], ['ask_hotelier', 'Отправил вопрос в кабинеты 6 отелей'], ['ответы', '«Маяк», «Кипарис», «Сосновый склон» — да; «Прибой» — нет'], ['готово', 'Факты сохранены с источником «отель» и датой']] },
  compute: { run: 'Агент учится считать новую характеристику', done: 'Посчитано для 8 отелей · выдача обновлена', steps: [['рассуждение', 'Это можно посчитать по карте: кафе грузинской кухни + пешком'], ['рецепт', 'osm_query(cuisine=georgian) → route_to(пешком) ≤ 10 мин'], ['пробный прогон', 'Проверено на 8 отелях: 5 подходят']] },
};

export default function SearchPage() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { query, setQuery, chips, setChips, known, learn } = useStore();
  const [phase, setPhase] = useState<Phase>(pathname === '/' ? 'landing' : 'results');
  const [step, setStep] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [researching, setResearching] = useState<Set<string>>(new Set());
  const [agent, setAgent] = useState<{ key: string; done: boolean; open: boolean } | null>(null);
  const [wideMap, setWideMap] = useState(false);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, reduced() ? 0 : ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // прямой заход на /search — показываем выдачу по умолчанию
  useEffect(() => {
    if (pathname === '/search' && phase === 'landing') setPhase('results');
    if (pathname === '/' && phase === 'results') setPhase('landing');
    if (pathname === '/search' && !chips.length) setChips(DEFAULT_INTENT.map((c) => ({ ...c })));
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = useMemo(() => rank(HOTELS, chips, known), [chips, known]);
  const app = phase !== 'landing' && phase !== 'thinking';

  function start(placeholder: string, preset?: typeof chips, text?: string) {
    const q = text ?? (query.trim() || placeholder);
    setQuery(q);
    setChips(preset ?? (chips.length ? chips : parseIntent(q)));
    if (app) { setPhase('loading'); setStep(2); later(() => setPhase('results'), 650); return; }
    setPhase('thinking');
    later(() => { setPhase('loading'); setStep(0); nav('/search'); window.scrollTo({ top: 0 }); }, 900);
    later(() => setStep(1), 1350);
    later(() => setStep(2), 1750);
    later(() => setPhase('results'), 2150);
  }

  function addWish(key: string) {
    setChips((c) => [...c, { key, importance: 'important' }]);
    if (known.has(key)) return;
    setResearching((r) => new Set(r).add(key));
    setAgent({ key, done: false, open: false });
    later(() => {
      learn(key);
      setResearching((r) => { const n = new Set(r); n.delete(key); return n; });
      setAgent((a) => (a ? { ...a, done: true } : a));
      setFlash(key);
      later(() => setFlash(null), 1300);
    }, 2600);
  }
  const script = agent ? AGENT_SCRIPTS[CHARACTERISTICS[agent.key].checkable === 'ask_hotelier' ? 'ask' : 'compute'] : null;

  return (
    <LayoutGroup>
      <div className={`search-page ${app ? 'is-app' : 'is-landing'}`}>
        <motion.section layout transition={{ type: 'spring', stiffness: 200, damping: 30 }} className="lime">
          <Header tone="lime" />
          <div className={`lime-in${app ? ' app' : ''}`}>
            <div className="hero">
              <div className="hero-l">
                {!app && (
                    <div className={`hero-copy${phase === 'thinking' ? ' fading' : ''}`}>
                      <h1>Каким будет ваш номер — <em>видно до&nbsp;поездки</em></h1>
                      <p className="lede">Опишите отдых своими словами. Мы посчитаем вид из окна, шум и дорогу до моря для каждого этажа отелей Сочи — и покажем, откуда это знаем.</p>
                    </div>
                  )}
                <WishBox query={query} onQuery={setQuery} chips={chips} onChips={setChips} known={known} researching={researching} compact={app} thinking={phase === 'thinking' || phase === 'loading'}
                  label={phase === 'thinking' || phase === 'loading' ? 'Подбираю' : app ? 'Уточнить' : 'Подобрать'} onSubmit={(ph) => start(ph)} onAdd={addWish} />
                {app && (
                  <div className="status" aria-live="polite">
                    {phase === 'loading' ? (
                      STEPS.map((s, i) => <span key={s} className={`st ${i < step ? 'done' : i === step ? 'run' : ''}`}><i />{s}</span>)
                    ) : (
                      <span className="hint">Закат зависит от дат: <b>10–15 ноября</b> солнце садится в море около 16:58 <button type="button" className="opt">Другие даты</button></span>
                    )}
                  </div>
                )}
              </div>
              {!app && <HeroWindow fading={phase === 'thinking'} />}
            </div>
          </div>
        </motion.section>

        {!app && <Landing onMood={(m) => start('', m.chips.map((c) => ({ ...c })), m.title)} />}

        {app && (
          <div className={`work${wideMap ? ' map-wide' : ''}`}>
            <section className="list" aria-live="polite">
              <div className="list-head">
                <h2>Подходят</h2>
                <span className="cnt num">{phase === 'loading' ? 'ищем среди 214 отелей…' : `${ranked.length} из 214 отелей Большого Сочи`}</span>
                <span className="sort">по совпадению</span>
              </div>
              {agent && script && (
                <div className={`agent${agent.done ? ' done' : ''}${agent.open ? ' open' : ''}`}>
                  <button type="button" aria-expanded={agent.open} onClick={() => setAgent({ ...agent, open: !agent.open })}>
                    <span className="st" /><span>{agent.done ? script.done : `${script.run}: «${CHARACTERISTICS[agent.key].label}»…`}</span>
                    <span className="more">как искали <i>▾</i></span>
                  </button>
                  {agent.open && <ol>{script.steps.map(([t, s]) => <li key={t}><span className="tool">{t}</span><span>{s}</span></li>)}</ol>}
                </div>
              )}
              {phase === 'loading'
                ? [0, 1, 2].map((i) => <div key={i} className="skel" />)
                : ranked.map((m, i) => <HotelCard key={m.hotel.id} m={m} chips={chips} known={known} index={i} flash={flash} hl={hover === m.hotel.id} onHover={setHover} />)}
            </section>
            <aside className="map-col">
              <MapView className="results-map" hover={hover} onHover={setHover} onPick={(id) => nav(`/hotels/${id}`)}
                pins={phase === 'loading' ? [] : ranked.map((m, i) => ({ id: m.hotel.id, lngLat: m.hotel.lngLat, label: `${m.score}%`, sub: rub(m.hotel.priceFrom), top: i === 0 }))} />
              <button type="button" className="map-toggle" onClick={() => setWideMap((w) => !w)}><Icon name="expand" size={15} />{wideMap ? 'Карта меньше' : 'Карта крупнее'}</button>
            </aside>
          </div>
        )}
      </div>
    </LayoutGroup>
  );
}

function HeroWindow({ fading }: { fading: boolean }) {
  const [floor, setFloor] = useState(3);
  const [sea, setSea] = useState(0);
  return (
    <motion.figure className="hero-window" initial={{ opacity: 0, y: 12 }} animate={fading ? { opacity: 0, scale: 0.94, y: -10 } : { opacity: 1, scale: 1, y: 0 }} transition={{ duration: fading ? 0.7 : 0.5, ease: [0.22, 1, 0.36, 1] }}>
      <div className="stage"><Panorama facade="SW" floor={floor} onReading={(r) => setSea(r.seaShare)} /></div>
      <div className="ctrl">
        <label htmlFor="hero-floor">Этаж <b className="num">{floor}</b></label>
        <input id="hero-floor" type="range" min={2} max={8} value={floor} onChange={(e) => setFloor(+e.target.value)} />
        <span>море <b className="num">{sea}%</b></span>
      </div>
      <figcaption>Подвигайте этаж — так мы считаем вид из каждого номера · <Demo /></figcaption>
    </motion.figure>
  );
}

function Landing({ onMood }: { onMood(m: (typeof MOODS)[number]): void }) {
  return (
    <div className="sheet">
      <section className="sec-l">
        <div className="sec-lh"><h2>Начните с настроения</h2><p>Подборки собраны из наших расчётов, а не из рекламы</p></div>
        <div className="moods">
          {MOODS.map((m) => (
            <button key={m.id} type="button" className="mood" onClick={() => onMood(m)}>
              <Photo k={m.photo} alt="" credit={false} />
              <span className="mood-t"><b>{m.title}</b><span className="num">{m.proof}</span><span className="cta">Подобрать <Icon name="arrow" size={15} /></span></span>
            </button>
          ))}
        </div>
      </section>

      <section className="sec-l">
        <div className="sec-lh"><h2>Откуда мы это знаем</h2><p>Не из рекламы отеля и не из догадок нейросети. У каждого факта есть источник, дата и уверенность.</p></div>
        <div className="src3">
          <div className="src"><span className="k"><Icon name="sun" /> Считаем</span><h3>По рельефу и зданиям</h3><p>Для каждого фасада и этажа строим линию горизонта и путь солнца в ваши даты.</p><ul><li>вид на море, горы, закат</li><li>шум по сторонам здания</li><li>подъёмы, ступени и переходы до пляжа</li></ul></div>
          <div className="src"><span className="k"><Icon name="pin" /> Берём из открытых данных</span><h3>Карта и климат</h3><p>OpenStreetMap, Copernicus, Open-Meteo — с атрибуцией и датой выгрузки.</p><ul><li>что работает рядом ночью</li><li>погода и вода по дням поездки</li><li>аптеки, кафе, площадки</li></ul></div>
          <div className="src"><span className="k"><Icon name="question" /> Спрашиваем отель</span><h3>Только то, что не посчитать</h3><p>Три точных вопроса вместо анкеты: те, что важнее всего гостям.</p><ul><li>какие номера на какой стороне</li><li>правила для животных</li><li>шумоизоляция окон</li></ul></div>
        </div>
      </section>

      <section className="sec-l proof">
        <div>
          <h2>Нажмите «почему» у любого факта</h2>
          <p>Покажем метод, источники, уверенность и что может пойти не так. Если не знаем — так и скажем и спросим отель.</p>
          <Link className="btn btn-primary" to="/hotels/mayak">Посмотреть на примере «Маяка»</Link>
        </div>
        <div className="proof-card">
          <div className="lbl">Почему мы так думаем</div>
          <div className="stmt">Море видно из окон ЮЗ-фасада начиная с 4-го этажа</div>
          <div className="bar"><span style={{ width: '82%' }} /></div>
          <dl>
            <div><dt>Уверенность</dt><dd><b className="num">82 из 100</b> симуляций с учётом погрешности высот домов показывают море</dd></div>
            <div><dt>Источники</dt><dd>Copernicus DEM 30 м · здания OSM, сентябрь 2026 · ответ отеля, 12 октября</dd></div>
            <div><dt>Что может пойти не так</dt><dd>Деревья не учитываем; высота дома напротив оценена</dd></div>
          </dl>
        </div>
      </section>

      <section className="sec-l tiles4">
        <div className="tile-a"><b className="num">214</b><span>отелей Большого Сочи<br />посчитано по этажам</span></div>
        <div className="tile-a"><b className="num">38</b><span>характеристик сверх<br />карточки отеля</span></div>
        <Link className="tile-b" to="/partner"><h3>Отельерам</h3><p>Отвечайте на 3 вопроса в неделю — остальное посчитаем сами. Гости найдут вас за то, чем вы правда хороши.</p><span className="goto">Открыть кабинет <Icon name="arrow" size={16} /></span></Link>
        <Link className="tile-c" to="/developers"><h3>Разработчикам и AI-агентам</h3><p>Те же факты с доказательствами через API и MCP.</p><code>GET /v1/hotels/mayak/facts</code><span className="goto">Документация <Icon name="arrow" size={16} /></span></Link>
      </section>
      <Footer />
    </div>
  );
}
