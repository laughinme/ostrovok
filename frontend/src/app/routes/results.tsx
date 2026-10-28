import { ResultsPage } from "@/pages/results";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/results")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Подобранные отели Сочи — Луч" },
      {
        name: "description",
        content:
          "Отели, отсортированные по совпадению с вашим запросом, с объяснениями и компромиссами.",
      },
      { property: "og:title", content: "Подобранные отели Сочи — Луч" },
      { property: "og:description", content: "AI объясняет, почему каждый отель вам подходит." },
    ],
  }),
  component: PageRoute,
});
function PageRoute() {
  const { q } = Route.useSearch();
  return <ResultsPage key={q} query={q} />;
}
