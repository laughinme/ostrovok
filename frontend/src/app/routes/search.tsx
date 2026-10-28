import { SearchPage } from "@/pages/search";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Подбираем ваш отдых — О!кно" },
      {
        name: "description",
        content: "Подбираем отели с учётом ваших пожеланий.",
      },
      { property: "og:title", content: "Подбираем ваш отдых — О!кно" },
      { property: "og:description", content: "Подбираем отели с учётом ваших пожеланий." },
    ],
  }),
  component: PageRoute,
});
function PageRoute() {
  const { q } = Route.useSearch();
  return <SearchPage key={q} query={q} />;
}
