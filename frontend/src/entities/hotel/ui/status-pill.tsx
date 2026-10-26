import { cn } from "@/shared/lib";
import { STATUS } from "../config/fact-status";
import type { FactStatus } from "../model/types";
export function StatusPill({ status }: { status: FactStatus }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        s.pill,
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  );
}
