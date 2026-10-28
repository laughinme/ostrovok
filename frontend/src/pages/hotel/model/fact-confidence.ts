import type { Fact } from "./types";

export function factConfidence(fact: Pick<Fact, "confidence" | "status">) {
  if (fact.status === "conflict") return { label: "Противоречие", tone: "warning" } as const;
  if (fact.status === "stale") return { label: "Нужно обновить", tone: "warning" } as const;
  if (!Number.isFinite(fact.confidence)) return { label: "Нет оценки", tone: "muted" } as const;
  if (fact.confidence >= 0.9) return { label: "Высокая", tone: "high" } as const;
  if (fact.confidence >= 0.7) return { label: "Средняя", tone: "medium" } as const;
  return { label: "Низкая", tone: "muted" } as const;
}
