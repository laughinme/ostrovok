'use client';

import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { Header } from '@/widgets/site-chrome';
import { Conf, Demo, Icon, Mark, SrcTag, Toast, useToast } from '@/shared/ui/primitives';
import { Building, Panorama, Photo } from '@/shared/ui/visuals';
import { hotelQueries, type Hotel } from '@/entities/hotel';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '@/shared/ui/query-state';
import type { Facade } from '@/shared/model';
import { FACADE_NAME } from '@/shared/lib/building';
import { verdict } from '@/features/search-hotels';

const SIDE_INFO: Record<Facade, [string, string]> = {
  SW: ['море с 4-го этажа, закат октябрь–март', 'ж/д в 60 м — ночью ≈55 дБ'],
  NE: ['горы, моря нет', 'двор — ночью ≈38 дБ, самая тихая'],
  SE: ['ул. Морская в 140 м', 'море частично с 6-го этажа'],
  NW: ['соседний дом в 30 м', 'город, кусочек моря с 7-го этажа'],
};
const NAV = [['questions', 'Вопросы', 3], ['conflict', 'Расхождения', 1], ['facades', 'Номера и стороны', 0], ['requests', 'Запросы гостей', 1], ['demand', 'Что ищут гости', 0], ['facts', 'Что мы знаем', 0]] as const;
type Msg = { who: 'bot' | 'me' | 'parsed'; text: string };

export default function PartnerPage() {
  const query = useQuery(hotelQueries.detail('mayak'));
  return <QueryState query={query}>{(hotel) => <PartnerContent h={hotel} />}</QueryState>;
}

