import type { Fact } from "./types";
import { groupHotelInfo } from "./hotel-info-groups";

const priorities = [
  "sea_view",
  "night_noise",
  "beach_walk",
  "remote_work",
  "mountain_view",
  "sunset_over_sea",
];

export function selectHotelHighlights(facts: Fact[], preferredIds: string[] = []) {
  const preferred = preferredIds.flatMap((id) => facts.filter((fact) => fact.id === id));
  const candidates = [
    ...preferred,
    ...priorities.flatMap((key) => facts.filter((fact) => fact.characteristic === key)),
    ...facts,
  ];
  const topics = new Map(
    groupHotelInfo([], facts).flatMap((group) =>
      group.items.map((item) => [item.id, group.key] as const),
    ),
  );
  const result: Fact[] = [];
  const characteristics = new Set<string>();
  const categories = new Set<string>();
  const add = (fact: Fact) => {
    result.push(fact);
    characteristics.add(fact.characteristic);
    categories.add(topics.get(fact.id) ?? "other");
  };
  for (const fact of preferred) {
    if (result.length === 4) break;
    if (!characteristics.has(fact.characteristic)) add(fact);
  }
  for (const fact of candidates) {
    if (result.length === 4) break;
    if (
      !categories.has(topics.get(fact.id) ?? "other") &&
      !characteristics.has(fact.characteristic)
    )
      add(fact);
  }
  for (const fact of candidates) {
    if (result.length === 4) break;
    if (!characteristics.has(fact.characteristic)) add(fact);
  }
  return result;
}
