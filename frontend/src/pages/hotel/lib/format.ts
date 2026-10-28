const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
export const rub = (value: number) => money.format(value);
export const decimal = (value: number) => number.format(value);
export const dots = (p: number) => (p >= 0.9 ? 4 : p >= 0.7 ? 3 : p >= 0.4 ? 2 : 1);
export const conf = (p: number) =>
  p >= 0.9 ? "точно" : p >= 0.7 ? "скорее да" : p >= 0.4 ? "не уверены" : "скорее нет";
