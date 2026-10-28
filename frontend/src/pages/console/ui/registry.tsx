import { useConsoleQuery, type RegistryEntry } from "../api/console";
import { percent } from "../lib/format";
import { Empty, LoadState } from "./common";

const statuses = { published: "Опубликовано", provisional: "На проверке", draft: "Черновик" };

export function Registry() {
  const query = useConsoleQuery<RegistryEntry[]>("/console/registry", 10000);
  return (
    <>
      <div className="console-section-heading">
        <div>
          <h2>Реестр</h2>
          <p>Что умеем проверять и насколько свежи знания.</p>
        </div>
        <button
          className="console-button secondary"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Обновить
        </button>
      </div>
      <LoadState pending={query.isPending} error={query.error} retry={() => void query.refetch()} />
      {query.data?.length === 0 && <Empty>Характеристик пока нет.</Empty>}
      {!!query.data?.length && (
        <div
          className="console-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Реестр характеристик"
        >
          <table className="console-table">
            <thead>
              <tr>
                {["Характеристика", "Метод", "Статус", "Покрытие", "Уверенность", "Свежесть"].map(
                  (label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {query.data.map((entry) => (
                <tr key={entry.key}>
                  <td className="min-w-52">
                    <strong>{entry.title}</strong>
                    <p className="mt-1 text-xs text-muted-foreground">{entry.how}</p>
                  </td>
                  <td>
                    <code className="text-xs">{entry.method}</code>
                  </td>
                  <td>{statuses[entry.status]}</td>
                  <td>{percent(entry.coverage)}</td>
                  <td>{percent(entry.avgConfidence)}</td>
                  <td className="min-w-36">
                    {percent(entry.staleShare)} устарело
                    <p className="mt-1 text-xs text-muted-foreground">Срок: {entry.ttlDays} дн.</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
