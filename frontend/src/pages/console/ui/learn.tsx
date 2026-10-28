import { useEffect, useState } from "react";
import { isFinished, useAgentRun } from "@/entities/agent-run";
import { demoApi } from "@/entities/session";
import { useConsoleAction, useConsoleQuery, type RegistryEntry, type Schema } from "../api/console";
import { characteristicKey } from "../lib/format";
import { Empty, LoadState, RunTrace } from "./common";

export function Learn() {
  const [description, setDescription] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [publishRunId, setPublishRunId] = useState<string | null>(null);
  const run = useAgentRun(runId);
  const publication = useAgentRun(publishRunId);
  const registry = useConsoleQuery<RegistryEntry[]>("/console/registry");
  const { refetch } = registry;
  useEffect(() => {
    if (isFinished(run.data) || isFinished(publication.data)) void refetch();
  }, [run.data, publication.data, refetch]);
  const learn = useConsoleAction(
    (text: string) =>
      demoApi<Schema["RunStarted"]>("operator", "/console/characteristics", "POST", {
        description: text,
      } satisfies Schema["LearnRequest"]),
    (result) => {
      setRunId(result.runId);
      setPublishRunId(null);
    },
  );
  const publish = useConsoleAction(
    (key: string) =>
      demoApi<Schema["RunStarted"]>(
        "operator",
        `/console/characteristics/${encodeURIComponent(key)}/publish`,
        "POST",
      ),
    (result) => setPublishRunId(result.runId),
  );
  const key = characteristicKey(run.data);
  const entry = registry.data?.find((item) => item.key === key);
  const busy =
    learn.isPending ||
    (!!runId && !isFinished(run.data)) ||
    publish.isPending ||
    (!!publishRunId && !isFinished(publication.data));
  return (
    <>
      <div className="console-section-heading">
        <div>
          <h2>Научить новому</h2>
          <p>Куратор найдёт способ проверки и подготовит характеристику.</p>
        </div>
      </div>
      <form
        className="console-panel space-y-5 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const text = description.trim();
          if (text.length < 3 || busy) return;
          publish.reset();
          learn.mutate(text);
        }}
      >
        <label className="console-field">
          Опишите характеристику словами
          <textarea
            rows={3}
            minLength={3}
            maxLength={300}
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Например, круглосуточная аптека в 500 метрах"
          />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button className="console-button" disabled={busy || description.trim().length < 3}>
            {learn.isPending ? "Запускаем…" : "Научить агента"}
          </button>
          <span className="text-xs text-muted-foreground">
            Сначала черновик, затем публикация для всех отелей.
          </span>
        </div>
        <LoadState error={learn.error} />
      </form>
      {runId && (
        <div className="mt-5 space-y-4">
          <RunTrace runId={runId} />
          {key && !publishRunId && (
            <div className="console-panel flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold">{entry?.title ?? "Характеристика готова"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{entry?.how ?? key}</p>
              </div>
              <button
                className="console-button"
                disabled={busy || entry?.status === "published"}
                onClick={() => publish.mutate(key)}
              >
                {entry?.status === "published"
                  ? "Уже опубликовано"
                  : publish.isPending
                    ? "Публикуем…"
                    : "Опубликовать"}
              </button>
            </div>
          )}
          {run.data?.status === "done" && !key && (
            <Empty>
              Куратор не создал характеристику. Посмотрите решение в трассе и уточните описание.
            </Empty>
          )}
          <LoadState error={publish.error} />
          {publishRunId && (
            <>
              <h3 className="text-lg">Публикация и проверка отелей</h3>
              <RunTrace runId={publishRunId} />
              {publication.data?.status === "failed" && key && (
                <button
                  className="console-button secondary"
                  disabled={publish.isPending}
                  onClick={() => publish.mutate(key)}
                >
                  Повторить публикацию
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
