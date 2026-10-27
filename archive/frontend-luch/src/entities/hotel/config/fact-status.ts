import { AlertTriangle, Calculator, HelpCircle, ShieldCheck } from "lucide-react";
import type { FactStatus } from "../model/types";
export const STATUS: Record<
  FactStatus,
  { label: string; icon: typeof ShieldCheck; pill: string; bar: string }
> = {
  confirmed: {
    label: "Подтверждено",
    icon: ShieldCheck,
    pill: "bg-accent text-accent-foreground",
    bar: "bg-conf-high",
  },
  computed: {
    label: "Вычислено AI",
    icon: Calculator,
    pill: "bg-tint text-coral",
    bar: "bg-coral",
  },
  assumed: {
    label: "Предположение",
    icon: HelpCircle,
    pill: "bg-muted text-muted-foreground",
    bar: "bg-conf-mid",
  },
  conflict: {
    label: "Противоречие",
    icon: AlertTriangle,
    pill: "bg-destructive/10 text-destructive",
    bar: "bg-conf-conflict",
  },
};
