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
  const generation = useRef(0);
  const finished = isFinished(run.data);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!searchId || !runId || !finished) return;
    const controller = new AbortController();
    const timers = REFRESH_AFTER_MS.map((delay) =>
      setTimeout(() => {
        readSearch(searchId, controller.signal)
          .then(onSearch)
          .catch(() => {
            if (!controller.signal.aborted) setError("Не удалось обновить выдачу");
          });
      }, delay),
    );
    return () => {
      controller.abort();
      timers.forEach(clearTimeout);
    };
  }, [searchId, runId, finished, onSearch]);

  async function launch(title: string, start: () => Promise<string | null | undefined>) {
    const active = ++generation.current;
    setBusy(true);
    setError(null);
    setLabel(title);
    try {
      const id = await start();
      if (active !== generation.current) return;
      setRunId(id ?? null);
    } catch {
      if (active === generation.current) setError("Агент не запустился, попробуйте ещё раз");
    } finally {
      if (active === generation.current) setBusy(false);
    }
  }

  return {
    runId,
    run: run.data,
    label,
    error: error ?? run.error?.message ?? null,
    busy: busy || (!!runId && !finished && !run.error),
    wish: (text: string) =>
      searchId
        ? launch(`Новое пожелание: «${text}»`, async () => {
            const active = generation.current;
            const started = await addWish(searchId, text);
            if (active === generation.current) onSearch(started.search);
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
      generation.current += 1;
      setBusy(false);
      setError(null);
      setRunId(null);
      setLabel(null);
      onSearch(null);
    },
  };
}
