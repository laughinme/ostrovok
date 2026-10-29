import { PartnerPage } from "@/pages/partner";
import { SessionGate } from "@/features/authenticate";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Кабинет отельера - О!кно" },
      {
        name: "description",
        content:
          "Отвечайте на вопросы AI-агента один раз - и помогайте тысячам путешественников найти ваш отель.",
      },
      { property: "og:title", content: "Кабинет отельера - О!кно" },
      {
        property: "og:description",
        content: "Подтверждайте и уточняйте данные, которые собрал AI.",
      },
    ],
  }),
  component: () => (
    <SessionGate role="hotelier">
      <PartnerPage />
    </SessionGate>
  ),
});
