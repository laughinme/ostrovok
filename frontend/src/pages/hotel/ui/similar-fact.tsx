import { useQuery } from "@tanstack/react-query";
import { factQuery } from "@/features/similar-hotels";
import type { components } from "@/shared/api";

export function SimilarFact({ result }: { result: components["schemas"]["ChipResultOut"] }) {
  const query = useQuery(factQuery(result.factId));
  const fact = query.data;
  return (
    <div className="similar-fact">
      <p>{result.line.replace(/^[✓⚠✗?]\s*/, "")}</p>
      {fact ? (
        <details>
          <summary>
            Уверенность {Math.round(fact.confidence * 100)}% · {fact.sourceLabel}
          </summary>
          <p>
            {fact.scopeText} · Проверено{" "}
            {new Date(fact.observedAt).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}
          </p>
          {fact.isDemo && <p>Демонстрационные данные</p>}
          {fact.status !== "ok" && (
            <p>Факт требует уточнения: данные устарели или противоречат друг другу.</p>
          )}
          {fact.caveats.map((text) => (
            <p key={text}>{text}</p>
          ))}
          {fact.evidence.map((evidence, index) => (
            <p key={index}>
              {evidence.summary} · {evidence.attribution}
            </p>
          ))}
        </details>
      ) : (
        <small>{query.isError ? "Источник временно недоступен" : "Загружаем источник…"}</small>
      )}
    </div>
  );
}
