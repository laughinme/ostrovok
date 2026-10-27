import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Footer, Header } from '../components/chrome';
import { Demo, Mark, Ring } from '../components/ui';
import { Photo } from '../components/visuals';
import { HOTELS } from '../data/hotels';
import { rub } from '../lib/format';
import { verdict } from '../lib/score';
import { useStore } from '../state/store';

const CRIT = [
  { k: 'sunset', l: 'Закат над морем' }, { k: 'quiet', l: 'Тишина ночью' }, { k: 'beach', l: 'Без подъёма к морю' },
  { k: 'dog', l: 'С собакой' }, { k: 'work', l: 'Поработать' }, { k: 'mountains', l: 'Горы' }, { k: 'kids', l: 'С ребёнком' },
];

export default function ComparePage() {
  const { compare, toggleCompare } = useStore();
  const [on, setOn] = useState(new Set(['sunset', 'quiet', 'beach']));
  const hotels = (compare.length ? compare : ['mayak', 'kiparis', 'lazur']).map((id) => HOTELS.find((h) => h.id === id)!).filter(Boolean);
  const crit = CRIT.filter((c) => on.has(c.k));
  const scored = hotels.map((h) => ({ h, s: crit.length ? Math.round(100 * crit.reduce((a, c) => a + h.wish[c.k][0], 0) / crit.length) : 0 })).sort((a, b) => b.s - a.s);
  const best = scored[0];
  const winner = Object.fromEntries(crit.map((c) => [c.k, hotels.reduce((a, h) => (h.wish[c.k][0] > a.wish[c.k][0] ? h : a)).id]));

  return (
    <div className="canvas-page">
      <Header />
      <main className="cmp-wrap">
        <h1 className="page-title">Что выбрать из {hotels.length}</h1>
        <div className="crit">
          <span className="lbl">Учитываем</span>
          {CRIT.map((c) => (
            <button key={c.k} className={`cr${on.has(c.k) ? ' on' : ''}`} aria-pressed={on.has(c.k)} onClick={() => setOn((s) => { const n = new Set(s); if (n.has(c.k)) n.delete(c.k); else n.add(c.k); return n; })}>{c.l}</button>
          ))}
        </div>
        {best && (
          <motion.section layout className="rec-band" aria-live="polite">
            <div className="k">Рекомендация по вашим желаниям</div>
            <h2>«{best.h.name}» — {best.s}% под ваши желания</h2>
            <div className="alts">
              {scored.slice(1).map(({ h }) => {
                const wins = crit.filter((c) => winner[c.k] === h.id).map((c) => c.l.toLowerCase());
                return <div key={h.id}>Выберите <b>«{h.name}»</b>, если {wins.length ? `важнее ${wins.join(' и ')}` : 'важнее цена'}: {h.tradeoff.charAt(0).toLowerCase() + h.tradeoff.slice(1)}</div>;
              })}
            </div>
          </motion.section>
        )}
        <div className="cmp-cols">
          {hotels.map((h) => {
            const s = scored.find((x) => x.h === h)!.s;
            return (
              <motion.article layout key={h.id} className={`cmp-col${h === best?.h ? ' best' : ''}`}>
                <div className="cmp-media"><Photo k={h.photos[0]} alt={h.name} credit={false} facade={h.bestFacade} floor={h.bestFloor} /><button className="cmp-x" onClick={() => toggleCompare(h.id)} aria-label={`Убрать ${h.name} из сравнения`}>×</button></div>
                <div className="cmp-h"><div><span className="muted">{h.district}</span><h3>{h.name} <Demo /></h3></div><Ring value={s} size={58} label="" /></div>
                <div className="cmp-rows">
                  {crit.map((c) => {
                    const [p, t] = h.wish[c.k];
                    return <div key={c.k} className={`cmp-row${winner[c.k] === h.id ? ' win' : ''}`}><Mark v={verdict(p)} /><span className="c">{c.l}</span><span className="t">{t}</span></div>;
                  })}
                </div>
                <p className="trade">{h.tradeoff}</p>
                <div className="cmp-foot"><b className="num">{rub(h.priceFrom)}</b><span className="muted">за ночь</span><Link className={`btn btn-sm ${h === best?.h ? 'btn-primary' : 'btn-ghost'}`} to={`/hotels/${h.id}`}>Открыть</Link></div>
              </motion.article>
            );
          })}
        </div>
        {hotels.length < 3 && <p className="muted" style={{ marginTop: 16 }}>Добавьте отели кнопкой «Сравнить» в <Link to="/search">подборке</Link>.</p>}
      </main>
      <Footer />
    </div>
  );
}
