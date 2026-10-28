import { catalogQuery, factFromApi, hotelFromApi } from "@/entities/hotel";
import { demoApi } from "@/entities/session";
import type { components } from "@/shared/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type Question = components["schemas"]["QuestionOut"];
type Overview = components["schemas"]["PartnerOverviewOut"];
type Answer = components["schemas"]["AnswerOut"];
const persona = "hotelier_salut";

export function useHotelProfile() {
  const client = useQueryClient();
  const catalog = useQuery(catalogQuery);
  const raw = catalog.data?.find((hotel) => hotel.osmId === "node/1521215547");
  const overview = useQuery({
    queryKey: ["partner", raw?.id],
    queryFn: () => demoApi<Overview>(persona, `/partner/hotels/${raw!.id}`),
    enabled: !!raw,
  });
  const questions = useQuery({
    queryKey: ["partner", raw?.id, "questions"],
    queryFn: () => demoApi<Question[]>(persona, `/partner/hotels/${raw!.id}/questions`),
    enabled: !!raw,
  });
  const [msgs, setMsgs] = useState<{ from: "bot" | "me"; text: string }[]>([
    {
      from: "bot",
      text: "Выберите вопрос агента или характеристику, которую хотите уточнить. Ответ сохранится в сервисе.",
    },
  ]);
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<{ kind: "question" | "fact"; id: string } | null>(null);
  const [history, setHistory] = useState<{ t: string; text: string }[]>([]);
  const facts = overview.data?.facts.map(factFromApi) ?? [];
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["partner"] });
    void client.invalidateQueries({ queryKey: ["hotels"] });
    void client.invalidateQueries({ queryKey: ["search"] });
    void client.invalidateQueries({ queryKey: ["comparison"] });
    void client.invalidateQueries({ queryKey: ["fact"] });
  };
  const action = useMutation({
    mutationFn: async ({ path, body }: { path: string; body?: unknown }) =>
      demoApi<Answer | components["schemas"]["ChangedFactsOut"]>(persona, path, "POST", body),
    onSuccess: (result) => {
      refresh();
      const line =
        "clarification" in result && result.clarification
          ? result.clarification
          : `Ответ сохранён. Обновлено фактов: ${result.changedFacts.length}.`;
      setMsgs((current) => [...current, { from: "bot", text: line }]);
      setHistory((current) => [{ t: "сейчас", text: line }, ...current]);
      setInput("");
    },
    onError: (error) => toast.error(error.message),
  });
  const send = (text: string) => {
    if (!text.trim() || action.isPending) return;
    const selected =
      target ??
      (questions.data?.find((question) => question.status === "open")
        ? {
            kind: "question" as const,
            id: questions.data.find((question) => question.status === "open")!.id,
          }
        : null);
    if (!selected) {
      toast.error("Сначала выберите вопрос или характеристику");
      return;
    }
    setMsgs((current) => [...current, { from: "me", text }]);
    action.mutate({
      path:
        selected.kind === "question"
          ? `/partner/questions/${selected.id}/answers`
          : `/partner/facts/${selected.id}/correct`,
      body: { text },
    });
  };
  const confirm = (id: string) => {
    const fact = facts.find((item) => item.id === id);
    if (fact?.id && !action.isPending) action.mutate({ path: `/partner/facts/${fact.id}/confirm` });
  };
  const selectQuestion = (id: string) => {
    setTarget({ kind: "question", id });
    setInput("");
    const question = questions.data?.find((item) => item.id === id);
    if (question) setMsgs((current) => [...current, { from: "bot", text: question.text }]);
  };
  const correct = (id: string) => {
    const fact = facts.find((item) => item.id === id);
    if (fact?.id) {
      setTarget({ kind: "fact", id: fact.id });
      setInput(`Уточнение про «${fact.label}»: `);
    }
  };
  return {
    hotel: raw ? hotelFromApi(raw) : undefined,
    facts,
    qs:
      questions.data?.map((question) => ({
        id: question.id,
        text: question.text,
        why: question.why,
        done: question.status === "answered",
      })) ?? [],
    msgs,
    input,
    setInput,
    history,
    send,
    confirm,
    selectQuestion,
    correct,
    confirmed: facts.filter((fact) => fact.status === "confirmed").length,
    coverage: Math.round((overview.data?.coverage.share ?? 0) * 100),
    pending: catalog.isPending || (!!raw && (overview.isPending || questions.isPending)),
    error:
      catalog.error ??
      overview.error ??
      questions.error ??
      (!catalog.isPending && !raw ? new Error("Демо-отель Салют отсутствует в каталоге") : null),
    retry: () => {
      void catalog.refetch();
      if (raw) {
        void overview.refetch();
        void questions.refetch();
      }
    },
    saving: action.isPending,
  };
}
