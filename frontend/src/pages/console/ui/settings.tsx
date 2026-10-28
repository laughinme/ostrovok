import { demoApi } from "@/entities/session";
import { useConsoleAction, useConsoleQuery, type Schema } from "../api/console";
import { LoadState } from "./common";

export function Settings() {
  const query = useConsoleQuery<Schema["SettingsModel"]>("/console/settings");
  const save = useConsoleAction((llmMode: "auto" | "off") =>
    demoApi<Schema["SettingsModel"]>("operator", "/console/settings", "PUT", {
      llmMode,
    } satisfies Schema["SettingsModel"]),
  );
  return (
    <>
      <div className="console-section-heading">
        <div>
          <h2>Настройки</h2>
          <p>Как агенты разбирают запросы и учатся новому.</p>
        </div>
      </div>
      <LoadState pending={query.isPending} error={query.error} retry={() => void query.refetch()} />
      {query.data && (
        <section className="console-panel space-y-6 p-5 sm:p-6">
          <fieldset disabled={save.isPending || query.isFetching}>
            <legend className="mb-3 font-semibold">Режим LLM</legend>
            <div className="space-y-3">
              {(
                [
                  [
                    "auto",
                    "Автоматически",
                    "Используем LLM, если модель доступна. Иначе — правила.",
                  ],
                  ["off", "Только правила", "Без вызовов языковых моделей."],
                ] as const
              ).map(([mode, title, detail]) => (
                <label
                  key={mode}
                  className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-4"
                >
                  <input
                    type="radio"
                    name="llm-mode"
                    value={mode}
                    checked={query.data.llmMode === mode}
                    onChange={() => save.mutate(mode)}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    <strong className="text-sm">{title}</strong>
                    <span className="mt-1 block text-sm text-muted-foreground">{detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-sm">
            {query.data.llmAvailable
              ? "LLM подключена"
              : "LLM недоступна — агенты работают по правилам"}
          </p>
          <dl className="space-y-4 border-t pt-5">
            <div>
              <dt className="text-sm text-muted-foreground">Модель разбора</dt>
              <dd className="mt-1 break-all">{query.data.llmModel ?? "Не задана"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Модель Куратора</dt>
              <dd className="mt-1 break-all">{query.data.llmModelStrong ?? "Не задана"}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Модели задаются на сервере. Здесь можно переключить режим.
          </p>
          <LoadState error={save.error} />
          {save.isSuccess && (
            <p role="status" className="text-sm">
              Режим сохранён.
            </p>
          )}
        </section>
      )}
    </>
  );
}
