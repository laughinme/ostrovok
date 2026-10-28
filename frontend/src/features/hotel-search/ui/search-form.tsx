import { cn } from "@/shared/lib";
import { motion } from "framer-motion";
import { ArrowUpRight, Baby, Dog, Laptop, Wallet } from "lucide-react";
import { useState } from "react";
const CHIPS = [
  { icon: Dog, label: "С собакой", text: " с собакой" },
  { icon: Baby, label: "С ребёнком", text: " с ребёнком" },
  { icon: Laptop, label: "Буду работать", text: ", буду работать" },
  { icon: Wallet, label: "До 12 000 ₽", text: ", до 12 000 ₽ за ночь" },
];

export function HotelSearchForm({ onSearch }: { onSearch: (query: string) => unknown }) {
  const [q, setQ] = useState("");
  const go = (query: string) => {
    if (query.trim()) onSearch(query.trim());
  };
  return (
    <motion.form
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
      className="mt-10 w-full rounded-3xl bg-card p-3 text-left shadow-soft ring-1 ring-border"
    >
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            go(q);
          }
        }}
        rows={2}
        placeholder="Например: тихий отель с видом на закат, недалеко от моря…"
        className="w-full resize-none bg-transparent px-3 pt-2 text-lg outline-none placeholder:text-muted-foreground"
      />
      <div className="flex flex-wrap items-center gap-2 px-1 pt-2">
        {CHIPS.map((c) => (
          <button
            type="button"
            key={c.label}
            onClick={() => setQ((v) => (v || "Хочу отель") + c.text)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition hover:border-coral hover:text-coral"
          >
            <c.icon className="h-3.5 w-3.5" /> {c.label}
          </button>
        ))}
        <button
          type="submit"
          disabled={!q.trim()}
          className={cn(
            "ml-auto inline-flex items-center gap-2 rounded-2xl bg-sunset px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition",
            !q.trim() && "opacity-50",
          )}
        >
          Найти <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </motion.form>
  );
}
