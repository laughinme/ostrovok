import { ApiError } from "@/shared/api";
import { useConsoleQuery, type Schema } from "../api/console";
import { dateTime, percent, record } from "../lib/format";
import { Empty, JsonDetails, LoadState } from "./common";

export function Quality() {
  const query = useConsoleQuery<Schema["QualityReport"]>("/console/quality");
  const report = query.data;
  const missing = query.error instanceof ApiError && query.error.status === 404;
  return (
    <>
      <div className="console-section-heading">
        <div>
          <h2>Качество</h2>
          <p>
            {report
              ? `Отчёт от ${dateTime(report.generatedAt)}`
              : "Насколько точно агенты понимают запросы и проверяют факты."}
          </p>
        </div>
        <button
          className="console-button secondary"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Обновить
        </button>
      </div>
      {missing ? (
        <Empty>Отчёт ещё не построен.</Empty>
      ) : (
        <LoadState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
      {report && (
        <div className="space-y-6">
          <div
            className="console-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Качество агентов"
          >
            <table className="console-table">
              <thead>
                <tr>
                  <th scope="col">Проверка</th>
                  <th scope="col">Правила</th>
                  <th scope="col">LLM</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Намерения · F1</th>
                  {(["rules", "llm"] as const).map((mode) => (
                    <td key={mode}>
                      {percent(record(record(report.intents[mode])["micro"])["f1"])}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Ответы отельера · точность полей</th>
                  {(["rules", "llm"] as const).map((mode) => (
                    <td key={mode}>
                      {percent(record(report.hotelierAnswers[mode])["fieldAccuracy"])}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Куратор · выбор метода</th>
                  {(["rules", "llm"] as const).map((mode) => (
                    <td key={mode}>{percent(record(report.curator[mode])["methodAccuracy"])}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Куратор · параметры</th>
                  {(["rules", "llm"] as const).map((mode) => (
                    <td key={mode}>{percent(record(report.curator[mode])["parameterAccuracy"])}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            LLM: {report.llmStatus}. «-» означает, что измерения нет.
          </p>
          <section className="console-panel p-5">
            <h3 className="text-lg">Подбор отелей</h3>
            <dl className="mt-4 flex flex-wrap gap-8">
              <div>
                <dt className="text-sm text-muted-foreground">nDCG@10</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {report.ndcg10 == null ? "-" : report.ndcg10.toFixed(3)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Доля данных от отельера</dt>
                <dd className="mt-1 text-2xl font-semibold">{percent(report.hotelierShare)}</dd>
              </div>
            </dl>
          </section>
          <section className="console-panel p-5">
            <h3 className="text-lg">Сверка с заявлениями отелей</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Совпали / проверены. Неизвестные значения не входят в знаменатель.
            </p>
            <dl className="mt-4 flex flex-wrap gap-8">
              {(
                [
                  ["views", "Вид из окна"],
                  ["beach", "Дорога до пляжа"],
                ] as const
              ).map(([key, title]) => {
                const data = record(report.officialClaims?.[key]);
                return (
                  <div key={key}>
                    <dt className="text-sm text-muted-foreground">{title}</dt>
                    <dd className="mt-1 text-2xl font-semibold">
                      {typeof data["agree"] === "number" && typeof data["checked"] === "number"
                        ? `${data["agree"]} / ${data["checked"]}`
                        : "-"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
          <JsonDetails title="Подробный отчёт и выборки" value={report} />
        </div>
      )}
    </>
  );
}
