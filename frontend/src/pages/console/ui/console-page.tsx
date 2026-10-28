import { useState } from "react";
import {
  Activity,
  BookOpen,
  Brain,
  Building2,
  ChartNoAxesCombined,
  ListChecks,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { Runs } from "./runs";
import "./console.css";

const sections = [
  ["runs", "Агенты", Activity],
  ["learn", "Научить новому", Brain],
  ["registry", "Реестр", BookOpen],
  ["llm", "Журнал LLM", ListChecks],
  ["world", "Изменения мира", Building2],
  ["conflicts", "Конфликты", ShieldAlert],
  ["quality", "Качество", ChartNoAxesCombined],
  ["settings", "Настройки", Settings2],
] as const;

export function ConsolePage() {
  const [section, setSection] = useState<string>("runs");
  return (
    <main className="console-page mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl">Консоль знаний</h1>
          <p className="mt-3 text-muted-foreground">
            Как мы узнаём об отелях — от вопроса до проверенного факта.
          </p>
        </div>
        <span className="console-badge">Оператор · демо</span>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[208px_minmax(0,1fr)]">
        <nav aria-label="Разделы консоли" className="hidden space-y-1 lg:block">
          {sections.map(([key, title, Icon]) => (
            <button
              key={key}
              className="console-nav"
              aria-current={section === key ? "page" : undefined}
              onClick={() => setSection(key)}
            >
              <Icon size={18} aria-hidden="true" />
              {title}
            </button>
          ))}
        </nav>
        <label className="console-field lg:hidden">
          Раздел консоли
          <select value={section} onChange={(event) => setSection(event.target.value)}>
            {sections.map(([key, title]) => (
              <option key={key} value={key}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <section className="min-w-0" aria-label={sections.find(([key]) => key === section)?.[1]}>
          {section === "runs" ? <Runs /> : <p className="console-notice">Раздел готовится</p>}
        </section>
      </div>
    </main>
  );
}
