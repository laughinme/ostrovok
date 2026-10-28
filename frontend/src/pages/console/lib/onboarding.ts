import type { ApiRun } from "@/entities/agent-run";
import type { Schema, RegistryEntry } from "../api/console";
import { record } from "./format";

export const districts: Record<string, string> = {
  center: "Центр",
  khosta: "Хоста",
  adler: "Адлер",
  sirius: "Сириус",
  krasnaya_polyana: "Красная Поляна",
};

export function computedCharacteristics(registry: RegistryEntry[], facts: Schema["FactOut"][]) {
  return registry
    .filter((entry) => entry.status === "published" && entry.method !== "ask_hotelier")
    .map((entry) => ({
      ...entry,
      facts: facts.filter(
        (fact) =>
          fact.characteristic === entry.key &&
          !fact.isDemo &&
          (fact.source === "computed" || fact.source === "open_data"),
      ),
    }));
}

export function confidenceRange(facts: Schema["FactOut"][]): string {
  const values = facts.map((fact) => fact.confidence).filter(Number.isFinite);
  if (!values.length) return "—";
  const low = Math.round(Math.min(...values) * 100);
  const high = Math.round(Math.max(...values) * 100);
  return low === high ? `${low}%` : `${low}–${high}%`;
}

export function onboardingQuestions(run: ApiRun | undefined) {
  const step = run && [...run.steps].reverse().find((step) => step.tool === "hotelier.ask");
  if (!Array.isArray(step?.output)) return [];
  return step.output.flatMap((value: unknown) => {
    const question = record(value);
    const id = question["id"];
    const text = question["text"];
    const why = question["why"];
    return typeof id === "string" && typeof text === "string"
      ? [{ id, text, why: typeof why === "string" ? why : "" }]
      : [];
  });
}

export function runSeconds(run: ApiRun | undefined, now: number): number {
  if (!run) return 0;
  const start = Date.parse(run.createdAt);
  const end = run.finishedAt ? Date.parse(run.finishedAt) : now;
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, (end - start) / 1000) : 0;
}
