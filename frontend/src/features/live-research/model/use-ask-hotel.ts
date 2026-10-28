import { useAgentRun } from "@/entities/agent-run";
import { useState } from "react";
import { askHotel } from "../api/research";

export function useAskHotel(hotelId: string, searchId: string | undefined) {
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useAgentRun(runId);
  return {
    asked,
    run: run.data,
    error: error ?? run.error?.message ?? null,
    ask: async (characteristic: string, question: string) => {
      setError(null);
      setAsked((current) => new Set(current).add(characteristic));
      try {
        setRunId((await askHotel(hotelId, characteristic, searchId, question)).runId);
        return true;
      } catch {
        setAsked((current) => {
          const next = new Set(current);
          next.delete(characteristic);
          return next;
        });
        setError("Не получилось отправить вопрос, попробуйте ещё раз");
        return false;
      }
    },
  };
}
