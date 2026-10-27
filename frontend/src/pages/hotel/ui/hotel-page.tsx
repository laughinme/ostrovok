'use client';

import { Drawer } from '@/shared/ui/drawer';

import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Footer, Header } from '@/widgets/site-chrome';
import { MapView } from '@/shared/ui/map';
import { Lightbox, WhyPanel, type GalleryItem } from '@/widgets/hotel-evidence';
import { Conf, Demo, Icon, Mark, Ring, SrcTag, Stars, Toast, useToast } from '@/shared/ui/primitives';
import { Building, Panorama, Photo } from '@/shared/ui/visuals';
import { CHARACTERISTICS, DEFAULT_INTENT } from '@/entities/intent';
import { byId } from '@/entities/hotel/api/demo';
import type { Facade } from '@/shared/model';
import type { Fact } from '@/entities/hotel';
import { FACADE_NAME } from '@/shared/lib/building';
import { decimal, rub } from '@/shared/lib/format';
import { score, verdict } from '@/features/search-hotels';
import { useSearchState } from '@/features/search-hotels';
import { useHotelSelection } from '@/features/select-hotels';

const FACADE_TEXT: Record<Facade, string> = { NE: 'горы', SE: 'море частично', SW: 'море и закат', NW: 'город' };
const FACADE_COLOR: Record<Facade, string> = { NE: '#9BD08A', SE: '#9DB5F5', SW: 'var(--primary)', NW: '#C9D0E2' };
const NOISE = {
  night: { SW: ['#D2463B', '≈55 дБ', 'ж/д, ночные поезда'], SE: ['#B7860B', '≈45 дБ', 'ул. Морская'], NE: ['#1E8F4E', '≈38 дБ', 'двор'], NW: ['#B7860B', '≈43 дБ', 'соседний дом'] },
  day: { SW: ['#D2463B', '≈63 дБ', 'ж/д и пляж'], SE: ['#D2463B', '≈58 дБ', 'ул. Морская'], NE: ['#1E8F4E', '≈44 дБ', 'двор'], NW: ['#B7860B', '≈50 дБ', 'соседний дом'] },
} as const;
const DAYS = [['пн', 10, 17, '16:58', 18, 10], ['вт', 11, 16, '16:57', 18, 25], ['ср', 12, 15, '16:56', 17, 40], ['чт', 13, 16, '16:55', 17, 20], ['пт', 14, 17, '16:54', 17, 10], ['сб', 15, 16, '16:53', 17, 15]] as const;

