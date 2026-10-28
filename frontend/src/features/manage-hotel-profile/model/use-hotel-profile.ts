import { catalogQuery, factFromApi, hotelFromApi, hotelQuery } from "@/entities/hotel";
import { demoApi, useSession } from "@/entities/session";
import { api, getApiMode, type components } from "@/shared/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type Question = components["schemas"]["QuestionOut"];
type Overview = components["schemas"]["PartnerOverviewOut"];
type Answer = components["schemas"]["AnswerOut"];

export function useHotelProfile() {
  const client = useQueryClient();
  const account = useSession((state) => state.account);
  const [selectedHotelId, selectHotel] = useState<string | null>(null);
  const persona = account?.persona ?? "hotelier_salut";
  const demo = getApiMode() === "demo";
  const personas = useQuery({
    queryKey: ["auth", "personas"],
    queryFn: ({ signal }) =>
      api<components["schemas"]["PersonaOut"][]>("/auth/personas", { signal }),
    enabled: !demo,
  });
  const catalog = useQuery(catalogQuery);
  const ownedOsmIds = demo
    ? ["node/1521215547"]
    : (personas.data?.find((item) => item.key === account?.persona)?.hotels ?? []);
  const availableHotels = catalog.data?.filter((hotel) => ownedOsmIds.includes(hotel.osmId)) ?? [];
  const raw = availableHotels.find((hotel) => hotel.id === selectedHotelId) ?? availableHotels[0];
  const detail = useQuery({ ...hotelQuery(raw?.id ?? ""), enabled: !!raw });
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
      text: "Здравствуйте! Помогу уточнить детали об отеле. Выберите вопрос гостя или характеристику и ответьте своими словами.",
    },
  ]);
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<{ kind: "question" | "fact"; id: string } | null>(null);
  const [feedback, setFeedback] = useState<{
    id: string;
    kind: "question" | "fact";
    text: string;
  } | null>(null);
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
    onSuccess: (result, variables) => {
      refresh();
      const line =
        "clarification" in result && result.clarification
          ? result.clarification
          : "Сохранено. Информация в профиле отеля обновлена.";
      setMsgs((current) => [...current, { from: "bot", text: line }]);
      const parts = variables.path.split("/");
      const id = parts[3]!;
      const question = questions.data?.find((item) => item.id === id);
      const fact = facts.find((item) => item.id === id);
      const text = (variables.body as { text?: string } | undefined)?.text;
      const description = question
        ? `Ответ на «${question.text}»: ${text}`
        : text
          ? `Уточнение «${fact?.label}»: ${text}`
          : `Подтверждено: ${fact?.label}`;
      setHistory((current) => [
        { t: "сейчас", text: result.changedFacts.length ? description : line },
        ...current,
      ]);
      setFeedback({
        id: parts[3]!,
        kind: parts[2] === "questions" ? "question" : "fact",
        text: line,
      });
      if (result.changedFacts.length > 0 && target?.id === id) {
        setTarget(null);
        setInput("");
      }
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
    if (action.isPending) return;
    setFeedback(null);
    setTarget({ kind: "question", id });
    setInput("");
    const question = questions.data?.find((item) => item.id === id);
    if (question) setMsgs((current) => [...current, { from: "bot", text: question.text }]);
  };
  const correct = (id: string) => {
    if (action.isPending) return;
    setFeedback(null);
    const fact = facts.find((item) => item.id === id);
    if (fact?.id) {
      setTarget({ kind: "fact", id: fact.id });
      setInput(`Уточнение про «${fact.label}»: `);
    }
  };
  return {
    availableHotels,
    selectHotel,
    hotel: detail.data ?? (raw ? hotelFromApi(raw) : undefined),
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
    coverageKnown: overview.data?.coverage.known ?? 0,
    coverageTotal: overview.data?.coverage.total ?? 0,
    conflicts: overview.data?.conflicts ?? [],
    selectedId: target?.id,
    selectedKind: target?.kind,
    feedback,
    cancelSelection: () => {
      if (action.isPending) return;
      setTarget(null);
      setInput("");
    },
    pending:
      catalog.isPending ||
      (!demo && personas.isPending) ||
      (!!raw && (detail.isPending || overview.isPending || questions.isPending)),
    error:
      (!catalog.data ? catalog.error : null) ??
      (!detail.data ? detail.error : null) ??
      (!overview.data ? overview.error : null) ??
      (!questions.data ? questions.error : null) ??
      personas.error ??
      (!catalog.isPending && (demo || personas.isSuccess) && !raw
        ? new Error(
            "К этому аккаунту пока не привязан отель. Выберите аккаунт отельера с назначенным объектом.",
          )
        : null),
    retry: () => {
      void catalog.refetch();
      if (!demo) void personas.refetch();
      if (raw) {
        void detail.refetch();
        void overview.refetch();
        void questions.refetch();
      }
    },
    saving: action.isPending,
  };
}
