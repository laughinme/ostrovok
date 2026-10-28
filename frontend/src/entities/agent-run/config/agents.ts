import type { ApiRun, ApiStep } from "../api/agent-run";

export const AGENT_TITLES: Record<ApiRun["agent"], string> = {
  researcher: "Исследователь",
  curator: "Куратор",
  liaison: "Связной",
  reconciler: "Сверщик",
  watcher: "Наблюдатель",
  intent: "Агент намерений",
  matcher: "Подборщик",
  simulator: "Демо-отельер",
};

export const STEP_TITLES: Record<ApiStep["kind"], string> = {
  reason: "мысль",
  tool: "инструмент",
  result: "результат",
  decision: "решение",
  error: "ошибка",
};

export const STATUS_TITLES: Record<ApiRun["status"], string> = {
  queued: "в очереди",
  running: "работает",
  done: "готово",
  failed: "ошибка",
};
