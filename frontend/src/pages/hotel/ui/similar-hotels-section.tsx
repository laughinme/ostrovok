import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Footprints, Moon, Wallet } from "lucide-react";
import type { Hotel } from "@/entities/hotel";
import {
  IMPROVEMENTS,
  similarQuery,
  sharedReasons,
  type Improvement,
  type SimilarMatch,
} from "@/features/similar-hotels";
import { SimilarFact } from "./similar-fact";
import { rub } from "../lib/format";
import "./similar-hotels-section.css";

const ICONS = { quieter: Moon, closer_to_beach: Footprints, cheaper: Wallet };

export function SimilarHotelsSection({
  hotel,
  query,
}: {
  hotel: Hotel;
  query?: string | undefined;
}) {
  const [change, setChange] = useState<Improvement | null>(null);
  const result = useQuery(similarQuery(hotel, change));
  return (
    <>
      <section className="hotel-similar" id="similar" aria-labelledby="similar-heading">
        <header>
          <h2 id="similar-heading">Найти похожий, но…</h2>
          <p>
            Что хочется изменить в «{hotel.name}»?
            {hotel.searchContext && " Учтём ваши пожелания, даты, гостей и бюджет из поиска."}
          </p>
        </header>
        <div className="similar-modifiers" role="group" aria-label="Что улучшить в похожем отеле">
          {IMPROVEMENTS.map(({ value, label }) => {
            const Icon = ICONS[value];
            return (
              <button
                type="button"
                key={value}
                aria-pressed={change === value}
                aria-controls="similar-results"
                onClick={() => setChange(value)}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
        <p className="similar-hint">
          {change
            ? "Похожие варианты — ниже. Можно выбрать другое пожелание."
            : "Выберите, что улучшить. Сравним по фактам об отелях и номерах."}
        </p>
      </section>
      <section
        id="similar-results"
        className="hotel-similar-results"
        aria-labelledby="similar-results-heading"
        aria-live="polite"
        aria-busy={result.isFetching}
        hidden={!change}
      >
        <h2 id="similar-results-heading">Похожие отели</h2>
        {change && result.isPending && !result.isError && (
          <p className="similar-state" role="status">
            Ищем похожие отели с выбранным улучшением…
          </p>
        )}
        {result.isError && (
          <div className="similar-state" role="alert">
            <p>Не получилось загрузить похожие отели. Попробуйте ещё раз.</p>
            <button type="button" onClick={() => void result.refetch()}>
              Повторить поиск
            </button>
          </div>
        )}
        {result.data && change && (
          <>
            {result.data.caveats.map((caveat) => (
              <p className="similar-hint" key={caveat}>
                {caveat}
              </p>
            ))}
            <SimilarResults
              key={change}
              matches={result.data.matches}
              hotel={hotel}
              change={change}
              query={query}
            />
          </>
        )}
      </section>
    </>
  );
}

function SimilarResults({
  matches,
  hotel,
  change,
  query,
}: {
  matches: SimilarMatch[];
  hotel: Hotel;
  change: Improvement;
  query: string | undefined;
}) {
  const [count, setCount] = useState(3);
  if (!matches.length)
    return (
      <div className="similar-state">
        <p>Пока не нашли отель с подтверждённым улучшением на этих условиях.</p>
        <p>
          Попробуйте другой вариант выше или вернитесь к поиску, чтобы изменить бюджет и пожелания.
        </p>
        <Link to="/results" search={{ q: query }}>
          Вернуться к подбору <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    );
  return (
    <>
      <p className="similar-hint">Вариантов: {matches.length}. Сходство и компромиссы — ниже.</p>
      <ul className="similar-list">
        {matches.slice(0, count).map((match) => {
          const improvement = match.perChip.find((item) => item.chipId === "improve");
          const shared = sharedReasons(match);
          const price = match.recommendation?.priceDemo ?? match.priceFromDemo;
          return (
            <li key={match.hotelId}>
              <div className="similar-result-heading">
                <div>
                  <Link
                    to="/hotel/$id"
                    params={{ id: match.hotelId }}
                    search={{ q: query, sid: hotel.searchContext?.id }}
                  >
                    {match.name} <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                  <p>
                    {match.area} · {Math.round(match.score * 100)}% совпадение с новым запросом
                  </p>
                </div>
                {price != null && (
                  <span className="similar-price">
                    {rub(price)}
                    <small>за ночь · демо-цена</small>
                  </span>
                )}
              </div>
              <div className="similar-reasons">
                <div>
                  <h3>{IMPROVEMENTS.find((item) => item.value === change)!.explanation}</h3>
                  {improvement ? (
                    <SimilarFact result={improvement} />
                  ) : (
                    <p>Сравниваем демонстрационные цены подобранных номеров.</p>
                  )}
                  {change === "quieter" && improvement?.probability != null && (
                    <p className="similar-probability">
                      Вероятность тихой ночи: {Math.round(improvement.probability * 100)}%
                    </p>
                  )}
                </div>
                <div>
                  <h3>Что похожего</h3>
                  {shared.length ? (
                    shared.map((reason) => <SimilarFact key={reason.chipId} result={reason} />)
                  ) : (
                    <p>
                      Общих подтверждённых черт пока не нашли. Сравните остальные условия перед
                      выбором.
                    </p>
                  )}
                </div>
              </div>
              {match.recommendation && (
                <p className="similar-scope">
                  Подобранный номер:{" "}
                  {match.recommendation.roomName ? `${match.recommendation.roomName} · ` : ""}
                  {match.recommendation.scopeText}
                </p>
              )}
              {match.tradeoff && (
                <p className="similar-tradeoff">
                  Учтите: {match.tradeoff.replace(/^[✓⚠✗?]\s*/, "")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {count < matches.length && (
        <button
          type="button"
          className="similar-more"
          onClick={() => setCount((value) => value + 3)}
        >
          Показать ещё варианты
        </button>
      )}
    </>
  );
}
