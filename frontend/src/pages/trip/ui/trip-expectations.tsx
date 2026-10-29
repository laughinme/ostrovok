import { useEffect, useRef, useState } from "react";
import {
  BookmarkCheck,
  ChevronDown,
  CloudSun,
  Eye,
  Footprints,
  Info,
  MapPin,
  Moon,
  SlidersHorizontal,
} from "lucide-react";
import {
  expectationGroup,
  mergedExpectations,
  type ExpectationGroup,
  type TripDetails,
  type TripExpectationRow,
} from "../model/expectations";
import "./trip-expectations.css";

const groups = [
  { id: "quiet", label: "Тишина и отдых", Icon: Moon },
  { id: "views", label: "Вид из окна", Icon: Eye },
  { id: "route", label: "Дорога к морю", Icon: Footprints },
  { id: "nearby", label: "Рядом с отелем", Icon: MapPin },
  { id: "weather", label: "Погода и сезон", Icon: CloudSun },
  { id: "other", label: "Ещё о размещении", Icon: SlidersHorizontal },
] as const;

function FactGroups({
  items,
  filter,
}: {
  items: TripExpectationRow[];
  filter: ExpectationGroup | "all";
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new ResizeObserver((entries) => {
      for (const { target } of entries) {
        const tile = target.parentElement;
        if (tile)
          tile.style.gridRowEnd = `span ${Math.ceil(target.getBoundingClientRect().height + 14)}`;
      }
      grid.dataset["masonry"] = "ready";
    });
    grid.querySelectorAll(".expectation-group").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items, filter]);
  return (
    <div ref={gridRef} className="expectation-groups" data-filtered={filter !== "all"}>
      {groups.map(({ id, label, Icon }) => {
        const facts = items.filter((item) => expectationGroup(item.characteristic) === id);
        if (!facts.length || (filter !== "all" && filter !== id)) return null;
        const commonScope = facts.every((fact) => fact.scope === facts[0]!.scope)
          ? facts[0]!.scope
          : null;
        return (
          <div className="expectation-tile" key={id}>
            <section className="expectation-group" data-topic={id} aria-label={label}>
              <h4>
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
                <small>{facts.length}</small>
              </h4>
              {commonScope && <p className="expectation-group-scope">{commonScope}</p>}
              <ul>
                {facts.map((fact) => (
                  <li key={fact.id}>
                    <details className="expectation-fact">
                      <summary>
                        <span>
                          <span className="expectation-statement">{fact.statement}</span>
                          {!commonScope && <span className="expectation-scope">{fact.scope}</span>}
                          {fact.changed ? (
                            <span className="expectation-status">
                              Изменилось после бронирования
                            </span>
                          ) : !fact.latest ? (
                            <span className="expectation-scope">Сохранено при бронировании</span>
                          ) : !fact.booked ? (
                            <span className="expectation-scope">Сведения об отеле</span>
                          ) : null}
                          {fact.status && fact.status !== "ok" && (
                            <span className="expectation-status">
                              {fact.status === "conflict"
                                ? "Есть противоречие"
                                : "Нужно перепроверить"}
                            </span>
                          )}
                        </span>
                        <ChevronDown size={16} aria-hidden="true" />
                      </summary>
                      <div className="expectation-evidence">
                        {fact.changed && fact.booked && (
                          <div className="expectation-booked">
                            <b>При бронировании</b>
                            <p>{fact.booked.statement}</p>
                          </div>
                        )}
                        {fact.source ? (
                          <p className="expectation-source">
                            {fact.source}
                            {fact.checkedAt && ` · ${fact.checkedAt}`}
                          </p>
                        ) : (
                          <p className="expectation-source">
                            {fact.latest
                              ? "Источник пока не указан."
                              : "Сохранено в вашей брони. Свежих сведений пока нет."}
                          </p>
                        )}
                        {fact.latest && fact.latest.scope !== fact.scope && (
                          <p className="expectation-scope">
                            Область источника: {fact.latest.scope}
                          </p>
                        )}
                        {fact.caveats.length > 0 && (
                          <div className="expectation-notes">
                            {fact.caveats.map((note, index) => (
                              <p key={index}>{note}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        );
      })}
    </div>
  );
}

export function TripExpectations({
  data,
  roomNames,
}: {
  data: Pick<TripDetails, "promised" | "facts" | "caveats">;
  roomNames?: Record<string, string>;
}) {
  const [filter, setFilter] = useState<ExpectationGroup | "all">("all");
  const items = mergedExpectations(data, roomNames);
  const available = groups.filter((group) =>
    items.some((item) => expectationGroup(item.characteristic) === group.id),
  );
  return (
    <section className="trip-expectations" aria-label="Что вас ждёт в поездке">
      <header className="expectations-heading">
        <span className="expectations-bookmark">
          <BookmarkCheck size={22} aria-hidden="true" />
        </span>
        <div>
          <h3>Что вас ждёт</h3>
          <p>Все детали вашей поездки. Изменения отмечены, источники - внутри каждого факта.</p>
        </div>
      </header>
      {items.length > 0 ? (
        <>
          <div className="expectations-filters" role="group" aria-label="Темы ожиданий">
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              Все детали <span>{items.length}</span>
            </button>
            {available.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <FactGroups items={items} filter={filter} />
        </>
      ) : (
        <p className="expectations-empty">
          Сведения об отеле и сохранённые ожидания пока не появились.
        </p>
      )}
      {data.caveats.length > 0 && (
        <details className="expectations-caveats">
          <summary>
            <Info size={18} aria-hidden="true" />
            <span>
              Что важно учесть<small>О расчётах, погоде и доступности маршрутов</small>
            </span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <ul>
            {[...new Set(data.caveats)].map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
