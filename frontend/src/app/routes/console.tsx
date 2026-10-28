import { ConsolePage } from "@/pages/console";
import { SessionGate } from "@/features/authenticate";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/console")({
  head: () => ({ meta: [{ title: "Консоль знаний — О!кно" }] }),
  component: () => (
    <SessionGate role="operator">
      <ConsolePage />
    </SessionGate>
  ),
});
