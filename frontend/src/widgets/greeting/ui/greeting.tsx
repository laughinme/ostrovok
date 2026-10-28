import { cn } from "@/shared/lib";
import { useEffect, useState } from "react";

const NICK_KEY = "luch-nick";

const NICKS = [
  "Nipery",
  "MorskyKot",
  "Zakatnaya",
  "Kiparis",
  "Tumanov",
  "Volna99",
  "Shtorm",
  "Palmovaia",
  "Mayak",
  "Priboi",
  "Aistionok",
  "GornyiDuh",
];

function pickNick() {
  return NICKS[Math.floor(Math.random() * NICKS.length)]!;
}

const PHRASES: Array<{ text: string; font: string }> = [
  { text: "Какой твой отель мечты?", font: "font-display" },
  { text: "Тихий, у моря, с видом на закат?", font: "font-sans" },
  { text: "Чтобы принимали с собакой?", font: "font-mono" },
  { text: "Или лофт для работы на неделю?", font: "font-serif" },
];

function useTypewriter() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [len, setLen] = useState(0);
  const [phase, setPhase] = useState<"type" | "hold" | "erase">("type");

  useEffect(() => {
    const text = PHRASES[phraseIdx]!.text;
    let t: ReturnType<typeof setTimeout>;
    if (phase === "type") {
      if (len < text.length) t = setTimeout(() => setLen((v) => v + 1), 55);
      else t = setTimeout(() => setPhase("hold"), 0);
    } else if (phase === "hold") {
      t = setTimeout(() => setPhase("erase"), 1700);
    } else {
      if (len > 0) t = setTimeout(() => setLen((v) => v - 1), 26);
      else {
        t = setTimeout(() => {
          setPhraseIdx((v) => (v + 1) % PHRASES.length);
          setPhase("type");
        }, 350);
      }
    }
    return () => clearTimeout(t);
  }, [phraseIdx, len, phase]);

  return { shown: PHRASES[phraseIdx]!.text.slice(0, len), font: PHRASES[phraseIdx]!.font };
}

function useNickname() {
  const [nick, setNick] = useState<string | null>(null);
  useEffect(() => {
    const saved = window.localStorage.getItem(NICK_KEY);
    if (saved) {
      setNick(saved);
      return;
    }
    const fresh = pickNick();
    window.localStorage.setItem(NICK_KEY, fresh);
    setNick(fresh);
  }, []);
  return nick;
}

export function Greeting() {
  const nick = useNickname();
  const { shown, font } = useTypewriter();

  return (
    <div className="flex min-h-[10.5rem] flex-col items-center justify-center gap-3 sm:min-h-[12rem]">
      <p className="text-xl text-primary-foreground/85 sm:text-2xl">
        Привет, <span className="font-semibold text-sun">{nick ?? "…"}</span>!
      </p>
      <h1
        className={cn(
          "min-h-[2.6em] max-w-3xl text-center text-4xl leading-[1.15] text-primary-foreground transition-[font-family] duration-300 sm:text-6xl",
          font,
        )}
      >
        {shown}
        <span className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.12em] animate-pulse rounded-full bg-sun align-baseline" />
      </h1>
    </div>
  );
}
