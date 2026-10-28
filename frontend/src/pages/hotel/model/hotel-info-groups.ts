import type { Fact } from "./types";

export const HOTEL_INFO_GROUPS = [
  { key: "view", label: "Вид из окна" },
  { key: "quiet", label: "Тишина и отдых" },
  { key: "nearby", label: "Рядом с отелем" },
  { key: "access", label: "Доступность и дорога" },
  { key: "transport", label: "Парковка и транспорт" },
  { key: "weather", label: "Погода и море" },
  { key: "work", label: "Интернет и работа" },
  { key: "family", label: "Семья и питомцы" },
  { key: "food", label: "Питание" },
  { key: "room", label: "В номере" },
  { key: "bathroom", label: "Ванная комната" },
  { key: "kitchen", label: "Кухня" },
  { key: "general", label: "Удобства" },
  { key: "other", label: "Другие сведения" },
] as const;
export type HotelInfoGroupKey = (typeof HOTEL_INFO_GROUPS)[number]["key"];
export type HotelInfoItem =
  { kind: "amenity"; label: string; id: string } | { kind: "fact"; fact: Fact; id: string };
const factGroups: Record<string, HotelInfoGroupKey> = {
  sea_view: "view",
  sea_share: "view",
  sunset_over_sea: "view",
  sunrise: "view",
  mountain_view: "view",
  night_noise: "quiet",
  day_noise: "quiet",
  aircraft_noise: "quiet",
  soundproofing: "quiet",
  construction_nearby: "quiet",
  construction: "quiet",
  blackout: "room",
  ac: "room",
  facade_rooms: "room",
  elevator: "access",
  step_free: "access",
  step_free_entrance: "access",
  stroller_to_sea: "access",
  stroller_access: "access",
  steep_streets: "access",
  terrain: "access",
  parking: "transport",
  ev_charging: "transport",
  climate: "weather",
  pharmacy_24_7: "nearby",
  pharmacy_walk: "nearby",
  bookstore: "nearby",
  bookstore_walk: "nearby",
  bookstore_nearby: "nearby",
  vegan_food: "food",
  vegan_cafe: "food",
  vegan_cafe_nearby: "food",
  shashlik_nearby: "food",
  wifi: "work",
  kids_hospital: "family",
  hospital_walk: "family",
  beach_walk: "nearby",
  beach_access: "nearby",
  food_late: "nearby",
  remote_work: "work",
  playground_walk: "family",
  pets_policy: "family",
};
function amenityGroup(label: string): HotelInfoGroupKey {
  if (/интернет|wi[\s-]?fi|вай[\s-]?фай|рабоч|бизнес/i.test(label)) return "work";
  if (/семейн|дет|питом|животн/i.test(label)) return "family";
  if (/ванн|душ|халат|тапоч|туалет|фен|гигиен/i.test(label)) return "bathroom";
  if (/кухн|холодильник|плит[аы]|посуд/i.test(label)) return "kitchen";
  if (/завтрак|питани|ресторан|кафе|кофе|чай|(?:^|[\s-])бар(?:\s|$)/i.test(label)) return "food";
  if (/кондиционер|отоплен|телевизор|кроват|бель[её]|сейф|номер/i.test(label)) return "room";
  return "general";
}
export function groupHotelInfo(amenities: string[], facts: Fact[]) {
  const items = new Map<HotelInfoGroupKey, HotelInfoItem[]>();
  const add = (key: HotelInfoGroupKey, item: HotelInfoItem) =>
    items.set(key, [...(items.get(key) ?? []), item]);
  amenities.forEach((label, index) =>
    add(amenityGroup(label), { kind: "amenity", label, id: `amenity-${index}` }),
  );
  facts.forEach((fact) =>
    add(factGroups[fact.characteristic] ?? "other", { kind: "fact", fact, id: fact.id }),
  );
  return HOTEL_INFO_GROUPS.flatMap((group) => {
    const values = items.get(group.key);
    return values?.length ? [{ ...group, items: values }] : [];
  });
}
