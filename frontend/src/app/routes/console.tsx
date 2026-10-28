import { ConsolePage } from "@/pages/console";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/console")({
  head: () => ({ meta: [{ title: "Консоль знаний — О!кно" }] }),
  component: ConsolePage,
});
