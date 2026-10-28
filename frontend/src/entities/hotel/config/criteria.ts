import type { Criterion } from "../model/types";
export const CRITERIA: Record<Criterion, { label: string; short: string }> = {
  quiet: { label: "Тишина ночью", short: "Тишина" },
  sunset: { label: "Вид на закат", short: "Закат" },
  sea: { label: "Море рядом", short: "Море" },
  work: { label: "Удобно работать", short: "Работа" },
  kids: { label: "Подходит детям", short: "Дети" },
  pets: { label: "Можно с питомцем", short: "Питомцы" },
  mountains: { label: "Вид на горы", short: "Горы" },
  infra: { label: "Инфраструктура рядом", short: "Инфраструктура" },
};
