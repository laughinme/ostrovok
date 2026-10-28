import type { Criterion } from "../model/types";
export const CRITERIA: Record<Criterion, { label: string; short: string }> = {
  quiet: { label: "Тишина ночью", short: "Тишина" },
  sunset: { label: "Вид на закат", short: "Закат" },
  sea: { label: "Море из окна", short: "Море" },
  work: { label: "Удобно работать", short: "Работа" },
  kids: { label: "Детская площадка рядом", short: "Дети" },
  pets: { label: "Можно с питомцем", short: "Питомцы" },
  mountains: { label: "Вид на горы", short: "Горы" },
  infra: { label: "Еда допоздна", short: "Поесть рядом" },
};
