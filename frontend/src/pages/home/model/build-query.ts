import type { IntentChip } from "./types";

const TERMS: Record<string, string> = {
  quiet: "тихий номер",
  sunset: "закат над морем",
  sea: "вид на море",
  beach: "до пляжа без подъёмов",
  mountains: "вид на горы",
  kids: "с ребёнком",
  work: "буду работать",
  dog: "с собакой",
  khinkali: "кафе рядом",
};

export function buildLandingQuery(query: string, fallback: string, chips: readonly IntentChip[]) {
  const text = query.trim() || fallback;
  const terms = chips
    .map(({ key }) => TERMS[key])
    .filter((term): term is string => Boolean(term && !text.toLowerCase().includes(term)));
  return [text, ...terms].filter(Boolean).join(", ");
}
