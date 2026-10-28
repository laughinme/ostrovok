import { CRITERIA, hotels, type Criterion, type Hotel } from "@/entities/hotel";

const KEYWORDS: Record<Criterion, RegExp> = {
  quiet: /тих|спокой|высып|сон|шум/i,
  sunset: /закат|вечер/i,
  sea: /мор|пляж|берег/i,
  work: /работ|удал[её]н|ноут|интернет|wi-?fi/i,
  kids: /реб[её]н|дет|площад|семь/i,
  pets: /собак|пит[ао]м|кош|пёс|пес/i,
  mountains: /гор|вершин|поляна/i,
  infra: /инфраструкт|магазин|кафе|ресторан|транспорт/i,
};

export function parseQuery(q: string): Criterion[] {
  const found = (Object.keys(KEYWORDS) as Criterion[]).filter((c) => KEYWORDS[c].test(q));
  return found.length ? found : ["quiet", "sea", "infra"];
}

export function scoreHotel(h: Hotel, criteria: Criterion[]): number {
  if (!criteria.length) return 0;
  const sum = criteria.reduce((s, c) => s + h.scores[c], 0);
  return Math.round(sum / criteria.length);
}

export interface Ranked {
  searchId?: string;
  hotel: Hotel;
  score: number;
  best: Criterion[];
  weak: Criterion[];
}

export function rank(criteria: Criterion[]): Ranked[] {
  return hotels
    .map((hotel) => ({
      hotel,
      score: scoreHotel(hotel, criteria),
      best: criteria.filter((c) => hotel.scores[c] >= 80),
      weak: criteria.filter((c) => hotel.scores[c] < 60),
    }))
    .sort((a, b) => b.score - a.score);
}

export function explain(r: Ranked): string {
  const good = r.best.map((c) => CRITERIA[c].short.toLowerCase());
  if (!good.length) return "Частично подходит: ни один критерий не выражен сильно.";
  return `Сильные стороны под ваш запрос: ${good.join(", ")}.`;
}
