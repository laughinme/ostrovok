import type { Hotel, HotelMatch } from '@/entities/hotel';
import type { Importance, Verdict } from '@/shared/model';
import type { IntentChip } from '@/entities/intent';

const WEIGHT: Record<Importance, number> = { must: 3, important: 2, nice: 1 };

export const verdict = (p: number | null): Verdict => p == null ? 'unknown' : p >= 0.7 ? 'yes' : p >= 0.4 ? 'partial' : 'no';

/** Совпадение = взвешенная вероятность выполнения желаний; несбывшееся «обязательно» сильно штрафуется. */
export function score(h: Hotel, chips: IntentChip[], known: Set<string>): HotelMatch {
  let s = 0, w = 0, pen = 1, risk = 0;
  for (const c of chips) {
    const p = known.has(c.key) ? h.wish[c.key]?.[0] ?? 0.5 : null;
    const wt = WEIGHT[c.importance];
    w += wt; s += wt * (p ?? 0.5); risk += wt * (1 - (p ?? 0.5));
    if (c.importance === 'must' && p != null && p < 0.4) pen *= 0.62;
  }
  return { hotel: h, score: w ? Math.round(100 * (s / w) * pen) : 50, risk: w ? Math.round(100 * risk / w / 2) : 0 };
}

export function rank(hotels: Hotel[], chips: IntentChip[], known: Set<string>) {
  return hotels.map((h) => score(h, chips, known)).sort((a, b) => b.score - a.score);
}
