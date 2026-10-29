import { ResultsPage } from "@/pages/results";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/results")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    q?: string | undefined;
    hotelId?: string | undefined;
  } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    hotelId: typeof s["hotelId"] === "string" ? s["hotelId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Подобранные отели Сочи - О!кно" },
      {
        name: "description",
        content:
          "Отели, отсортированные по совпадению с вашим запросом, с объяснениями и компромиссами.",
      },
      { property: "og:title", content: "Подобранные отели Сочи - О!кно" },
      { property: "og:description", content: "AI объясняет, почему каждый отель вам подходит." },
    ],
  }),
  component: PageRoute,
});
function PageRoute() {
  const { q, hotelId } = Route.useSearch();
  return <ResultsPage key={`${q}:${hotelId ?? ""}`} query={q} hotelId={hotelId} />;
}
