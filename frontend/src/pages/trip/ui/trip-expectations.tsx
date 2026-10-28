import { useState } from "react";
import {
  BookmarkCheck,
  ChevronDown,
  CloudSun,
  Eye,
  Footprints,
  Info,
  MapPin,
  Moon,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  currentExpectations,
  expectationGroup,
  promisedExpectations,
  type ExpectationGroup,
  type TripDetails,
  type TripExpectation,
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
  filter = "all",
}: {
  items: TripExpectation[];
  filter?: ExpectationGroup | "all";
}) {
  return (
    <div className="expectation-groups">
      {groups.map(({ id, label, Icon }) => {
        const facts = items.filter((item) => expectationGroup(item.characteristic) === id);
        if (!facts.length || (filter !== "all" && filter !== id)) return null;
        return (
          <section className="expectation-group" key={id}>
            <h4>
              <Icon size={19} />
              <span>{label}</span>
              <small>{facts.length}</small>
            </h4>
            <ul>
              {facts.map((fact) => (
                <li key={fact.id}>
                  <p>{fact.statement}</p>
                  <span className="expectation-scope">{fact.scope}</span>
                  {fact.source && (
                    <span className="expectation-source">
                      {fact.source}
                      {fact.checkedAt && ` · ${fact.checkedAt}`}
                    </span>
                  )}
                  {fact.status && fact.status !== "ok" && (
                    <b className="expectation-status">
                      {fact.status === "conflict" ? "Есть противоречие" : "Нужно перепроверить"}
                    </b>
                  )}
                  {fact.caveats.length > 0 && (
                    <div className="expectation-notes">
                      {fact.caveats.map((note, index) => (
                        <p key={index}>{note}</p>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
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
  const saved = promisedExpectations(data.promised, roomNames);
  const current = currentExpectations(data.facts);
  const available = groups.filter((group) =>
    saved.some((item) => expectationGroup(item.characteristic) === group.id),
  );
  return (
    <section className="trip-expectations" aria-label="Ожидания при бронировании">
      <header className="expectations-heading">
        <span className="expectations-bookmark">
          <BookmarkCheck size={22} />
        </span>
        <div>
          <h3>Что вас ждёт</h3>
          <p>Ожидания на момент бронирования. Ответ отеля — в вашем билете.</p>
        </div>
        <span className="expectations-snapshot">Сохранено в брони</span>
      </header>
      {saved.length > 0 ? (
        <>
          <div className="expectations-filters" role="group" aria-label="Темы ожиданий">
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              Все детали <span>{saved.length}</span>
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
          <FactGroups items={saved} filter={filter} />
        </>
      ) : (
        <p className="expectations-empty">
          В этой брони нет сохранённых ожиданий. Актуальные сведения об отеле — ниже.
        </p>
      )}
      <details className="expectations-current">
        <summary>
          <RefreshCw size={18} />
          <span>
            Что известно сейчас<small>Актуальные факты об отеле · {current.length}</small>
          </span>
          <ChevronDown size={18} />
        </summary>
        <div className="expectations-current-content">
          <p>Сведения могут обновляться. Ожидания, сохранённые при бронировании, остаются выше.</p>
          {current.length ? <FactGroups items={current} /> : <p>Новых сведений пока нет.</p>}
        </div>
      </details>
      {data.caveats.length > 0 && (
        <details className="expectations-caveats">
          <summary>
            <Info size={18} />
            <span>
              Что важно учесть<small>О расчётах, погоде и доступности маршрутов</small>
            </span>
            <ChevronDown size={18} />
          </summary>
          <ul>
            {data.caveats.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
