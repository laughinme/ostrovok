import { PartnerPage } from "@/pages/partner";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Кабинет отельера — Луч" },
      {
        name: "description",
        content:
          "Отвечайте на вопросы AI-агента один раз — и помогайте тысячам путешественников найти ваш отель.",
      },
      { property: "og:title", content: "Кабинет отельера — Луч" },
      {
        property: "og:description",
        content: "Подтверждайте и уточняйте данные, которые собрал AI.",
      },
    ],
  }),
  component: PartnerPage,
});
