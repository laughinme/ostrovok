import { CRITERIA, type Criterion } from "@/entities/hotel";
import { cn } from "@/shared/lib";
export function CriteriaFilter({
  value,
  onToggle,
}: {
  value: Criterion[];
  onToggle: (criterion: Criterion) => void;
}) {
  return (
    <>
      {(Object.keys(CRITERIA) as Criterion[]).map((criterion) => (
        <button
          key={criterion}
          onClick={() => onToggle(criterion)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition",
            value.includes(criterion)
              ? "border-foreground bg-foreground text-background"
              : "hover:border-foreground",
          )}
        >
          {CRITERIA[criterion].short}
        </button>
      ))}
    </>
  );
}
