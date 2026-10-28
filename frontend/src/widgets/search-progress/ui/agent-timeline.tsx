import { cn } from "@/shared/lib";
import { motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";

export function AgentTimeline({
  stages,
  step,
  duration,
  reducedMotion,
}: {
  stages: { title: string; icon: LucideIcon }[];
  step: number;
  duration: number;
  reducedMotion: boolean;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute left-5 right-5 top-[19px] h-0.5 overflow-hidden rounded-full bg-night-foreground/10"
      >
        <motion.div
          className="h-full origin-left rounded-full bg-sun/85"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.min((step + 1) / (stages.length - 1), 1) }}
          transition={{ duration: reducedMotion ? 0 : duration / 1000, ease: "linear" }}
        />
      </div>
      <ol aria-label="Этапы поиска" className="relative flex items-start justify-between">
        {stages.map((stage, index) => {
          const state = index < step ? "done" : index === step ? "run" : "wait";
          const Icon = state === "done" ? Check : stage.icon;
          return (
            <li
              key={stage.title}
              title={stage.title}
              aria-current={state === "run" ? "step" : undefined}
              className="flex w-10 flex-col items-center gap-2"
            >
              <motion.span
                animate={{ scale: state === "run" && !reducedMotion ? 1.08 : 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className={cn(
                  "relative grid h-10 w-10 place-items-center rounded-full border transition-colors duration-300",
                  state === "done" && "border-sun bg-sun text-night",
                  state === "run" &&
                    "border-sun/70 bg-night text-sun shadow-[0_0_24px_rgba(183,242,141,0.12)]",
                  state === "wait" && "border-night-muted/25 bg-night text-night-muted/50",
                )}
              >
                {state === "run" && !reducedMotion && (
                  <svg
                    aria-hidden
                    viewBox="0 0 48 48"
                    className="absolute -inset-1 h-12 w-12 overflow-hidden text-sun"
                  >
                    <motion.circle
                      cx="24"
                      cy="24"
                      r="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="30 110"
                      strokeLinecap="round"
                      style={{ transformOrigin: "24px 24px" }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2.8, ease: "linear", repeat: Infinity }}
                    />
                  </svg>
                )}
                <motion.span
                  key={state}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon className="h-4 w-4" />
                </motion.span>
              </motion.span>
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums transition-colors",
                  state === "run"
                    ? "text-sun"
                    : state === "done"
                      ? "text-night-foreground/75"
                      : "text-night-muted/45",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
