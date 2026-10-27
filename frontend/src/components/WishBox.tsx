import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { CHARACTERISTICS, EXAMPLES, QUICK_TAGS } from '../data/characteristics';
import type { Importance, IntentChip } from '../data/types';
import { Icon } from './ui';

const NEXT: Record<Importance, Importance> = { must: 'important', important: 'nice', nice: 'must' };
const IMP_LABEL: Record<Importance, string> = { must: 'обязательно', important: 'важно', nice: 'приятно' };

function useTypingPlaceholder(active: boolean) {
  const [text, setText] = useState(EXAMPLES[0]);
  useEffect(() => {
    if (!active || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0, n = 0, typing = true, t = 0;
    const tick = () => {
      const s = EXAMPLES[i];
      if (typing) { n++; setText(s.slice(0, n)); if (n >= s.length) { typing = false; t = window.setTimeout(tick, 1800); return; } }
      else { n = Math.max(0, n - 3); setText(s.slice(0, n)); if (n === 0) { typing = true; i = (i + 1) % EXAMPLES.length; } }
      t = window.setTimeout(tick, typing ? 38 : 14);
    };
    t = window.setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, [active]);
  return text;
}

export function WishBox({ query, onQuery, chips, onChips, known, researching, compact, thinking, onSubmit, onAdd, label }: {
  query: string; onQuery(q: string): void; chips: IntentChip[]; onChips(c: IntentChip[]): void; known: Set<string>; researching: Set<string>;
  compact: boolean; thinking: boolean; onSubmit(placeholder: string): void; onAdd(key: string): void; label: string;
}) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const placeholder = useTypingPlaceholder(!compact && !query);
  const suggest = ['mountains', 'dog', 'khinkali', 'kids', 'work'].filter((k) => !chips.some((c) => c.key === k)).slice(0, 2);
  const tagOn = (k: string) => chips.some((c) => c.key === k);
  const toggleTag = (k: string) => onChips(tagOn(k) ? chips.filter((c) => c.key !== k) : [...chips, { key: k, importance: 'must' }]);

  return (
    <motion.form layout layoutId="wish" transition={{ type: 'spring', stiffness: 260, damping: 32 }} className={`wish${thinking ? ' thinking' : ''}${compact ? ' compact' : ''}`}
      onSubmit={(e) => { e.preventDefault(); onSubmit(placeholder); }}>
      <div className="wish-row">
        <textarea ref={ta} value={query} rows={compact ? 1 : 2} placeholder={compact ? 'Уточните: «и чтобы с собакой»' : placeholder} aria-label="Опишите поездку своими словами"
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(placeholder); } }} />
        <button type="button" className="icon-btn" aria-label="Сказать голосом" title="Голосовой ввод"><Icon name="mic" size={20} /></button>
        <button type="button" className="icon-btn" aria-label="Найти по фото вида" title="Хочу такой вид — загрузите фото"><Icon name="camera" size={20} /></button>
        <button className="btn btn-primary go" type="submit">
          {thinking ? <span className="ring-spin" aria-hidden="true" /> : null}
          <span>{label}</span>{!thinking && <Icon name="arrow" size={17} />}
        </button>
      </div>
      {!compact && (
        <div className="wish-tools">
          {QUICK_TAGS.map((t) => (
            <button key={t.key} type="button" className={`qt${tagOn(t.key) ? ' on' : ''}`} aria-pressed={tagOn(t.key)} onClick={() => toggleTag(t.key)}>
              <Icon name={t.icon} size={15} />{t.label}
            </button>
          ))}
        </div>
      )}
      {chips.length > 0 && (
        <div className="chips">
          {chips.map((c, i) => {
            const ch = CHARACTERISTICS[c.key];
            const res = researching.has(c.key), ok = known.has(c.key);
            const cls = res ? 'researching' : ok ? (ch.checkable === 'ask_hotelier' ? 'ask done' : 'ok') : 'ask';
            const how = res ? 'исследуем' : ok ? (ch.checkable === 'ask_hotelier' ? 'ответили отели' : ch.how) : ch.how;
            return (
              <motion.span layout key={c.key} className={`chip ${cls}`} initial={{ opacity: 0, y: 4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: thinking ? i * 0.09 : 0, duration: 0.3 }}>
                <button type="button" className={`imp ${c.importance}`} title={`${IMP_LABEL[c.importance]} — нажмите, чтобы изменить`} aria-label={`Важность: ${IMP_LABEL[c.importance]}`}
                  onClick={() => onChips(chips.map((x) => (x.key === c.key ? { ...x, importance: NEXT[x.importance] } : x)))}><i /></button>
                {ch.label} <span className="how">{how}</span>
                <button type="button" className="x" aria-label={`Убрать «${ch.label}»`} onClick={() => onChips(chips.filter((x) => x.key !== c.key))}>×</button>
              </motion.span>
            );
          })}
          {compact && <span className="chip dates"><Icon name="calendar" size={14} />10–15 ноября · 2 взрослых</span>}
          {compact && suggest.map((k) => <button key={k} type="button" className="chip add" onClick={() => onAdd(k)}>+ {CHARACTERISTICS[k].label}</button>)}
        </div>
      )}
    </motion.form>
  );
}
