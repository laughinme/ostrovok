import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { isFinished, useAgentRun } from "@/entities/agent-run";
import { useConsoleQuery, type RegistryEntry } from "../api/console";
import { useOnboardHotel, useOnboardingSnapshot, useReserveHotels } from "../api/onboarding";
import { districts, runSeconds } from "../lib/onboarding";
import { Empty, LoadState, RunTrace } from "./common";
import { OnboardingProgress } from "./onboarding-progress";
import { OnboardingResult } from "./onboarding-result";
import "./onboarding.css";

export function NewHotel({ active }: { active: boolean }) {
  const { runId, hotelId } = useSearch({ from: "/console" });
  const navigate = useNavigate({ from: "/console" });
  const reserve = useReserveHotels(active && !runId);
  const registry = useConsoleQuery<RegistryEntry[]>("/console/registry");
  const run = useAgentRun(runId);
  const finished = isFinished(run.data);
  const snapshot = useOnboardingSnapshot(hotelId, run.data);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!runId || finished) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [runId, finished]);
  const start = useOnboardHotel((result) => {
    void navigate({ search: (previous) => ({ ...previous, section: "onboarding", ...result }) });
  });
  const seconds = Math.round(runSeconds(run.data, now));
  const hotel = snapshot.data?.hotel;
  const refresh = () => {
    void run.refetch();
    void snapshot.refetch();
  };
  return (
    <>
      <div className="console-section-heading">
        <div>
          <h2>Новый отель</h2>
          <p>Добавьте отель - агенты соберут знания, отельер уточнит остальное.</p>
        </div>
        {runId && finished && (
          <button
            className="console-button secondary"
            onClick={() => {
              start.reset();
              void navigate({ search: { section: "onboarding" } });
            }}
          >
            Изучить другой отель
          </button>
        )}
      </div>
      {!runId ? (
        <>
          <div className="console-onboarding-intro">
            <h3 className="text-xl">От нового отеля до проверенных знаний</h3>
            <p className="mt-3 text-sm text-night-muted">
              Исследователь проверит вид, шум и дорогу по открытым данным. Связной выберет три
              вопроса о том, чего карты не знают.
            </p>
            <p className="mt-3 text-xs text-night-muted">
              Реальные отели OpenStreetMap · расчёты с доказательствами · работает без LLM
            </p>
          </div>
          <LoadState
            pending={reserve.isPending}
            error={reserve.error}
            retry={() => void reserve.refetch()}
          />
          <LoadState error={start.error} />
          {reserve.data?.length === 0 && (
            <Empty>
              Все отели резерва уже добавлены. Их исследования доступны в разделе «Агенты».
            </Empty>
          )}
          {!!reserve.data?.length && (
            <section className="console-panel overflow-hidden" aria-label="Отели из резерва OSM">
              <header className="flex items-center justify-between gap-3 border-b p-5">
                <h3 className="text-lg">Отели из резерва</h3>
                <span className="text-sm text-muted-foreground">{reserve.data.length} в OSM</span>
              </header>
              <ul className="divide-y">
                {reserve.data.map((item) => (
                  <li key={item.osmId} className="console-reserve-row">
                    <div className="min-w-0">
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {districts[item.district] ?? item.district} · этажей: {item.floors}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.location[1].toFixed(5)}° с. ш., {item.location[0].toFixed(5)}° в. д.
                      </p>
                    </div>
                    <button
                      className="console-button secondary"
                      aria-label={`Изучить «${item.name}»`}
                      disabled={start.isPending}
                      onClick={() => start.mutate(item.osmId)}
                    >
                      {start.isPending && start.variables === item.osmId ? "Запускаем…" : "Изучить"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <div className="space-y-5">
          <header className="console-onboarding-status">
            <div>
              <h3 className="text-xl">{hotel?.name ?? "Изучаем новый отель"}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {hotel?.area} {hotel ? "·" : ""} {finished ? "Исследование заняло" : "Прошло"}{" "}
                {seconds} с · {run.data?.planner === "llm" ? "LLM" : "расчёты и правила"}
              </p>
            </div>
            <button
              className="console-button secondary"
              onClick={refresh}
              disabled={run.isFetching || snapshot.isFetching}
            >
              Обновить статус
            </button>
          </header>
          <LoadState
            pending={snapshot.isPending}
            error={snapshot.error}
            retry={() => void snapshot.refetch()}
          />
          <LoadState
            pending={registry.isPending}
            error={registry.error}
            retry={() => void registry.refetch()}
          />
          {run.data?.status === "failed" && (
            <div className="console-notice" role="alert">
              Исследование завершилось ошибкой. Отель уже создан, сохранённые факты видны ниже.
              Обновите статус, чтобы проверить автоматический повтор задачи.
            </div>
          )}
          {!finished && seconds >= 120 && (
            <div className="console-notice" role="status">
              Исследование идёт дольше двух минут. Проверьте последний шаг в трассе и обновите
              статус. Повторно добавлять отель не нужно.
            </div>
          )}
          {run.data?.status === "done" && hotel && snapshot.data && registry.data && (
            <OnboardingResult
              hotel={hotel}
              facts={snapshot.data.facts}
              registry={registry.data}
              run={run.data}
            />
          )}
          <div className="console-onboarding-workspace">
            <RunTrace runId={runId} className="console-onboarding-trace console-workspace-trace" />
            <OnboardingProgress
              registry={registry.data ?? []}
              facts={snapshot.data?.facts ?? []}
              finished={finished}
            />
          </div>
        </div>
      )}
    </>
  );
}
