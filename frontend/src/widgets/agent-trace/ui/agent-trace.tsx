import {
  AGENT_TITLES,
  STATUS_TITLES,
  STEP_TITLES,
  isFinished,
  type ApiRun,
  type ApiStep,
} from "@/entities/agent-run";
import { cn } from "@/shared/lib";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Brain,
  CircleAlert,
  CircleCheck,
  Lightbulb,
  LoaderCircle,
  Wrench,
} from "lucide-react";

const STEP_ICONS = {
  reason: Lightbulb,
  tool: Wrench,
  result: CircleCheck,
  decision: CircleCheck,
  error: CircleAlert,
} satisfies Record<ApiStep["kind"], unknown>;

function usageLine(run: ApiRun): string | null {
  const usage = run.usage;
  if (!usage || usage.requests === 0) return null;
  const cost = usage.costUsd < 0.01 ? usage.costUsd.toFixed(4) : usage.costUsd.toFixed(2);
  return `LLM: ${usage.requests} запр. · ${usage.inputTokens} → ${usage.outputTokens} токенов · $${cost}`;
}

function isLlmStep(step: ApiStep): boolean {
  return step.tool?.startsWith("llm.") ?? false;
}

export function AgentTrace({
  run,
  title,
  compact = false,
  className,
}: {
  run: ApiRun | undefined;
  title?: string;
  compact?: boolean;
  className?: string;
}) {
  const finished = isFinished(run);
  const steps = run?.steps ?? [];
  const usage = run ? usageLine(run) : null;
  const usedLlm = run?.planner === "llm" || steps.some(isLlmStep);
  return (
    <section
      aria-live="polite"
      aria-label="Ход агента"
      className={cn("rounded-3xl bg-night p-5 text-night-foreground shadow-soft", className)}
    >
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-sun text-night">
          {finished ? (
            <Bot className="h-4 w-4" />
          ) : (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.14em] text-night-muted">
            {run ? AGENT_TITLES[run.agent] : "Агент"} ·{" "}
            {run ? STATUS_TITLES[run.status] : "запускаем"}
          </p>
          <p className="truncate text-sm font-semibold">
            {title ?? run?.goal ?? "Готовим исследование"}
          </p>
        </div>
        {run && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              usedLlm ? "bg-sun text-night" : "bg-night-foreground/10",
            )}
          >
            {usedLlm ? "LLM" : "правила"}
          </span>
        )}
      </header>
      <ol className={cn("mt-4 space-y-2", compact && "max-h-56 overflow-y-auto pr-1")}>
        <AnimatePresence initial={false}>
          {steps.map((step) => {
            const Icon = isLlmStep(step) ? Brain : STEP_ICONS[step.kind];
            return (
              <motion.li
                key={step.seq}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 text-sm leading-snug"
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    step.kind === "error"
                      ? "text-coral"
                      : isLlmStep(step)
                        ? "text-sun"
                        : "text-night-muted",
                  )}
                />
                <span className="min-w-0">
                  <span className="mr-2 text-[11px] uppercase tracking-[0.1em] text-night-muted">
                    {isLlmStep(step) ? "LLM" : STEP_TITLES[step.kind]}
                  </span>
                  {step.summary}
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {!finished && (
          <li className="flex items-center gap-3 text-sm text-night-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" /> агент работает…
          </li>
        )}
      </ol>
      {usage && <p className="mt-4 font-mono text-[11px] text-night-muted">{usage}</p>}
    </section>
  );
}
