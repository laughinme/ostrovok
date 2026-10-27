const NBSP = ' ';

export const rub = (n: number) => n.toLocaleString('ru-RU').replace(/\s/g, NBSP) + NBSP + '₽';
export const pct = (n: number) => `${Math.round(n)}${NBSP}%`;
export const conf = (p: number) => (p >= 0.9 ? 'точно' : p >= 0.7 ? 'скорее да' : p >= 0.4 ? 'не уверены' : 'скорее нет');
export const dots = (p: number) => (p >= 0.9 ? 4 : p >= 0.7 ? 3 : p >= 0.4 ? 2 : 1);
export const decimal = (n: number) => String(n).replace('.', ',');

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
