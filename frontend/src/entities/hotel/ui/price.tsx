import { cn } from "@/shared/lib";
export function Price({
  value,
  suffix = "за ночь",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  if (!Number.isFinite(value) || value <= 0)
    return <span className={cn("text-sm text-muted-foreground", className)}>Цена уточняется</span>;
  return (
    <span className={cn("inline-flex items-end gap-2", className)}>
      <span className="text-3xl font-bold leading-none tabular-nums tracking-tight">
        {value.toLocaleString("ru")}
        <span className="text-muted-foreground">{"\u202F₽"}</span>
      </span>
      {suffix && (
        <span className="pb-0.5 text-xs leading-none text-muted-foreground">{suffix}</span>
      )}
    </span>
  );
}
