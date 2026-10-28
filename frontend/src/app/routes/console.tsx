import { ConsolePage } from "@/pages/console";
import { SessionGate } from "@/features/authenticate";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/console")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    section?: string | undefined;
    runId?: string | undefined;
    hotelId?: string | undefined;
  } => ({
    section: typeof search["section"] === "string" ? search["section"] : undefined,
    runId: typeof search["runId"] === "string" ? search["runId"] : undefined,
    hotelId: typeof search["hotelId"] === "string" ? search["hotelId"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Консоль знаний — О!кно" }] }),
  component: () => (
    <SessionGate role="operator">
      <ConsolePage />
    </SessionGate>
  ),
});
