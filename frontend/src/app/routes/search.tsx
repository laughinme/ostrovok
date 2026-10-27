import { SearchPage } from "@/pages/search";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Агенты Луча за работой" },
      {
        name: "description",
        content: "Смотрите в реальном времени, как AI-агенты разбирают запрос и проверяют отели.",
      },
      { property: "og:title", content: "Агенты Луча за работой" },
      { property: "og:description", content: "Прозрачный процесс AI-поиска отеля." },
    ],
  }),
  component: PageRoute,
});
function PageRoute() {
  const { q } = Route.useSearch();
  return <SearchPage key={q} query={q} />;
}
