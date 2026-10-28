import { cn } from "@/shared/lib";
import { Check, Scale } from "lucide-react";
import { useCompare } from "../model/store";
export function CompareButton({ hotelId }: { hotelId: string }) {
  const selected = useCompare((state) => state.ids.includes(hotelId));
  const toggle = useCompare((state) => state.toggle);
  return (
    <button
      type="button"
      onClick={() => toggle(hotelId)}
      aria-pressed={selected}
      title={selected ? "Убрать из сравнения" : "Добавить в сравнение"}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition",
        selected
          ? "border-coral bg-coral text-primary-foreground shadow-glow"
          : "hover:border-coral hover:text-coral",
      )}
    >
      {selected ? <Check className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
      {selected ? "В сравнении" : "Сравнить"}
    </button>
  );
}
