import { Check, CircleHelp } from "lucide-react";
import type { Schema, RegistryEntry } from "../api/console";
import { computedCharacteristics, confidenceRange } from "../lib/onboarding";
import { Empty } from "./common";

export function OnboardingProgress({
  registry,
  facts,
  finished,
}: {
  registry: RegistryEntry[];
  facts: Schema["FactOut"][];
  finished: boolean;
}) {
  const rows = computedCharacteristics(registry, facts);
  const computed = rows.filter((row) => row.facts.length > 0).length;
  return (
    <section
      className="console-panel console-onboarding-progress"
      aria-label="Прогресс по характеристикам"
    >
      <header className="p-5">
        <h3 className="text-lg">Что удалось узнать</h3>
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          Рассчитано: {computed} из {rows.length}
        </p>
        <progress
          className="mt-3 w-full"
          max={rows.length || 1}
          value={computed}
          aria-label="Рассчитанные характеристики"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {finished
            ? "Откройте строку, чтобы увидеть факты и источники."
            : "Факты появляются по мере расчёта."}
        </p>
      </header>
      <div className="console-onboarding-facts">
        {rows.length === 0 && <Empty>Реестр характеристик пока пуст.</Empty>}
        {rows.map((row) => (
          <details key={row.key} className="console-onboarding-characteristic">
            <summary>
              <span className="flex items-center gap-2">
                {row.facts.length > 0 ? (
                  <Check size={16} className="shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <CircleHelp
                    size={16}
                    className="shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 flex-1">{row.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.facts.length > 0
                    ? confidenceRange(row.facts)
                    : finished
                      ? "Не знаем"
                      : "Ожидает"}
                </span>
              </span>
            </summary>
            <div className="space-y-4 px-4 pb-4 text-xs">
              {!row.facts.length && (
                <p className="text-muted-foreground">
                  {finished
                    ? "Недостаточно данных для расчёта. Значение не подставляем."
                    : "Агент ещё не сохранил результат."}
                </p>
              )}
              {row.facts.map((fact) => (
                <article key={fact.id}>
                  <p className="font-medium">{fact.statement}</p>
                  <p className="mt-1 text-muted-foreground">
                    {fact.scopeText} · {fact.confidenceLabel} · {confidenceRange([fact])}
                  </p>
                  <p className="mt-2">{fact.sourceLabel}</p>
                  {fact.evidence.map((evidence, index) => (
                    <p key={index} className="mt-1 text-muted-foreground">
                      {evidence.summary} · {evidence.attribution}
                    </p>
                  ))}
                  {fact.caveats.map((caveat) => (
                    <p key={caveat} className="mt-1 text-muted-foreground">
                      {caveat}
                    </p>
                  ))}
                  {fact.status !== "ok" && (
                    <p className="mt-1 text-coral">
                      {fact.status === "stale" ? "Данные устарели" : "Источники расходятся"}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
