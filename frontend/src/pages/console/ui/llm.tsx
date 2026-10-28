import { useState } from "react";
import { useConsoleQuery, type Schema } from "../api/console";
import { dateTime, money } from "../lib/format";
import { Empty, JsonDetails, LoadState } from "./common";

const statuses = { ok: "Успешно", cached: "Из кэша", failed: "Ошибка", limit: "Лимит" };

export function LlmJournal() {
  const [task, setTask] = useState("");
  const [period, setPeriod] = useState<"today" | "total">("today");
  const usage = useConsoleQuery<Schema["LlmUsageOut"]>("/console/llm/usage", 10000);
  const calls = useConsoleQuery<Schema["LlmCallOut"][]>(
    `/console/llm/calls?limit=30${task ? `&task=${task}` : ""}`,
    10000,
  );
  return (
    <>
      <div className="console-section-heading">
        <div>
          <h2>Журнал LLM</h2>
          <p>Запросы к моделям, ответы и стоимость.</p>
        </div>
      </div>
      <LoadState pending={usage.isPending} error={usage.error} retry={() => void usage.refetch()} />
      {usage.data && (
        <section className="console-panel mb-6 p-5">
          <dl className="flex flex-wrap gap-x-12 gap-y-4">
            <div>
              <dt className="text-sm text-muted-foreground">Сегодня</dt>
              <dd className="mt-1 text-2xl font-semibold">{money(usage.data.todayCostUsd)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">За всё время</dt>
              <dd className="mt-1 text-2xl font-semibold">{money(usage.data.totalCostUsd)}</dd>
            </div>
          </dl>
          <label className="console-field mb-3 mt-5 max-w-52">
            Расход по задачам
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as "today" | "total")}
            >
              <option value="today">Сегодня</option>
              <option value="total">За всё время</option>
            </select>
          </label>
          {usage.data[period].length === 0 ? (
            <Empty>За этот период вызовов нет.</Empty>
          ) : (
            <ul className="divide-y">
              {usage.data[period].map((item) => (
                <li
                  key={`${item.task}-${item.model}`}
                  className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <strong>{item.task}</strong>
                    <span className="ml-2 break-all text-xs text-muted-foreground">
                      {item.model}
                    </span>
                  </div>
                  <span>
                    {item.calls} выз. · {item.cached} из кэша · {item.failed} ошибок ·{" "}
                    {money(item.costUsd)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <div className="console-section-heading">
        <h3 className="text-lg">Последние 30 вызовов</h3>
        <label className="console-field">
          Задача
          <select value={task} onChange={(event) => setTask(event.target.value)}>
            <option value="">Все задачи</option>
            {["intent", "answer", "curator", "explain"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <LoadState pending={calls.isPending} error={calls.error} retry={() => void calls.refetch()} />
      {calls.data?.length === 0 && (
        <Empty>Вызовов пока нет. В режиме правил LLM не используется.</Empty>
      )}
      <div className="space-y-3">
        {calls.data?.map((call) => (
          <details key={call.id} className="console-details">
            <summary>
              <span className="inline-flex w-[calc(100%-20px)] flex-wrap items-center justify-between gap-3 align-middle">
                <span>
                  <strong>{call.task}</strong>
                  <span className="ml-2 break-all text-muted-foreground">{call.model}</span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {dateTime(call.createdAt)} ·{" "}
                    {String(call.usage["inputTokens"] ?? call.usage["input_tokens"] ?? 0)} →{" "}
                    {String(call.usage["outputTokens"] ?? call.usage["output_tokens"] ?? 0)} токенов
                    · {call.latencyMs} мс
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="console-badge">{statuses[call.status]}</span>
                  {money(call.costUsd)}
                </span>
              </span>
            </summary>
            <div className="space-y-3 border-t p-4">
              {call.error && (
                <p role="alert" className="break-words text-sm">
                  {call.error}
                </p>
              )}
              <JsonDetails title="Запрос · prompt" value={call.prompt} />
              <JsonDetails title="Ответ · JSON" value={call.output} />
              <JsonDetails title="Вызовы инструментов" value={call.toolCalls} />
              <JsonDetails title="Все данные о токенах" value={call.usage} />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
