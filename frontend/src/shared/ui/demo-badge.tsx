import { cn } from "@/shared/lib";
import { Sparkles } from "lucide-react";
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" /> демо‑оценка
    </span>
  );
}
