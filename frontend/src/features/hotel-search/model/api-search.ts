import { criterionKeys, type ApiIntent, type Criterion } from "@/entities/hotel";
import type { components } from "@/shared/api";

export function intentForCriteria(intent: ApiIntent, criteria: Criterion[]): ApiIntent["chips"] {
  const mapped = new Set(Object.values(criterionKeys));
  return [
    ...intent.chips.filter((chip) => !chip.characteristic || !mapped.has(chip.characteristic)),
    ...criteria.map((criterion): components["schemas"]["IntentChipModel"] => {
      const characteristic = criterionKeys[criterion];
      return (
        intent.chips.find((chip) => chip.characteristic === characteristic) ?? {
          id: `filter-${criterion}`,
          characteristic,
          label: {
            quiet: "Тишина ночью",
            sunset: "Закат над морем",
            sea: "Море из окна",
            work: "Можно поработать",
            kids: "Детская площадка рядом",
            pets: "С животными",
            mountains: "Горы из окна",
            infra: "Поесть рядом",
          }[criterion],
          importance: "important",
          checkable: ["remote_work", "pets_policy"].includes(characteristic)
            ? "ask_hotelier"
            : "compute",
          params: {},
          fromProfile: false,
        }
      );
    }),
  ];
}

export function criteriaFromIntent(intent?: ApiIntent): Criterion[] {
  return (Object.keys(criterionKeys) as Criterion[]).filter((criterion) =>
    intent?.chips.some((chip) => chip.characteristic === criterionKeys[criterion]),
  );
}
