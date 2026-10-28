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
};

export function characteristicLabel(key: string) {
  return labels[key] ?? "Характеристика отеля";
}
