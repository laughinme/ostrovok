import { CRITERIA } from "../config/criteria";
import { criterionKeys } from "../api/backend-hotels";

const labels: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(criterionKeys).map(([key, value]) => [
      value,
      CRITERIA[key as keyof typeof CRITERIA].label,
    ]),
  ),
  beach_walk: "Дорога до пляжа",
  beach_access: "Доступ к пляжу",
  sea_share: "Вид на море",
  wifi: "Интернет",
  aircraft_noise: "Шум самолётов",
  day_noise: "Тишина днём",
  blackout_curtains: "Плотные шторы",
  stroller_to_sea: "К морю с коляской",
  steep_streets: "Подъёмы и крутые улицы",
  sunrise: "Рассвет из окна",
};

export function characteristicLabel(key: string) {
  return labels[key] ?? "Характеристика отеля";
}
