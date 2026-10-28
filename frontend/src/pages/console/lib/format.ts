import type { ApiRun } from "@/entities/agent-run";
import type { RegistryEntry, Schema } from "../api/console";

export function money(value: number | null | undefined): string {
  return value == null ? "—" : `$${value.toFixed(value < 0.01 ? 4 : 2)}`;
}

export function percent(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 100)}%` : "—";
}

export function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function characteristicKey(
  run: ApiRun | undefined,
  registry: RegistryEntry[],
  description: string,
): string | null {
  if (run?.status !== "done") return null;
  const decision = [...run.steps]
    .reverse()
    .find((step) => step.kind === "decision" && typeof record(step.output).key === "string");
  const key = record(decision?.output).key ?? run.subject?.key ?? run.subject?.characteristic;
  if (typeof key === "string" && key.length > 0) return key;
  const matches = registry.filter(
    (entry) => entry.learnedFrom === description && entry.status !== "published",
  );
  return matches.length === 1 ? matches[0].key : null;
}

export function nearbyBuilding(
  location: [number, number],
  name: string,
): Schema["BuildingRequest"] {
  return {
    lon: location[0],
    lat: location[1] - 60 / 111320,
    floors: 10,
    widthM: 30,
    depthM: 15,
    title: `Демо-дом рядом с «${name}»`,
  };
}
