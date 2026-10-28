import type { ReactNode } from "react";
import { useAgentRun } from "@/entities/agent-run";
import { AgentTrace } from "@/widgets/agent-trace";

export function LoadState({
  pending,
  error,
  retry,
}: {
  pending?: boolean;
  error?: Error | null;
  retry?: () => void;
}) {
  if (!pending && !error) return null;
  return (
    <div className="console-notice" role={error ? "alert" : "status"}>
      <p>{error ? error.message : "Загружаем данные…"}</p>
      {error && retry && (
        <button className="console-button secondary mt-3" onClick={retry}>
          Повторить
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="console-notice text-muted-foreground">{children}</p>;
}

export function JsonDetails({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="console-details">
      <summary>{title}</summary>
      <pre>{typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2)}</pre>
    </details>
  );
}

export function RunTrace({ runId }: { runId: string | null }) {
  const query = useAgentRun(runId);
  if (!runId)
    return (
      <div className="rounded-3xl bg-night p-6 text-night-foreground">
        <h3 className="text-lg text-sun">Как агент получает знание</h3>
        <p className="mt-3 text-sm text-night-muted">
          Выберите запуск. Здесь появятся мысли, инструменты, источники и решение агента.
        </p>
      </div>
    );
  return (
    <div className="min-w-0 space-y-3">
      <LoadState pending={query.isPending} error={query.error} retry={() => void query.refetch()} />
      {query.data && (
        <>
          <AgentTrace run={query.data} />
          <JsonDetails title="Полная трасса · входы и результаты" value={query.data.steps} />
        </>
      )}
    </div>
  );
}
