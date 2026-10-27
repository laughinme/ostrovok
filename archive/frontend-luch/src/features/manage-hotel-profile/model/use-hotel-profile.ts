import type { Fact } from "@/entities/hotel";
import { useState } from "react";
import { toast } from "sonner";
import { hotel, INITIAL_Q, type Msg } from "./demo-profile";
export function useHotelProfile() {
  const [facts, setFacts] = useState<Fact[]>(hotel.facts);
  const [qs, setQs] = useState(INITIAL_Q);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: "bot",
      text: "Здравствуйте! Я агент Луча. Нашёл противоречие: на сайте указан лифт к пляжу, а гости пишут, что он закрыт. Подскажете, как сейчас?",
    },
  ]);
  const [input, setInput] = useState("");
  const [helped, setHelped] = useState(1240);
  const [history, setHistory] = useState([
    { t: "14 окт", text: "Подтверждена площадь парка — 9 га" },
    { t: "9 окт", text: "AI вычислил перепад высот до пляжа: 38 м" },
    { t: "2 окт", text: "Добавлено фото номеров 3 этажа" },
  ]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { from: "me", text }]);
    setInput("");
    setTimeout(() => {
      const isLift = /лифт/i.test(text) || msgs.length < 3;
      setMsgs((m) => [
        ...m,
        {
          from: "bot",
          text: isLift
            ? "Спасибо! Обновил характеристику «Лифт к пляжу» и пометил её как подтверждённую вами. 312 путешественников с запросом «пляж без лестниц» увидят точные данные."
            : "Принял, записал. Это уточнение попадёт в описание после проверки — обычно в течение часа.",
        },
      ]);
      if (isLift) {
        setFacts((fs) =>
          fs.map((f) =>
            f.status === "conflict"
              ? {
                  ...f,
                  value: text.slice(0, 60),
                  status: "confirmed",
                  confidence: 0.97,
                  source: "Отельер",
                  checkedAt: "сегодня",
                  note: undefined,
                }
              : f,
          ),
        );
        setQs((q) => q.map((x) => (x.id === 1 ? { ...x, done: true } : x)));
        setHelped((h) => h + 312);
        setHistory((h) => [{ t: "сегодня", text: "Отельер ответил про лифт к пляжу" }, ...h]);
      }
    }, 900);
  };

  const confirm = (label: string) => {
    setFacts((fs) =>
      fs.map((f) =>
        f.label === label
          ? {
              ...f,
              status: "confirmed",
              confidence: Math.max(f.confidence, 0.95),
              source: "Отельер",
              checkedAt: "сегодня",
            }
          : f,
      ),
    );
    setHistory((h) => [{ t: "сегодня", text: `Подтверждено: ${label}` }, ...h]);
    setHelped((h) => h + 57);
    toast.success("Характеристика подтверждена");
  };

  const confirmed = facts.filter((f) => f.status === "confirmed").length;

  return { hotel, facts, qs, msgs, input, setInput, helped, history, send, confirm, confirmed };
}
