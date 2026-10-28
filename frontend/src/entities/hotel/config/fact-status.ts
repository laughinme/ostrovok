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
    pill: "bg-status-computed text-status-computed-foreground",
    bar: "bg-coral",
  },
  assumed: {
    label: "Предположение",
    icon: HelpCircle,
    pill: "bg-status-assumed text-status-assumed-foreground",
    bar: "bg-conf-mid",
  },
  conflict: {
    label: "Противоречие",
    icon: AlertTriangle,
    pill: "bg-status-conflict text-status-conflict-foreground",
    bar: "bg-conf-conflict",
  },
};
