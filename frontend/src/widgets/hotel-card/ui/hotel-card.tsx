import { motion } from 'motion/react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CHARACTERISTICS } from '@/entities/intent';
import type { HotelMatch } from '@/entities/hotel';
import type { IntentChip } from '@/entities/intent';
import { rub } from '@/shared/lib/format';
import { verdict } from '@/features/search-hotels';
import { useHotelSelection } from '@/features/select-hotels';
import { Demo, Icon, Mark, Ring, Stars } from '@/shared/ui/primitives';
import { Building, Panorama, Photo } from '@/shared/ui/visuals';

type Slide = { kind: 'photo'; key: string; cap: string } | { kind: 'view'; cap: string } | { kind: 'noise'; cap: string };

export function HotelCard({ m, chips, known, index, flash, hl, onHover }: { m: HotelMatch; chips: IntentChip[]; known: Set<string>; index: number; flash: string | null; hl: boolean; onHover(id: string | null): void }) {
  const h = m.hotel;
  const nav = useRouter();
  const { compare, toggleCompare, favorites, toggleFavorite } = useHotelSelection();
  const slides: Slide[] = [
    ...h.photos.slice(0, 3).map((key, i) => ({ kind: 'photo' as const, key, cap: i === 0 ? 'Демо-фото' : 'Демо-фото' })),
    { kind: 'view', cap: `Вид из номера · ${h.bestFacade === 'SW' ? 'ЮЗ' : h.bestFacade === 'NE' ? 'СВ' : h.bestFacade === 'SE' ? 'ЮВ' : 'СЗ'}, ${h.bestFloor} этаж · расчёт` },
    { kind: 'noise', cap: 'Шум по сторонам здания ночью · расчёт' },
  ];
  const [i, setI] = useState(0);
  const go = (d: number) => setI((x) => (x + d + slides.length) % slides.length);
  const inCmp = compare.includes(h.id), fav = favorites.includes(h.id);

  return (
    <motion.article layout="position" transition={{ type: 'spring', stiffness: 300, damping: 34 }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0, transition: { delay: index * 0.07, duration: 0.42, ease: [0.22, 1, 0.36, 1] } }}
      className={`hcard${hl ? ' hl' : ''}`} onMouseEnter={() => onHover(h.id)} onMouseLeave={() => onHover(null)}>
      <div className="media">
        <div className="track" style={{ transform: `translateX(-${i * 100}%)` }}>
          {slides.map((s, j) => (
            <div className="slide" key={j}>
              {s.kind === 'photo' && <Photo k={s.key} alt={`${h.name}: фото ${j + 1}`} facade={h.bestFacade} floor={h.bestFloor} credit={false} />}
              {s.kind === 'view' && <div className="scene-slide"><Panorama facade={h.bestFacade} floor={h.bestFloor} labels={false} /></div>}
              {s.kind === 'noise' && <div className="noise-slide"><Building name={h.name} sides={{ SW: { color: '#D2463B', text: '≈55 дБ' }, SE: { color: '#B7860B', text: '≈45 дБ' }, NE: { color: '#1E8F4E', text: '≈38 дБ' }, NW: { color: '#B7860B', text: '≈43 дБ' } }} /></div>}
            </div>
          ))}
        </div>
        {index === 0 && <span className="best">Лучшее совпадение</span>}
        <button type="button" className={`fav${fav ? ' on' : ''}`} aria-pressed={fav} aria-label="В избранное" onClick={() => toggleFavorite(h.id)}><Icon name="heart" size={18} /></button>
        <span className="cap">{slides[i].cap}</span>
        <div className="dots">{slides.map((_, j) => <i key={j} className={j === i ? 'on' : ''} />)}</div>
        <button className="nav prev" type="button" aria-label="Предыдущее фото" onClick={() => go(-1)}><Icon name="back" size={16} /></button>
        <button className="nav next" type="button" aria-label="Следующее фото" onClick={() => go(1)}><Icon name="arrow" size={16} /></button>
      </div>
      <div className="hc-b">
        <div className="hc-top">
          <div className="hc-title">
            <Link href={`/hotels/${h.id}`} className="hc-name">{h.name}</Link>
            <div className="hc-sub"><Stars n={h.stars} /> {h.district} · {h.toSea}</div>
          </div>
          <Ring value={m.score} />
        </div>
        <ul className="vlist">
          {chips.map((c) => {
            const p = known.has(c.key) ? h.wish[c.key]?.[0] ?? null : null;
            const v = verdict(p);
            return (
              <li key={c.key} className={`${v === 'unknown' ? 'u' : ''}${flash === c.key ? ' flash' : ''}`}>
                <Mark v={v} />{p == null ? `${CHARACTERISTICS[c.key].label}: агент выясняет…` : h.wish[c.key][1]}
              </li>
            );
          })}
        </ul>
        <div className="offer">
          <div className="offer-room"><b>{h.bestRoom}</b><span>{h.tradeoff}</span></div>
          <div className="offer-price"><b className="num">{rub(h.priceFrom)}</b><span>за ночь · <Demo /></span></div>
        </div>
        <div className="hc-foot">
          <button className={`btn-ghost btn-sm${inCmp ? ' on' : ''}`} type="button" aria-pressed={inCmp} onClick={() => toggleCompare(h.id)}>{inCmp ? '✓ В сравнении' : '+ Сравнить'}</button>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => nav.push(`/hotels/${h.id}`)}>Показать номера</button>
        </div>
      </div>
    </motion.article>
  );
}
