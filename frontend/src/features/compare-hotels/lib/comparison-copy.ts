import { CRITERIA, criterionKeys, type Criterion } from "@/entities/hotel";

export function comparisonCopy(text: string): string {
  let result = text;
  for (const criterion of Object.keys(CRITERIA) as Criterion[]) {
    result = result.replace(
      new RegExp(`\\b(?:${criterionKeys[criterion]}|${criterion})\\b`, "gi"),
      CRITERIA[criterion].short,
    );
  }
  return result
    .replace(/\s+в демо[-– ]сценарии/giu, "")
    .replace(/:\s*демонстрационное состояние/giu, "")
    .replace(/Демонстрационный подбор для проверки интерфейса[.!]?/giu, "")
    .trim();
}
