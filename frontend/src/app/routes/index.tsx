import { HomePage } from "@/pages/home";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { v?: string; variants?: string } => ({
    ...(typeof search["v"] === "string" ? { v: search["v"] } : {}),
    ...(search["variants"] === "1" || search["variants"] === 1 ? { variants: "1" } : {}),
  }),
  head: () => ({
    meta: [
      { title: "О!кно - опишите идеальный отель своими словами" },
      {
        name: "description",
        content:
          "AI-агенты О!кна анализируют геоданные, расчёты и ответы отельеров, чтобы найти отель в Сочи под ваш запрос.",
      },
      { property: "og:title", content: "О!кно - AI-поиск идеального отеля" },
      {
        property: "og:description",
        content: "Тишина, закат, работа, дети, собака - просто напишите, что вам важно.",
      },
    ],
  }),
  component: HomePage,
});
