import type { Verdict } from "../model/types";
export const MARK: Record<Verdict, string> = { yes: "✓", partial: "⚠", no: "✗", unknown: "?" };
export function verdict(p: number | null | undefined): Verdict {
  return p == null ? "unknown" : p >= 0.7 ? "yes" : p >= 0.4 ? "partial" : "no";
}
