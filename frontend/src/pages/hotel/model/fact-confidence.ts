import type { Fact } from "./types";

export function factConfidence(fact: Pick<Fact, "confidence" | "status">) {
  if (fact.status === "conflict") return { label: "Противоречие", tone: "warning" } as const;
  if (fact.status === "stale") return { label: "Нужно обновить", tone: "warning" } as const;
  if (!Number.isFinite(fact.confidence)) return { label: "Нет оценки", tone: "muted" } as const;
  if (fact.confidence >= 0.9) return { label: "Высокая", tone: "high" } as const;
  if (fact.confidence >= 0.7) return { label: "Средняя", tone: "medium" } as const;
  return { label: "Низкая", tone: "muted" } as const;
}

export function factConfidenceStars(fact: Pick<Fact, "confidence" | "status">) {
  const assessed = Number.isFinite(fact.confidence);
  const percentage = assessed ? Math.round(Math.max(0, Math.min(1, fact.confidence)) * 100) : null;
  const count =
    !assessed || fact.confidence <= 0
      ? 0
      : fact.confidence >= 0.9
        ? 3
        : fact.confidence >= 0.7
          ? 2
          : 1;
  const status =
    fact.status === "conflict" ? "Противоречие" : fact.status === "stale" ? "Нужно обновить" : null;
  return {
    count,
    percentage,
    status,
    tooltip: percentage === null ? "Уверенность не указана" : `Уверенность в факте: ${percentage}%`,
  };
}