function PartnerContent({ h }: { h: Hotel }) {
  const [toast, show] = useToast();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [conflictFixed, setConflictFixed] = useState(false);
  const [picked, setPicked] = useState<Facade>('SW');
  const [mapping, setMapping] = useState<Partial<Record<Facade, string>>>({ SW: 'Делюкс · 2–8 эт.' });
  const [roomsSel, setRoomsSel] = useState(new Set(['Делюкс с видом на море']));
  const [floors, setFloors] = useState<[number, number]>([2, 8]);
  const [confirmed, setConfirmed] = useState(false);
  const [okFacts, setOkFacts] = useState<Set<string>>(new Set());
  const [msgs, setMsgs] = useState<Msg[]>([{ who: 'bot', text: 'Здравствуйте! Гости часто ищут тишину. Какие окна стоят на юго-западной стороне, где железная дорога?' }]);
  const [draft, setDraft] = useState('');

  const finish = (id: string, t: string) => { setDone((d) => new Set(d).add(id)); show(t); };
  const send = (e: FormEvent) => {
    e.preventDefault();
    const v = draft.trim() || 'двойные стеклопакеты, в Делюксах дополнительная шумоизоляция';
    setDraft('');
    setMsgs((m) => [...m, { who: 'me', text: v }]);
    setTimeout(() => setMsgs((m) => [...m, { who: 'parsed', text: 'Разобрал: окна ЮЗ = двойной стеклопакет · Делюкс: шумоизоляция = да' }]), 700);
    setTimeout(() => { setMsgs((m) => [...m, { who: 'bot', text: 'Спасибо! Уверенность «ночью тихо» для Делюксов выросла. Ещё вопрос: можно ли с собакой 30 кг?' }]); finish('q2', 'Ответ из чата разобран в поля'); }, 1500);
  };
  const saveSide = () => {
    const first = [...roomsSel][0]?.split(' ')[0] ?? 'без номеров';
    setMapping((m) => ({ ...m, [picked]: `${first} · ${floors[0]}–${floors[1]} эт.` }));
    if (picked === 'SW') setDone((d) => new Set(d).add('q1'));
    show(`${FACADE_NAME[picked]}-сторона сохранена. Пересчитали подбор для 3 категорий номеров.`);
  };
  const sides = Object.fromEntries((['SW', 'NE', 'SE', 'NW'] as Facade[]).map((f) => [f, { color: mapping[f] ? '#1E8F4E' : '#C3CDE6', text: mapping[f] ?? 'не размечено' }]));

  return (
    <div className="canvas-page">
      <Header />
      <div className="shell">
        <nav className="side-nav" aria-label="Кабинет">
          <div className="who"><Photo k={h.photos[0]} alt="" credit={false} /><b>{h.name}</b><span>{h.district} · <Demo /></span></div>
          {NAV.map(([id, l, c]) => <a key={id} href={`#${id}`}>{l}{c > 0 && <span className="cnt">{c}</span>}</a>)}
          <div className="foot">Ответы появляются у гостей сразу. Расчёты пересматриваем при изменениях карты.</div>
        </nav>
        <main className="page partner">
          <div className="page-h"><h1>Что Островок знает о «{h.name}»</h1><p>Мы посчитали вид, шум и дорогу до моря. Помогите с тем, что посчитать нельзя.</p></div>
          <div className="kpis num">
            <div className="kpi"><b>34</b><span>факта об отеле</span></div>
            <div className="kpi"><b>{3 - done.size}</b><span>вопроса ждут ответа</span></div>
            <div className="kpi"><b>1 240</b><span>показов за неделю <Demo /></span></div>
            <div className="kpi accent"><b>+18%</b><span>переходов после ответов <Demo /></span></div>
          </div>

          <section className="sec qgrid" id="questions">
            <div>
              <div className="sec-h"><h2>Вопросы</h2><p>Сначала то, что чаще ищут гости и в чём мы меньше уверены</p></div>
              <article className={`q card-w${done.has('q1') ? ' done' : ''}`}>
                <div className="q-top"><h3>Какие номера выходят на юго-западную сторону?</h3><span className="tag ink">самый важный</span></div>
                <p className="why-q"><b>34 гостя за неделю</b> искали закат над морем. С ЮЗ-стороны его видно с 4-го этажа, но мы не знаем, какие там номера.</p>
                {done.has('q1') ? <div className="res">Готово: Делюкс с видом на море — ЮЗ, этажи 2–8. Отель находится по запросу «закат над морем».</div>
                  : <div className="ans"><a className="btn btn-primary btn-sm" href="#facades">Отметить на схеме</a><span className="muted">или скажите голосом</span><button className="icon-btn" aria-label="Ответить голосом"><Icon name="mic" /></button></div>}
              </article>
              <article className={`q card-w${done.has('q2') ? ' done' : ''}`}>
                <div className="q-top"><h3>Какие окна на ЮЗ-стороне?</h3></div>
                <p className="why-q"><b>21 гость</b> искал тишину. С ЮЗ-стороны в 60 м железная дорога — хорошие окна сильно меняют дело.</p>
                {done.has('q2') ? <div className="res">Ответ сохранён. Уверенность в тишине ЮЗ-стороны обновлена.</div>
                  : <div className="ans">{['Обычные', 'Двойной стеклопакет', 'Шумозащитные'].map((a) => <button key={a} className="btn-ghost" onClick={() => finish('q2', `Ответ «${a}» сохранён — гости увидят его сразу`)}>{a}</button>)}</div>}
              </article>
              <article className={`q card-w${done.has('q3') ? ' done' : ''}`}>
                <div className="q-top"><h3>Можно ли с собакой 30 кг?</h3><span className="tag">спросил гость сейчас</span></div>
                <p className="why-q">Гость выбирает между вами и ещё 5 отелями. Ответ увидят все, кто ищет отдых с собакой.</p>
                {done.has('q3') ? <div className="res">Разобрали ответ: животные — можно; вес — до 40 кг; доплата — 1 500 ₽/сутки. Гость уже видит ответ.</div>
                  : <form className="ans" onSubmit={(e) => { e.preventDefault(); finish('q3', 'Ответ разобран в поля'); }}><input placeholder="Например: да, до 40 кг, 1 500 ₽ в сутки" aria-label="Ответ" /><button className="btn btn-primary btn-sm">Ответить</button></form>}
              </article>
            </div>
            <aside className="chat">
              <div className="chat-h"><span className="av">О!</span><div><b>Агент О!кно</b><span>ответьте своими словами — разложу по полям</span></div></div>
              <div className="msgs">{msgs.map((m, i) => <motion.div key={i} className={`m ${m.who}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>{m.text}</motion.div>)}</div>
              <form className="say" onSubmit={send}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Например: двойные стеклопакеты" aria-label="Ответ агенту" /><button className="btn btn-primary btn-sm">Отправить</button></form>
            </aside>
          </section>

          <section className="sec" id="conflict">
            <div className="sec-h"><h2>Расхождения</h2><p>Где ваше описание и наш расчёт говорят разное</p></div>
            <div className={`conflict card-w${conflictFixed ? ' fixed' : ''}`}>
              <div>
                <h3>«Вид на море из всех номеров»</h3>
                <div className="vs">
                  <div><span className="lbl">В вашем описании</span>Вид на море из всех номеров</div>
                  <div><span className="lbl">Наш расчёт · уверенность 0,9</span>Море видно только с ЮЗ-стороны и только с 4-го этажа. С СВ-стороны — горы.</div>
                </div>
                <div className="acts">{conflictFixed ? <span className="tag ok">Описание исправлено</span> : <><button className="btn btn-primary btn-sm" onClick={() => { setConflictFixed(true); show('Описание исправлено'); }}>Согласен, исправить описание</button><button className="btn-ghost">Не согласен — объяснить</button></>}</div>
              </div>
              <div className="cf-pano"><Panorama facade="SW" floor={2} labels={false} /><span>ЮЗ, 2 этаж: море закрыто домами</span></div>
            </div>
          </section>

          <section className="sec" id="facades">
            <div className="sec-h"><h2>Номера и стороны</h2><p>Нажмите на сторону здания и отметьте, какие номера туда выходят</p></div>
            <div className="mapper card-w">
              <div className="mapper-svg"><Building name={h.name} sides={sides} picked={picked} onPick={setPicked} /></div>
              <div className="mp">
                <h3>{({ SW: 'Юго-западная', NE: 'Северо-восточная', SE: 'Юго-восточная', NW: 'Северо-западная' } as const)[picked]} сторона</h3>
                <div className="cons">{SIDE_INFO[picked].map((t) => <span key={t}>· {t}</span>)}</div>
                <div className="mp-rooms">
                  {['Стандарт во двор', 'Делюкс с видом на море', 'Полулюкс угловой'].map((r) => (
                    <label key={r} className={roomsSel.has(r) ? 'on' : ''}><input type="checkbox" checked={roomsSel.has(r)} onChange={() => setRoomsSel((s) => { const n = new Set(s); if (n.has(r)) n.delete(r); else n.add(r); return n; })} />{r}</label>
                  ))}
                </div>
                <div className="floors">Этажи с <select value={floors[0]} onChange={(e) => setFloors([+e.target.value, floors[1]])}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select> по <select value={floors[1]} onChange={(e) => setFloors([floors[0], +e.target.value])}>{[5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></div>
                <button className="btn btn-primary wide-btn" onClick={saveSide}>Сохранить сторону</button>
              </div>
            </div>
          </section>

          <section className="sec" id="requests">
            <div className="sec-h"><h2>Запросы гостей</h2></div>
            <article className="req card-w">
              <div className="who-g"><span className="av2">АД</span><div><b>Анна Демо</b><span className="num">10–15 ноября · 2 взрослых · Делюкс с видом на море</span></div></div>
              <div className="req-chips"><span className="tag ok">ЮЗ-сторона</span><span className="tag ok">этаж ≥ 4</span><span className="tag">подальше от лифта</span></div>
              <p className="req-why">Гость выбрал вас за закат над морем. Советуем номер 512: ЮЗ, 5 этаж, далеко от лифта.</p>
              <div className="req-act">{confirmed ? <span className="tag ok">Подтверждено · № 512</span> : <><button className="btn btn-primary btn-sm" onClick={() => { setConfirmed(true); show('Гость получил подтверждение'); }}>Подтвердить № 512</button><button className="btn-ghost btn-sm">Предложить другой</button></>}</div>
            </article>
          </section>

          <section className="sec" id="demand">
            <div className="sec-h"><h2>Что ищут гости в Центре</h2><p>За последние 7 дней <Demo /></p></div>
            <div className="demand card-w num">
              {[['Тишина ночью', 100, 412, 'ok', 'у вас: СВ-сторона, подтверждено'], ['Закат над морем', 86, 356, 'warn', 'у вас есть, нужны номера'], ['До пляжа без подъёма', 70, 290, 'bad', 'у вас: 64 ступени'], ['С собакой', 16, 64, 'warn', 'не знаем — ответьте']].map(([t, w, n, k, s]) => (
                <div className="dm" key={t}><span>{t}</span><div className="bar"><span style={{ width: `${w}%` }} /></div><b>{n}</b><span className={`tag ${k}`}>{s}</span></div>
              ))}
            </div>
          </section>

          <section className="sec" id="facts">
            <div className="sec-h"><h2>Что мы знаем</h2><p>Подтвердите или поправьте — гости видят источник</p></div>
            <div className="tiles">
              {h.facts.map((f) => (
                <div key={f.id} className="tile static">
                  <span className="t-top"><Mark v={verdict(f.confidence)} />{f.group}<SrcTag kind={f.source}>{f.sourceLabel}</SrcTag></span>
                  <b>{f.statement}</b><span className="scope">{f.scopeText}</span>
                  <span className="t-foot"><Conf p={f.confidence} /><button className="btn-ghost btn-sm" disabled={okFacts.has(f.id)} onClick={() => setOkFacts((s) => new Set(s).add(f.id))}>{okFacts.has(f.id) ? 'Подтверждено ✓' : 'Верно'}</button></span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
      <Toast text={toast} />
    </div>
  );
}