export default function HotelPage() {
  const h = byId(useParams<{ id: string }>()?.id);
  const nav = useRouter();
  const { chips: storeChips, known } = useSearchState();
  const { favorites, toggleFavorite, compare, toggleCompare } = useHotelSelection();
  const chips = storeChips.length ? storeChips : DEFAULT_INTENT;
  const m = score(h, chips, known);
  const [facade, setFacade] = useState<Facade>(h.bestFacade);
  const [floor, setFloor] = useState(h.bestFloor);
  const [reading, setReading] = useState({ seaShare: 0, sunVisible: false });
  const [noise, setNoise] = useState<'night' | 'day'>('night');
  const [why, setWhy] = useState<Fact | null>(null);
  const [lb, setLb] = useState<number | null>(null);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [toast, showToast] = useToast();
  const [stuck, setStuck] = useState(false);
  useEffect(() => { const f = () => setStuck(scrollY > 640); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }, []);

  const gallery: GalleryItem[] = useMemo(() => [...h.photos.map((key) => ({ kind: 'photo' as const, key })), { kind: 'view' as const }, { kind: 'noise' as const }], [h]);
  const route = useMemo(() => {
    const [x, y] = h.lngLat;
    const coords: [number, number][] = [[x, y], [x - 0.0004, y - 0.00015], [x - 0.0007, y - 0.0005], [x - 0.001, y - 0.0008], [x - 0.0013, y - 0.0011]];
    return { line: { coords }, pois: [
      { lngLat: coords[0], label: h.name, kind: 'start' as const },
      { lngLat: coords[1], label: 'Кофейня «Зерно» · 2 мин' },
      { lngLat: coords[3], label: 'Тоннель под ж/д' },
      { lngLat: coords[4], label: 'Пляж', kind: 'end' as const },
    ] };
  }, [h]);
  const roomsForFacade = h.rooms.filter((r) => r.facades.includes(facade));
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const fav = favorites.includes(h.id), inCmp = compare.includes(h.id);

  return (
    <div className="hotel-page">
      <Header />
      <div className="hp">
        <div className="crumbs-row">
          <Link className="pill-btn" href="/search"><Icon name="back" size={16} />Все варианты в Сочи</Link>
          <Link className="pill-btn" href="/"><Icon name="spark" size={16} />Новый поиск</Link>
        </div>

        <section className="hp-head card-w">
          <div>
            <h1>{h.name} <Stars n={h.stars} /> <Demo /></h1>
            <div className="hp-addr"><b>{h.address}</b> · <button className="link" onClick={() => scrollTo('where')}>Показать на карте</button></div>
            <div className="hp-dist">{h.toCenter} · {h.toSea}</div>
          </div>
          <div className="hp-cta">
            <div className="hp-price">от <b className="num">{rub(h.priceFrom)}</b></div>
            <button className={`fav-btn${fav ? ' on' : ''}`} aria-pressed={fav} aria-label="В избранное" onClick={() => toggleFavorite(h.id)}><Icon name="heart" size={20} /></button>
            <button className="btn btn-primary" onClick={() => scrollTo('rooms')}>Выбрать номер</button>
          </div>
        </section>

        <section className="mosaic">
          {gallery.slice(0, 7).map((g, i) => (
            <button key={i} className={`mz mz-${i}`} onClick={() => setLb(i)} aria-label={`Открыть фото ${i + 1}`}>
              {g.kind === 'photo' && <Photo k={g.key} alt={`${h.name}, фото ${i + 1}`} credit={i === 0} facade={h.bestFacade} floor={h.bestFloor} />}
              {g.kind === 'view' && <div className="mz-scene"><Panorama facade={h.bestFacade} floor={h.bestFloor} labels={false} /><span>Вид из окна · расчёт</span></div>}
              {g.kind === 'noise' && <div className="mz-light"><Building name={h.name} sides={{ SW: { color: '#D2463B', text: '≈55 дБ' }, SE: { color: '#B7860B', text: '≈45 дБ' }, NE: { color: '#1E8F4E', text: '≈38 дБ' }, NW: { color: '#B7860B', text: '≈43 дБ' } }} /></div>}
              {i === 6 && gallery.length > 7 && <span className="more">+{gallery.length - 7} фото</span>}
            </button>
          ))}
          <span className="mz-note">Демо-фото — иллюстрации из Wikimedia Commons, не этот отель</span>
        </section>

        <section className="trio">
          <div className="card-w t-match">
            <div className="t-h"><Ring value={m.score} size={74} label="" /><div><b>Совпадение с вашим запросом</b><span>риск разочарования {m.risk}%</span></div></div>
            <ul className="vlist">{chips.map((c) => { const p = known.has(c.key) ? h.wish[c.key]?.[0] ?? null : null; return <li key={c.key}><Mark v={verdict(p)} />{p == null ? `${CHARACTERISTICS[c.key].label}: выясняем` : h.wish[c.key][1]}</li>; })}</ul>
            <p className="trade">{h.tradeoff}</p>
          </div>
          <div className="card-w">
            <div className="t-rating"><span className="rating-v num">{decimal(h.rating)}</span><div><b>{h.ratingLabel}</b><span>оценка гостей <Demo /></span></div></div>
            <h3 className="t-title">Популярные удобства</h3>
            <ul className="amen">{h.amenities.map((a) => <li key={a}><Icon name="check" size={16} />{a}</li>)}</ul>
          </div>
          <div className="card-w">
            <h3 className="t-title">Что есть рядом</h3>
            <ul className="near">{h.nearby.map(([ic, n, d]) => <li key={n}><span className="near-ic"><Icon name={ic} size={17} /></span><span>{n}</span><b className="num">{d}</b></li>)}</ul>
            <button className="btn-ghost wide" onClick={() => scrollTo('morning')}>Как дойти до моря</button>
          </div>
        </section>

        <section className="sec-h2"><h2>Как это будет</h2><p>Ваш номер в ваши даты: вид, ночь, утро и погода — с доказательствами</p></section>

        <section className="window-card card-w" id="window">
          <div className="w-head">
            <h3>Ваше окно</h3>
            <svg className="compass" viewBox="-30 -30 60 60" aria-hidden="true"><g transform="rotate(45)">{(['NE', 'SE', 'SW', 'NW'] as Facade[]).map((f, i) => <path key={f} d={['M0 0 L0 -26 A26 26 0 0 1 26 0 Z', 'M0 0 L26 0 A26 26 0 0 1 0 26 Z', 'M0 0 L0 26 A26 26 0 0 1 -26 0 Z', 'M0 0 L-26 0 A26 26 0 0 1 0 -26 Z'][i]} fill={FACADE_COLOR[f]} opacity={f === facade ? 1 : 0.35} />)}</g><circle r="6" fill="#fff" stroke="var(--ink)" strokeWidth="1.5" /><text y="-29" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--ink)">С</text></svg>
            <div className="fac" role="group" aria-label="Сторона здания">
              {(['NE', 'SE', 'SW', 'NW'] as Facade[]).map((f) => <button key={f} className={f === facade ? 'on' : ''} aria-pressed={f === facade} onClick={() => setFacade(f)}><i style={{ background: FACADE_COLOR[f] }} />{FACADE_NAME[f]} · {FACADE_TEXT[f]}</button>)}
            </div>
            <span className="read">10–15 ноября · закат <b>16:53–16:58</b></span>
          </div>
          <div className="w-stage"><Panorama facade={facade} floor={floor} onReading={setReading} /></div>
          <div className="w-foot">
            <label className="floor">Этаж <b className="num">{floor}</b><input type="range" min={2} max={8} value={floor} onChange={(e) => setFloor(+e.target.value)} aria-label="Этаж" /></label>
            <span className="read">море в окне <b className="num">{reading.seaShare ? `${reading.seaShare}%` : 'не видно'}</b></span>
            <span className="read">закат <b>{reading.sunVisible ? 'видно' : 'не видно'}</b></span>
          </div>
          <div className="w-note">
            {roomsForFacade.length ? <><Mark v="yes" /><span>На {FACADE_NAME[facade]} выходят номера <b>{roomsForFacade.map((r) => r.name).join(', ')}</b>, этажи {roomsForFacade[0].floors.join('–')}. Ответ отеля от 12 октября.</span></>
              : <><Mark v="partial" /><span>На {FACADE_NAME[facade]} номеров для гостей нет: лестницы и служебные помещения.</span></>}
          </div>
          <div className="attrib">© OpenStreetMap contributors · Copernicus DEM GLO-30 · геометрия в прототипе условная</div>
        </section>

        <section className="row-panel card-w" id="night">
          <div className="rp-media light"><Building name={h.name} sides={Object.fromEntries(Object.entries(NOISE[noise]).map(([k, v]) => [k, { color: v[0], text: v[1] }]))} /></div>
          <div className="rp-side">
            <div className="rp-h"><h3>Ваша ночь</h3><div className="seg"><button className={noise === 'day' ? 'on' : ''} onClick={() => setNoise('day')}><Icon name="sun" size={14} /> День</button><button className={noise === 'night' ? 'on' : ''} onClick={() => setNoise('night')}><Icon name="moon" size={14} /> Ночь</button></div></div>
            <p className="sub">Сколько шума у каждой стороны здания</p>
            <ul className="legend">{Object.entries(NOISE[noise]).map(([k, [c, db, src]]) => <li key={k}><span className="sw" style={{ background: c }} /><span>{FACADE_NAME[k as Facade]} · {src}</span><b className="num">{db}</b></li>)}</ul>
            <div className="verdict-box"><Mark v="yes" /><span>Для тишины берите номер на <b>СВ, во двор</b>. На ЮЗ слышны ночные поезда — помогают высокие этажи и закрытые окна.</span></div>
          </div>
        </section>

        <section className="row-panel card-w morning" id="morning">
          <div className="rp-media"><MapView line={route.line} pois={route.pois} fit={false} interactive={false} className="mini-map" /></div>
          <div className="rp-side">
            <div className="rp-h"><h3>Ваше утро</h3></div>
            <p className="sub">Дорога до пляжа и что по пути</p>
            <svg className="elev" viewBox="0 0 400 110" aria-label="Профиль высот">
              <defs><linearGradient id="elevg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity=".22" /><stop offset="1" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
              <rect x="120" y="8" width="70" height="70" fill="var(--verified)" opacity=".5" rx="4" />
              <path d="M10 14 C 60 15, 90 20, 120 26 L 190 70 C 230 86, 290 92, 390 96 L 390 100 L 10 100 Z" fill="url(#elevg)" />
              <path d="M10 14 C 60 15, 90 20, 120 26 L 190 70 C 230 86, 290 92, 390 96" fill="none" stroke="var(--primary)" strokeWidth="3" />
              <text x="155" y="20" fontSize="11" textAnchor="middle" fill="var(--ink)" fontWeight="600">64 ступени</text>
              <text x="10" y="108" fontSize="11" fill="var(--muted)">отель · 32 м</text>
              <text x="390" y="108" fontSize="11" fill="var(--muted)" textAnchor="end">пляж · 0 м</text>
            </svg>
            <ol className="route">
              <li><b>Кофейня «Зерно»</b><span>2 мин · с 7:00 · по пути</span></li>
              <li><b>Лестница, 64 ступени</b><span>спуск 22 м · перила, без пандуса</span></li>
              <li><b>Тоннель под ж/д</b><span>освещён, открыт круглосуточно</span></li>
              <li><b>Пляж</b><span>галька · вход в воду пологий</span></li>
            </ol>
            <div className="times num"><div><b>6 мин</b><span>туда</span></div><div><b>9 мин</b><span>обратно в гору</span></div><div><b>11 мин</b><span>без ступеней</span></div></div>
          </div>
        </section>

        <section className="dates card-w">
          <div className="rp-h"><h3>Ваши даты</h3><span className="sub">норма за 10 лет по Open-Meteo, не прогноз</span></div>
          <div className="days num">{DAYS.map(([wd, d, t, s, w, r]) => <div className="day" key={d}><span className="d">{wd}, {d} ноября</span><b>{t}°</b><span className="row"><Icon name="sun" size={14} />закат {s}</span><span className="row"><Icon name="wave" size={14} />вода {w}°</span><span className="row"><Icon name="question" size={14} />дождь {r}%</span></div>)}</div>
        </section>

        <section className="sec-h2" id="rooms"><h2>Доступные номера</h2><p>10–15 ноября · 5 ночей · 2 взрослых · стороны и этажи — по ответу отеля, вид — по расчёту</p></section>
        {h.rooms.map((r) => (
          <section key={r.id} className={`room card-w${r.recommended ? ' rec' : ''}`}>
            <div className="room-l">
              {r.recommended && <span className="rec-l">Подходит вам больше всего</span>}
              <div className="room-ph"><Photo k={r.photo} alt={r.name} credit={false} /><span className="room-view"><Panorama facade={r.facades[0]} floor={Math.min(r.floors[1], Math.max(r.floors[0], h.bestFloor))} labels={false} /></span></div>
              <h3>{r.name}</h3>
              <ul className="feat">
                <li><Icon name="bed" size={16} />{r.bed}, {r.area} м²</li>
                <li><Icon name="pin" size={16} />{r.facades.map((f) => FACADE_NAME[f]).join(' + ')} · этажи {r.floors.join('–')}</li>
                <li><Icon name="sun" size={16} />Вид: {r.view}</li>
              </ul>
              <ul className="foryou">{r.forYou.map(([v, t]) => <li key={t}><Mark v={v} />{t}</li>)}</ul>
              {r.request && <div className="req-pill"><span className="lbl">Попросим у отеля</span>{r.request}</div>}
            </div>
            <div className="rates">
              {r.rates.map((rt, i) => (
                <div className="rate" key={i}>
                  <ul>
                    <li><Icon name="meal" size={16} /><span className={rt.meal.startsWith('Завтрак') ? 'good' : ''}>{rt.meal}</span></li>
                    <li><Icon name="undo" size={16} /><span className={rt.cancel.startsWith('Бесплатная') ? 'good' : ''}>{rt.cancel}</span></li>
                    <li><Icon name="card" size={16} /><span>{rt.pay}</span></li>
                  </ul>
                  {rt.tag && <span className="rate-tag">{rt.tag}</span>}
                  <b className="num">{rub(rt.price)}</b>
                  <span className="rate-sub">за ночь · налоги включены · <Demo /></span>
                  <button className="btn btn-primary" onClick={() => nav.push(`/book/${h.id}?room=${r.id}&rate=${i}`)}>Забронировать</button>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="sec-h2"><h2>Что ещё мы знаем</h2><p>Нажмите на факт, чтобы увидеть доказательство</p></section>
        <div className="tiles">
          {h.facts.map((f) => {
            const v = verdict(f.confidence);
            return (
              <button key={f.id} className={`tile${why?.id === f.id ? ' sel' : ''}`} onClick={() => setWhy(f)}>
                <span className="t-top"><Mark v={v} />{f.group}<SrcTag kind={f.source}>{f.sourceLabel}</SrcTag></span>
                <b>{f.statement}</b><span className="scope">{f.scopeText}</span>
                <span className="t-foot"><Conf p={f.confidence} /><span className="go">почему →</span></span>
              </button>
            );
          })}
        </div>

        <section className="sec-h2"><h2>Чего мы не знаем</h2><p>Спросим отель — обычно отвечают за день</p></section>
        <div className="asks">
          {h.unknowns.map(([q, why]) => (
            <div key={q} className={`ask-tile${asked.has(q) ? ' sent' : ''}`}>
              <b>{q}</b><span>{why}</span>
              <button disabled={asked.has(q)} onClick={() => { setAsked((a) => new Set(a).add(q)); showToast('Вопрос ушёл в кабинет отеля. Сообщим, когда ответят.'); }}>{asked.has(q) ? 'Спросили ✓ ждём ответ' : 'Спросить отель →'}</button>
            </div>
          ))}
        </div>

        <section className="sec-h2" id="where"><h2>Где находится</h2><p>{h.address}</p></section>
        <div className="where card-w"><MapView pins={[{ id: h.id, lngLat: h.lngLat, label: h.name, top: true }]} fit={false} /></div>

        <div className="hp-actions">
          <button className={`btn-ghost${inCmp ? ' on' : ''}`} onClick={() => toggleCompare(h.id)}>{inCmp ? '✓ В сравнении' : '+ Добавить в сравнение'}</button>
          <Link className="btn-ghost" href="/compare">Сравнить с другими</Link>
        </div>
      </div>

      <motion.div className="sticky-cta" initial={false} animate={{ y: stuck ? 0 : 120, opacity: stuck ? 1 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}>
        <span><b>{h.name}</b> · {h.bestRoom}</span>
        <b className="num">от {rub(h.priceFrom)}</b>
        <button className="btn btn-primary btn-sm" onClick={() => scrollTo('rooms')}>Выбрать номер</button>
      </motion.div>

      <Drawer open={!!why} onClose={() => setWhy(null)} label="Почему мы так думаем">{why && <WhyPanel fact={why} hotel={h} />}</Drawer>
      <Lightbox items={gallery} index={lb} hotel={h} onClose={() => setLb(null)} onIndex={setLb} />
      <Toast text={toast} />
      <Footer />
    </div>
  );
}
