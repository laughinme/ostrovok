import { api, type components } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";

export type ApiRun = components["schemas"]["AgentRunOut"];
export type ApiStep = components["schemas"]["AgentStepOut"];

const FINISHED = new Set<ApiRun["status"]>(["done", "failed"]);

export function isFinished(run: ApiRun | undefined): boolean {
  return !!run && FINISHED.has(run.status);
}

export function runQuery(runId: string) {
  return {
    queryKey: ["run", runId],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<ApiRun>(`/runs/${encodeURIComponent(runId)}`, { signal }),
  };
}

export function useAgentRun(runId: string | null | undefined) {
  return useQuery({
    ...runQuery(runId ?? ""),
    enabled: !!runId,
    refetchInterval: (query) => (isFinished(query.state.data) ? false : 1200),
    refetchOnWindowFocus: false,
  });
}
