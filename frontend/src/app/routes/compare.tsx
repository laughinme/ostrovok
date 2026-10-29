import { ComparePage } from "@/pages/compare";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Сравнение отелей - О!кно" },
      {
        name: "description",
        content: "Сравните отели по важным для вас критериям и получите рекомендацию AI.",
      },
      { property: "og:title", content: "Сравнение отелей - О!кно" },
      {
        property: "og:description",
        content: "Плюсы, минусы и компромиссы без перегруженных таблиц.",
      },
    ],
  }),
  component: ComparePage,
});
