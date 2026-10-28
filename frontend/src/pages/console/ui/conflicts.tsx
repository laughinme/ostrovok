import { useState } from "react";
import { demoApi } from "@/entities/session";
import { useConsoleAction, useConsoleQuery, type Conflict, type Schema } from "../api/console";
import { dateTime } from "../lib/format";
import { Empty, JsonDetails, LoadState } from "./common";

const statuses = { open: "Открыт", resolved: "Решён", waiting_hotel: "Ждём отель" };
const rules = {
  physics: "Расчёт",
  hotelier: "Ответ отельера",
  freshest: "Свежие данные",
  guests: "Отзывы гостей",
};

function ConflictRow({
  conflict,
  hotelName,
  title,
}: {
  conflict: Conflict;
  hotelName: string;
  title: string;
}) {
  const [resolution, setResolution] = useState("");
  const resolve = useConsoleAction((text: string) =>
    demoApi<Conflict>(
      "operator",
      `/console/conflicts/${encodeURIComponent(conflict.id)}/resolve`,
      "POST",
      { resolution: text } satisfies Schema["ResolveRequest"],
    ),
  );
  return (
    <li className="console-panel space-y-4 p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h3 className="break-all text-base">{title}</h3>
        <span className="console-badge">{statuses[conflict.status]}</span>
      </div>
      <p className="break-all text-xs text-muted-foreground">
        Отель: {hotelName} · {dateTime(conflict.createdAt)}
      </p>
      <p className="text-sm">
        Правило: {rules[conflict.rule]} · ячеек: {conflict.cells}
      </p>
      <JsonDetails title="Противоречащие данные" value={conflict.claims} />
      {conflict.resolution && <p className="text-sm">{conflict.resolution}</p>}
      {conflict.status !== "resolved" && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (resolution.trim().length >= 2) resolve.mutate(resolution.trim());
          }}
        >
          <label className="console-field">
            Решение
            <textarea
              rows={2}
              required
              minLength={2}
              maxLength={500}
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              placeholder="Каким данным доверяем и почему"
            />
          </label>
          <button
            className="console-button"
            disabled={resolve.isPending || resolution.trim().length < 2}
          >
            {resolve.isPending ? "Сохраняем…" : "Разрешить конфликт"}
          </button>
        </form>
      )}
      <LoadState error={resolve.error} />
      {resolve.isSuccess && (
        <p role="status" className="text-sm">
          Решение сохранено.
        </p>
      )}
    </li>
  );
}

export function Conflicts() {
  const query = useConsoleQuery<Conflict[]>("/console/conflicts", 10000);
  const hotels = useConsoleQuery<Schema["HotelOut"][]>("/hotels");
  const registry = useConsoleQuery<Schema["RegistryLineOut"][]>("/console/registry");
  return (
    <>
      <div className="console-section-heading">
        <div>
          <h2>Конфликты</h2>
          <p>Разбираем расхождения между источниками.</p>
        </div>
      </div>
      <LoadState pending={query.isPending} error={query.error} retry={() => void query.refetch()} />
      {query.data?.length === 0 && <Empty>Конфликтов пока нет.</Empty>}
      <ul className="space-y-4">
        {query.data?.map((conflict) => (
          <ConflictRow
            key={conflict.id}
            conflict={conflict}
            hotelName={
              hotels.data?.find((hotel) => hotel.id === conflict.hotelId)?.name ?? conflict.hotelId
            }
            title={
              registry.data?.find((entry) => entry.key === conflict.characteristic)?.title ??
              conflict.characteristic
            }
          />
        ))}
      </ul>
    </>
  );
}
