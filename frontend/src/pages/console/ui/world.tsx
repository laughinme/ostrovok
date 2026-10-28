import { useEffect, useState } from "react";
import { isFinished, useAgentRun } from "@/entities/agent-run";
import { demoApi } from "@/entities/session";
import { useConsoleAction, useConsoleQuery, type Schema } from "../api/console";
import { dateTime, nearbyBuilding } from "../lib/format";
import { Empty, LoadState, RunTrace } from "./common";

export function World() {
  const [hotelId, setHotelId] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const hotels = useConsoleQuery<Schema["HotelOut"][]>("/hotels");
  const changes = useConsoleQuery<Schema["WorldChangeOut"][]>("/console/changes", 5000);
  const hotel = hotels.data?.find((item) => item.id === hotelId);
  const run = useAgentRun(runId);
  const { refetch } = changes;
  useEffect(() => {
    if (isFinished(run.data)) void refetch();
  }, [run.data, refetch]);
  const build = useConsoleAction(
    (selected: Schema["HotelOut"]) =>
      demoApi<Schema["WorldChangeStarted"]>(
        "operator",
        "/console/world/buildings",
        "POST",
        nearbyBuilding(selected.location, selected.name),
      ),
    (result) => setRunId(result.runId),
  );
  const undo = useConsoleAction(
    (id: string) =>
      demoApi<Schema["RunStarted"]>(
        "operator",
        `/console/world/buildings/${encodeURIComponent(id)}`,
        "DELETE",
      ),
    (result) => setRunId(result.runId),
  );
  const busy = build.isPending || undo.isPending || (!!runId && !isFinished(run.data));
  return (
    <>
      <div className="console-section-heading">
        <div>
          <h2>Изменения мира</h2>
          <p>Наблюдатель находит затронутые отели и перепроверяет факты.</p>
        </div>
      </div>
      <form
        className="console-panel mb-5 space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (hotel && !busy) build.mutate(hotel);
        }}
      >
        <h3 className="text-lg">Построили дом</h3>
        <p className="text-sm text-muted-foreground">
          Демо-здание в 60 м к югу от отеля: 10 этажей, около 30 м высотой. Изменение можно
          отменить.
        </p>
        <LoadState
          pending={hotels.isPending}
          error={hotels.error}
          retry={() => void hotels.refetch()}
        />
        <label className="console-field">
          Отель
          <select value={hotelId} required onChange={(event) => setHotelId(event.target.value)}>
            <option value="">Выберите отель</option>
            {hotels.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {hotels.data?.length === 0 && <Empty>В каталоге пока нет отелей.</Empty>}
        <button className="console-button" disabled={!hotel || busy}>
          {build.isPending ? "Добавляем…" : "Построили дом"}
        </button>
        <LoadState error={build.error} />
      </form>
      {runId && (
        <div className="mb-6">
          <RunTrace runId={runId} />
        </div>
      )}
      <h3 className="mb-4 text-lg">Журнал изменений</h3>
      <LoadState
        pending={changes.isPending}
        error={changes.error}
        retry={() => void changes.refetch()}
      />
      <LoadState error={undo.error} />
      {changes.data?.length === 0 && <Empty>Изменений пока нет.</Empty>}
      <ul className="space-y-3">
        {changes.data?.map((change) => (
          <li key={change.id} className="console-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold">{change.title}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {dateTime(change.at)} · затронуто отелей: {change.affectedHotels.length}
                </p>
              </div>
              {change.reverted && <span className="console-badge">Отменено</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {change.runId && (
                <button
                  className="console-button secondary"
                  onClick={() => setRunId(change.runId ?? null)}
                >
                  Трасса Наблюдателя
                </button>
              )}
              {change.kind === "building_added" && !change.reverted && (
                <button
                  className="console-button secondary"
                  disabled={busy}
                  onClick={() => undo.mutate(change.id)}
                >
                  {undo.isPending && undo.variables === change.id ? "Отменяем…" : "Убрать дом"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
