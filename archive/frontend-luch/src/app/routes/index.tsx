import { HomePage } from "@/pages/home";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Луч — опишите идеальный отель своими словами" },
      {
        name: "description",
        content:
          "AI-агенты Луча анализируют геоданные, отзывы и ответы отельеров, чтобы найти отель в Сочи под ваш запрос.",
      },
      { property: "og:title", content: "Луч — AI-поиск идеального отеля" },
      {
        property: "og:description",
        content: "Тишина, закат, работа, дети, собака — просто напишите, что вам важно.",
      },
    ],
  }),
  component: HomePage,
});
