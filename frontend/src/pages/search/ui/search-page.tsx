'use client';

import { LayoutGroup, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Footer, Header } from '@/widgets/site-chrome';
import { HotelCard } from '@/widgets/hotel-card';
import { MapView } from '@/shared/ui/map';
import { Demo, Icon, Mark, SrcTag } from '@/shared/ui/primitives';
import { Photo } from '@/shared/ui/visuals';
import { WishBox } from '@/features/search-hotels';
import { CHARACTERISTICS, DEFAULT_INTENT, EXAMPLES, MOODS, parseIntent } from '@/entities/intent';
import { hotelQueries } from '@/entities/hotel';
import { useQuery } from '@tanstack/react-query';
import { rub } from '@/shared/lib/format';
import { setVariantsEnabled, useVariantsEnabled } from '@/features/landing-variants';
import { rank } from '@/features/search-hotels';
import { useSearchState } from '@/features/search-hotels';

type Phase = 'landing' | 'thinking' | 'loading' | 'results';
const STEPS = ['Понимаю запрос', 'Считаю вид и шум для 214 отелей', 'Сверяю ответы отелей'];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const AGENT_SCRIPTS: Record<string, { run: string; done: string; steps: [string, string][] }> = {
  ask: { run: 'Агент спрашивает 6 отелей', done: 'Ответили 4 отеля из 6 · выдача обновлена', steps: [['рассуждение', 'По карте это не посчитать — знает только отель'], ['ask_hotelier', 'Отправил вопрос в кабинеты 6 отелей'], ['ответы', '«Маяк», «Кипарис», «Сосновый склон» — да; «Прибой» — нет'], ['готово', 'Факты сохранены с источником «отель» и датой']] },
  compute: { run: 'Агент учится считать новую характеристику', done: 'Посчитано для 8 отелей · выдача обновлена', steps: [['рассуждение', 'Это можно посчитать по карте: кафе грузинской кухни + пешком'], ['рецепт', 'osm_query(cuisine=georgian) → route_to(пешком) ≤ 10 мин'], ['пробный прогон', 'Проверено на 8 отелях: 5 подходят']] },
};

