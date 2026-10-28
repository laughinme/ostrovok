import { useState } from "react";
import { AGENT_TITLES, STATUS_TITLES, type ApiRun } from "@/entities/agent-run";
import { useConsoleQuery } from "../api/console";
import { dateTime, money } from "../lib/format";
import { Empty, LoadState, RunTrace } from "./common";

export function Runs() {
  const [agent, setAgent] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const query = useConsoleQuery<ApiRun[]>(
    `/console/runs?limit=30${agent ? `&agent=${agent}` : ""}`,
    5000,
  );
  const runId = selected ?? query.data?.[0]?.id ?? null;
  return (
    <>
      <div className="console-section-heading">
        <div>
          <h2>Агенты</h2>
          <p>Последние 30 запусков · обновляются автоматически</p>
        </div>
      </div>
      <LoadState pending={query.isPending} error={query.error} retry={() => void query.refetch()} />
      <div className="console-workspace">
        <RunTrace key={runId} runId={runId} className="console-workspace-trace" />
        <aside className="console-panel console-agent-panel" aria-label="Выбор агента и запуска">
          <div className="console-agent-filter">
            <label className="console-field">
              Агент
              <select
                value={agent}
                onChange={(event) => {
                  setAgent(event.target.value);
                  setSelected(null);
                }}
              >
                <option value="">Все агенты</option>
                {Object.entries(AGENT_TITLES).map(([key, title]) => (
                  <option key={key} value={key}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <h3 className="console-run-list-heading">Последние запуски</h3>
          {query.data?.length === 0 && (
            <Empty>Запусков пока нет. Добавьте характеристику в разделе «Научить новому».</Empty>
          )}
          <ul className="console-run-list divide-y" aria-label="Последние запуски">
            {query.data?.map((run) => (
              <li key={run.id}>
                <button
                  className="console-run"
                  aria-pressed={runId === run.id}
                  onClick={() => setSelected(run.id)}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{AGENT_TITLES[run.agent]}</strong>
                    <span className="console-badge">{STATUS_TITLES[run.status]}</span>
                  </span>
                  <span className="mt-2 block text-sm">{run.goal}</span>
                  <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{run.planner === "llm" ? "LLM" : "Правила"}</span>
                    <span>{dateTime(run.createdAt)}</span>
                    <span>{money(run.usage?.costUsd)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
