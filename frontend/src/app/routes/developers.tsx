import { DevelopersPage } from "@/pages/developers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/developers")({
  head: () => ({ meta: [{ title: "Для разработчиков - О!кно" }] }),
  component: DevelopersPage,
});