export default function SearchPage() {
  const pathname = usePathname() ?? '/';
  const hotelsQuery = useQuery(hotelQueries.all());
  const nav = useRouter();
  const { query, setQuery, chips, setChips, known, learn } = useSearchState();
  const [phase, setPhase] = useState<Phase>(pathname === '/' ? 'landing' : 'results');
  const [step, setStep] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [researching, setResearching] = useState<Set<string>>(new Set());
  const [agent, setAgent] = useState<{ key: string; done: boolean; open: boolean } | null>(null);
  const [wideMap, setWideMap] = useState(false);
  const [variant, setVariant, variantsOn] = useVariant();
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, reduced() ? 0 : ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // прямой заход на /search — показываем выдачу по умолчанию
  useEffect(() => {
    if (pathname === '/search' && phase === 'landing') setPhase('results');
    if (pathname === '/' && phase === 'results') setPhase('landing');
    if (pathname === '/search' && !chips.length) setChips(DEFAULT_INTENT.map((c) => ({ ...c })));
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = useMemo(() => rank(hotelsQuery.data ?? [], chips, known), [hotelsQuery.data, chips, known]);
  const app = phase !== 'landing' && phase !== 'thinking';
  const loading = phase === 'loading' || hotelsQuery.isPending;

  function start(placeholder: string, preset?: typeof chips, text?: string) {
    // плейсхолдер печатается по буквам — берём пример целиком
    const full = EXAMPLES.find((e) => placeholder && e.startsWith(placeholder)) ?? EXAMPLES[0];
    const q = text ?? (query.trim() || full);
    setQuery(q);
    setChips(preset ?? (chips.length ? chips : parseIntent(q)));
    if (app) { setPhase('loading'); setStep(2); later(() => setPhase('results'), 650); return; }
    setPhase('thinking');
    later(() => { setPhase('loading'); setStep(0); nav.push('/search'); window.scrollTo({ top: 0 }); }, 900);
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

  const thinking = phase === 'thinking' || phase === 'loading';
  const wish = (
    <WishBox query={query} onQuery={setQuery} chips={chips} onChips={setChips} known={known} researching={researching} compact={app} thinking={thinking}
      label={thinking ? 'Подбираю' : app ? 'Уточнить' : 'Подобрать'} onSubmit={(ph) => start(ph)} onAdd={addWish} />
  );
  const status = app && (
    <div className="status" aria-live="polite">
      {phase === 'loading'
        ? STEPS.map((s, i) => <span key={s} className={`st ${i < step ? 'done' : i === step ? 'run' : ''}`}><i />{s}</span>)
        : <span className="hint">Закат зависит от дат: <b>10–15 ноября</b> солнце садится в море около 16:58 <button type="button" className="opt">Другие даты</button></span>}
    </div>
  );
  const fading = phase === 'thinking';
  const onExample = (t: string) => start('', undefined, t);
  const onMood = (m: (typeof MOODS)[number]) => start('', m.chips.map((c) => ({ ...c })), m.title);

  return (
    <LayoutGroup>
      <div className={`search-page v-${variant} ${app ? 'is-app' : 'is-landing'}`}>
        <motion.section layout transition={{ type: 'spring', stiffness: 200, damping: 30 }} className={`band band-${variant}${app ? ' app' : ''}${fading ? ' fading' : ''}`}>
          {variant === 'photo' && <div className="band-bg" aria-hidden="true"><Photo k="lux-hero" alt="" credit={false} /></div>}
          <Header tone={variant === 'photo' ? 'clear' : variant === 'lime' ? 'lime' : 'white'} />
          <div className={`band-in${app ? ' app' : ''}`}>
            {app ? <>{wish}{status}</> : variant === 'photo' ? (
              <div className="hero-c">
                <div className="hero-copy">
                  <span className="kicker"><Icon name="spark" size={15} />Большой Сочи · 214 отелей посчитано по этажам</span>
                  <h1>Опишите отдых — покажем, каким будет ваш номер</h1>
                  <p className="lede">Вид из окна, тишина ночью и дорога до моря — для каждого этажа. С источником у каждого факта.</p>
                </div>
                {wish}
                <Examples onPick={onExample} />
              </div>
            ) : variant === 'split' ? (
              <div className="hero-s">
                <div className="hero-l">
                  <div className="hero-copy">
                    <span className="kicker dark"><Icon name="spark" size={15} />Не просто отель. Номер, который вы ждёте</span>
                    <h1>Каким будет ваш номер — <em>видно до&nbsp;поездки</em></h1>
                    <p className="lede">Расскажите, о чём мечтаете. Мы проверим вид, шум и дорогу до моря по рельефу и картам — и честно скажем, где не уверены.</p>
                  </div>
                  {wish}
                  <Examples onPick={onExample} light />
                </div>
                <ProofCard />
              </div>
            ) : (
              <div className="hero-c">
                <div className="hero-copy">
                  <h1>Оооочень точный подбор номера</h1>
                  <p className="lede">Скажите, какой отдых хотите. Мы найдём отели Сочи, где это правда — до этажа и стороны здания.</p>
                </div>
                {wish}
                <Examples onPick={onExample} light />
              </div>
            )}
          </div>
          {!app && variant === 'photo' && <div className="band-proof"><span><b className="num">16:58</b> закат из номера 512 «Маяка» 11 ноября</span><span><b className="num">38 дБ</b> ночью в номерах во двор</span><span><b className="num">6 мин</b> до пляжа, 64 ступени</span><span className="muted-w">посчитано по рельефу и зданиям · <Demo /></span></div>}
        </motion.section>

        {!app && variant === 'lime' && <MoodStrip onMood={onMood} />}
        {!app && <Landing onMood={onMood} showMoods={variant !== 'lime'} />}
        {!app && variantsOn && <VariantSwitch value={variant} onChange={setVariant} />}

        {app && (
          <div className={`work${wideMap ? ' map-wide' : ''}`}>
            <section className="list" aria-live="polite">
              <div className="list-head">
                <h2>{query ? `«${query.length > 60 ? query.slice(0, 58) + '…' : query}»` : 'Подходят'}</h2>
                <span className="cnt num">{loading ? 'ищем среди 214 отелей…' : `${ranked.length} из 214 отелей Большого Сочи`}</span>
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
              {hotelsQuery.isError ? <div className="card-w" role="alert"><p>Не удалось загрузить отели.</p><button className="btn btn-primary" onClick={() => void hotelsQuery.refetch()}>Повторить</button></div> : loading
                ? [0, 1, 2].map((i) => <div key={i} className="skel" />)
                : ranked.map((m, i) => <HotelCard key={m.hotel.id} m={m} chips={chips} known={known} index={i} flash={flash} hl={hover === m.hotel.id} onHover={setHover} />)}
            </section>
            <aside className="map-col">
              <MapView className="results-map" hover={hover} onHover={setHover} onPick={(id) => nav.push(`/hotels/${id}`)}
                pins={loading ? [] : ranked.map((m, i) => ({ id: m.hotel.id, lngLat: m.hotel.lngLat, label: `${m.score}%`, sub: rub(m.hotel.priceFrom), top: i === 0 }))} />
              {(() => { const m = ranked.find((x) => x.hotel.id === hover) ?? ranked[0]; return !loading && m && (
                <Link className="map-card" href={`/hotels/${m.hotel.id}`}>
                  <Photo k={m.hotel.photos[0]} alt="" credit={false} />
                  <span><b>{m.hotel.name}</b><small>{m.hotel.district} · {m.score}% совпадение</small><small className="num">{rub(m.hotel.priceFrom)} за ночь</small></span>
                  <Icon name="arrow" size={16} />
                </Link>
              ); })()}
              <button type="button" className="map-toggle" onClick={() => setWideMap((w) => !w)}><Icon name="expand" size={15} />{wideMap ? 'Карта меньше' : 'Карта крупнее'}</button>
            </aside>
          </div>
        )}
      </div>
    </LayoutGroup>
  );
}

const EX_PROMPTS = ['Тихий номер с закатом над морем', 'Поработать неделю у моря', 'С собакой и рядом лес', 'С ребёнком, без подъёмов к пляжу'];
function Examples({ onPick, light }: { onPick(t: string): void; light?: boolean }) {
  return (
    <div className={`examples${light ? ' light' : ''}`}>
      <span>Например:</span>
      {EX_PROMPTS.map((t) => <button key={t} type="button" onClick={() => onPick(t)}>«{t}»</button>)}
    </div>
  );
}

function ProofCard() {
  return (
    <motion.figure className="proof-photo" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <Photo k="lux-h1a" alt="Номер с видом на закат над морем" credit={false} />
      <span className="pp-tag"><Icon name="pin" size={14} />Маяк · номер 512 · ЮЗ, 5 этаж</span>
      <motion.div className="pp-card" initial={{ opacity: 0, y: 20, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: -2 }} transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <div className="pp-h"><span>Почему этот номер ваш</span><b className="num">92%</b></div>
        <ul>
          <li><Mark v="yes" />Закат над морем в 16:58 <SrcTag kind="computed">расчёт</SrcTag></li>
          <li><Mark v="yes" />Ночью ≈ 38 дБ во двор <SrcTag kind="computed">расчёт</SrcTag></li>
          <li><Mark v="partial" />Ж/д в 60 м — берём 5 этаж <SrcTag kind="hotelier">отель</SrcTag></li>
        </ul>
        <Link href="/hotels/mayak">Посмотреть доказательства →</Link>
      </motion.div>
      <figcaption>Фото для настроения · <Demo /></figcaption>
    </motion.figure>
  );
}

function MoodStrip({ onMood }: { onMood(m: (typeof MOODS)[number]): void }) {
  return (
    <div className="mood-strip">
      {MOODS.map((m) => (
        <button key={m.id} type="button" className="mood" onClick={() => onMood(m)}>
          <Photo k={m.photo} alt="" credit={false} />
          <span className="mood-t"><b>{m.title}</b><span className="num">{m.proof}</span><span className="cta">Подобрать <Icon name="arrow" size={15} /></span></span>
        </button>
      ))}
    </div>
  );
}

type Variant = 'photo' | 'split' | 'lime';
const VARIANTS: [Variant, string, string][] = [['photo', 'A', 'Фото и поле по центру'], ['split', 'B', 'Номер с доказательством'], ['lime', 'C', 'Салатовый Островок']];
function useVariant(): [Variant, (v: Variant) => void, boolean] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const enabled = useVariantsEnabled();
  const fromUrl = sp?.get('v') as Variant | null;
  const [stored, setStored] = useState<Variant | null>(null);
  useEffect(() => { try { setStored(localStorage.getItem('okno-variant') as Variant | null); } catch { /* приватный режим */ } }, []);
  // без включённого режима всегда салатовый C
  const v: Variant = !enabled ? 'lime' : fromUrl && VARIANTS.some(([k]) => k === fromUrl) ? fromUrl : stored && VARIANTS.some(([k]) => k === stored) ? stored : 'lime';
  // вариант из ссылки запоминаем, чтобы выдача после перехода на /search была в том же стиле
  useEffect(() => { if (enabled && fromUrl && fromUrl !== stored) { try { localStorage.setItem('okno-variant', v); } catch { /* приватный режим */ } } }, [enabled, fromUrl, stored, v]);
  return [v, (n) => { try { localStorage.setItem('okno-variant', n); } catch { /* приватный режим */ } const params = new URLSearchParams(sp?.toString()); params.set('v', n); router.replace(`${pathname}?${params}`, { scroll: false }); }, enabled];
}

function VariantSwitch({ value, onChange }: { value: Variant; onChange(v: Variant): void }) {
  return (
    <div className="vswitch" role="group" aria-label="Вариант главной">
      <span>Лендинг</span>
      {VARIANTS.map(([k, l, t]) => <button key={k} className={value === k ? 'on' : ''} aria-pressed={value === k} title={t} onClick={() => onChange(k)}><b>{l}</b></button>)}
      <button className="vswitch-x" aria-label="Скрыть варианты лендинга" title="Скрыть варианты лендинга" onClick={() => { onChange('lime'); setVariantsEnabled(false); }}>×</button>
    </div>
  );
}

function Landing({ onMood, showMoods }: { onMood(m: (typeof MOODS)[number]): void; showMoods: boolean }) {
  return (
    <div className="sheet">
      {showMoods && <section className="sec-l">
        <div className="sec-lh"><h2>Начните с настроения</h2><p>Подборки собраны из наших расчётов, а не из рекламы</p></div>
        <div className="moods">
          {MOODS.map((m) => (
            <button key={m.id} type="button" className="mood" onClick={() => onMood(m)}>
              <Photo k={m.photo} alt="" credit={false} />
              <span className="mood-t"><b>{m.title}</b><span className="num">{m.proof}</span><span className="cta">Подобрать <Icon name="arrow" size={15} /></span></span>
            </button>
          ))}
        </div>
      </section>}

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
          <Link className="btn btn-primary" href="/hotels/mayak">Посмотреть на примере «Маяка»</Link>
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
        <Link className="tile-b" href="/partner"><h3>Отельерам</h3><p>Отвечайте на 3 вопроса в неделю — остальное посчитаем сами. Гости найдут вас за то, чем вы правда хороши.</p><span className="goto">Открыть кабинет <Icon name="arrow" size={16} /></span></Link>
        <Link className="tile-c" href="/developers"><h3>Разработчикам и AI-агентам</h3><p>Те же факты с доказательствами через API и MCP.</p><code>GET /v1/hotels/mayak/facts</code><span className="goto">Документация <Icon name="arrow" size={16} /></span></Link>
      </section>
      <Footer />
    </div>
  );
}
