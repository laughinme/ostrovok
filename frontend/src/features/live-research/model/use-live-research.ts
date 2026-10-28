import { isFinished, useAgentRun } from "@/entities/agent-run";
import { useEffect, useRef, useState } from "react";
import { addWish, readSearch, researchChip, type SearchResult } from "../api/research";

const REFRESH_AFTER_MS = [0, 12000, 30000, 50000];

export function useLiveResearch(
  searchId: string | undefined,
  onSearch: (search: SearchResult | null) => void,
) {
  const [runId, setRunId] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useAgentRun(runId);
  const refreshed = useRef<string | null>(null);

  useEffect(() => {
    if (!searchId || !runId || !isFinished(run.data) || refreshed.current === runId) return;
    refreshed.current = runId;
    const timers = REFRESH_AFTER_MS.map((delay) =>
      setTimeout(() => {
        readSearch(searchId)
          .then(onSearch)
          .catch(() => setError("Не удалось обновить выдачу"));
      }, delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [searchId, runId, run.data, onSearch]);

  async function launch(title: string, start: () => Promise<string | null | undefined>) {
    setBusy(true);
    setError(null);
    setLabel(title);
    try {
      const id = await start();
      setRunId(id ?? null);
    } catch {
      setError("Агент не запустился, попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  }

  return {
    runId,
    run: run.data,
    label,
    error,
    busy,
    wish: (text: string) =>
      searchId
        ? launch(`Новое пожелание: «${text}»`, async () => {
            const started = await addWish(searchId, text);
            onSearch(started.search);
            return started.runId;
          })
        : Promise.resolve(),
    research: (chipId: string, title: string) =>
      searchId
        ? launch(
            `Узнаём вживую: «${title}»`,
            async () => (await researchChip(searchId, chipId)).runId,
          )
        : Promise.resolve(),
    reset: () => {
      setRunId(null);
      setLabel(null);
      onSearch(null);
    },
  };
}
