const plurals = new Intl.PluralRules("ru-RU");
const numbers = new Intl.NumberFormat("ru-RU");

export function formatReviewCount(count: number): string {
  const rule = plurals.select(count);
  const word = rule === "one" ? "отзыв" : rule === "few" ? "отзыва" : "отзывов";
  return `${numbers.format(count)} ${word}`;
}
