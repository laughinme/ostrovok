import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import type { Fact, Hotel } from '../data/types';
import { photo } from '../lib/photos';
import { Conf, Icon, SrcTag } from './ui';
import { Building, Panorama, Photo } from './visuals';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open, onClose]);
}

export function Drawer({ open, onClose, label, children }: { open: boolean; onClose(): void; label: string; children: ReactNode }) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside className="drawer" role="dialog" aria-modal="true" aria-label={label} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 36 }}>
            <button className="icon-btn close" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function WhyPanel({ fact, hotel }: { fact: Fact; hotel: Hotel }) {
  const p = Math.round(fact.confidence * 100);
  return (
    <div className="why">
      <div className="lbl">Почему мы так думаем</div>
      <div className="stmt">{fact.statement}: {fact.scopeText}</div>
      <div className="why-conf"><Conf p={fact.confidence} /><SrcTag kind={fact.source}>{fact.sourceLabel}</SrcTag></div>
      <div className="bar"><span style={{ width: `${p}%` }} /></div>
      <p className="meter-t">{fact.source === 'computed' ? <><b className="num">{p} из 100</b> симуляций с учётом погрешности данных подтверждают факт.</> : <>Уверенность <b className="num">{String(fact.confidence).replace('.', ',')}</b>: источник проверен, дата известна.</>}</p>
      {fact.evidence === 'horizon' && <div className="evidence"><Panorama facade={hotel.bestFacade} floor={Math.max(4, hotel.bestFloor - 2)} /></div>}
      {fact.evidence === 'noise' && <div className="evidence light"><Building name={hotel.name} sides={{ SW: { color: '#D2463B', text: '≈55 дБ' }, SE: { color: '#B7860B', text: '≈45 дБ' }, NE: { color: '#1E8F4E', text: '≈38 дБ' }, NW: { color: '#B7860B', text: '≈43 дБ' } }} /></div>}
      <dl>
        <div><dt className="lbl">Метод</dt><dd>{fact.method}</dd></div>
        <div><dt className="lbl">Источники</dt><dd><ul>{fact.sources.map(([a, b]) => <li key={a}>{a}<span>{b}</span></li>)}</ul></dd></div>
        <div><dt className="lbl">Что может пойти не так</dt><dd>{fact.caveats}</dd></div>
        <div><dt className="lbl">История</dt><dd>{fact.history}</dd></div>
      </dl>
      <div className="acts"><button className="btn-ghost">Показать на карте</button><button className="btn-ghost">Сообщить об ошибке</button></div>
    </div>
  );
}

export type GalleryItem = { kind: 'photo'; key: string } | { kind: 'view' } | { kind: 'noise' };

export function Lightbox({ items, index, hotel, onClose, onIndex }: { items: GalleryItem[]; index: number | null; hotel: Hotel; onClose(): void; onIndex(i: number): void }) {
  useEscape(index != null, onClose);
  useEffect(() => {
    if (index == null) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') onIndex((index + 1) % items.length); if (e.key === 'ArrowLeft') onIndex((index + items.length - 1) % items.length); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [index, items.length, onIndex]);
  const it = index != null ? items[index] : null;
  const meta = it?.kind === 'photo' ? photo(it.key) : null;
  return (
    <AnimatePresence>
      {it && index != null && (
        <motion.div className="lightbox" role="dialog" aria-modal="true" aria-label="Фотографии" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="icon-btn lb-close" onClick={onClose} aria-label="Закрыть"><Icon name="close" size={22} /></button>
          <div className="lb-stage">
            {it.kind === 'photo' && <Photo k={it.key} alt={`${hotel.name}, фото`} credit={false} />}
            {it.kind === 'view' && <Panorama facade={hotel.bestFacade} floor={hotel.bestFloor} />}
            {it.kind === 'noise' && <div className="light"><Building name={hotel.name} sides={{ SW: { color: '#D2463B', text: '≈55 дБ' }, SE: { color: '#B7860B', text: '≈45 дБ' }, NE: { color: '#1E8F4E', text: '≈38 дБ' }, NW: { color: '#B7860B', text: '≈43 дБ' } }} /></div>}
          </div>
          <div className="lb-bar">
            <button className="icon-btn" onClick={() => onIndex((index + items.length - 1) % items.length)} aria-label="Предыдущее"><Icon name="back" /></button>
            <span className="num">{index + 1} / {items.length}</span>
            <button className="icon-btn" onClick={() => onIndex((index + 1) % items.length)} aria-label="Следующее"><Icon name="arrow" /></button>
            <span className="lb-credit">{meta ? <>Демо-фото: <a href={meta.page} target="_blank" rel="noreferrer">{meta.author}</a>, {meta.license}. Иллюстрация, не этот отель.</> : it.kind === 'view' ? 'Расчёт вида из окна по рельефу и зданиям' : it.kind === 'noise' ? 'Расчёт шума по сторонам здания' : 'Визуализация'}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
