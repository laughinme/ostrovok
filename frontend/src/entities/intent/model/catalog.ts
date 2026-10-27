import type { Characteristic, IntentChip } from '@/entities/intent/model/types';

export const CHARACTERISTICS: Record<string, Characteristic> = {
  sunset: { key: 'sunset', label: 'закат над морем', checkable: 'compute', how: 'посчитаем' },
  sea: { key: 'sea', label: 'море из окна', checkable: 'compute', how: 'посчитаем' },
  quiet: { key: 'quiet', label: 'тишина ночью', checkable: 'compute', how: 'посчитаем' },
  beach: { key: 'beach', label: 'до пляжа без подъёма', checkable: 'compute', how: 'посчитаем' },
  mountains: { key: 'mountains', label: 'горы в окне', checkable: 'compute', how: 'посчитаем' },
  kids: { key: 'kids', label: 'детская площадка рядом', checkable: 'compute', how: 'посчитаем' },
  work: { key: 'work', label: 'тихо днём, рабочий стол', checkable: 'ask_hotelier', how: 'спросим отели' },
  dog: { key: 'dog', label: 'с собакой 30 кг', checkable: 'ask_hotelier', how: 'спросим отели' },
  khinkali: { key: 'khinkali', label: 'хинкальная в 10 минутах', checkable: 'compute', how: 'научимся считать' },
};

/** Характеристики, которые уже посчитаны для всех отелей. Остальные агент добывает по запросу. */
export const KNOWN_FROM_START = new Set(['sunset', 'sea', 'quiet', 'beach', 'mountains', 'kids']);

export const DEFAULT_INTENT: IntentChip[] = [
  { key: 'sunset', importance: 'must' },
  { key: 'quiet', importance: 'must' },
  { key: 'beach', importance: 'important' },
];

export const MOODS = [
  { id: 'sea', title: 'Проснуться с морем', proof: '23 отеля, где море видно из кровати', photo: 'lux-h1a', chips: [{ key: 'sea', importance: 'must' }, { key: 'beach', importance: 'important' }] },
  { id: 'calm', title: 'Тишина и горы', proof: '17 отелей без дорог под окнами', photo: 'lux-h2', chips: [{ key: 'quiet', importance: 'must' }, { key: 'mountains', importance: 'must' }] },
  { id: 'kids', title: 'С ребёнком без подъёмов', proof: '31 отель, до пляжа не больше 10 м вверх', photo: 'lux-h3', chips: [{ key: 'beach', importance: 'must' }, { key: 'kids', importance: 'important' }, { key: 'quiet', importance: 'nice' }] },
  { id: 'sunset', title: 'Закаты в ноябре', proof: '14 отелей, солнце садится в море', photo: 'lux-hero', chips: [{ key: 'sunset', importance: 'must' }, { key: 'quiet', importance: 'nice' }] },
] as const satisfies readonly { id: string; title: string; proof: string; photo: string; chips: IntentChip[] }[];

export const QUICK_TAGS = [
  { key: 'dog', label: 'С собакой', icon: 'paw' },
  { key: 'kids', label: 'С ребёнком', icon: 'kid' },
  { key: 'work', label: 'Буду работать', icon: 'laptop' },
  { key: 'beach', label: 'Без подъёмов', icon: 'wave' },
] as const;

export const EXAMPLES = [
  'Тихо, закат над морем, до пляжа без подъёма, в ноябре, вдвоём',
  'Неделю поработать у моря, чтобы днём было тихо',
  'С собакой 30 кг, чтобы рядом был лес',
  'Вид на горы и хинкальная рядом',
];

/** Разбор запроса без LLM: словарь синонимов → чипы. С ключом LLM это делает агент намерений. */
const SYNONYMS: [RegExp, string][] = [
  [/закат/i, 'sunset'],
  [/мор[ея]\s*(из|в)\s*окн|вид на мор/i, 'sea'],
  [/тих|тишин|спокойн|высып/i, 'quiet'],
  [/без подъ|пляж|до мор/i, 'beach'],
  [/гор[ыа]?\b|горн/i, 'mountains'],
  [/реб[её]н|дет/i, 'kids'],
  [/работ|ноутбук|удал[её]н/i, 'work'],
  [/соба|пёс|пес\b|питом|живот/i, 'dog'],
  [/хинкал|грузин/i, 'khinkali'],
];

export function parseIntent(text: string): IntentChip[] {
  const out: IntentChip[] = [];
  for (const [re, key] of SYNONYMS) if (re.test(text) && !out.some((c) => c.key === key)) out.push({ key, importance: out.length < 2 ? 'must' : 'important' });
  return out.length ? out : DEFAULT_INTENT.map((c) => ({ ...c }));
}
