import { cn } from "@/shared/lib";
import { motion } from "framer-motion";
import { STATUS } from "../config/fact-status";
import type { FactStatus } from "../model/types";
export function Beam({
  value,
  status = "computed",
  className,
}: {
  value: number;
  status?: FactStatus;
  className?: string;
}) {
  return (
    <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.round(value * 100)}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        className={cn("h-full rounded-full", STATUS[status].bar)}
      />
    </div>
  );
}
