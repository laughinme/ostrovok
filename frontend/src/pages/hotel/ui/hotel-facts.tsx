import {
  ArrowUpRight,
  Baby,
  FileSearch,
  Footprints,
  Laptop,
  Moon,
  Mountain,
  PawPrint,
  Sun,
  Waves,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useId, useState } from "react";
import { factConfidence } from "../model/fact-confidence";
import type { Fact } from "../model/types";
import "./hotel-facts.css";

const icons = {
  night_noise: Moon,
  day_noise: Moon,
  sunset_over_sea: Sun,
  sunrise: Sun,
  sea_view: Waves,
  sea_share: Waves,
  remote_work: Laptop,
  playground_walk: Baby,
  pets_policy: PawPrint,
  mountain_view: Mountain,
  beach_walk: Footprints,
  beach_access: Footprints,
  food_late: Building2,
};

function isDemoFact(fact: Fact) {
  return fact.isDemo || fact.source === "demo_card";
}

export function HotelFacts({
  facts,
  selectedId,
  onFact,
  demo = false,
  embedded = false,
}: {
  facts: Fact[];
  selectedId?: string | undefined;
  onFact: (fact: Fact) => void;
  demo?: boolean;
  embedded?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const allDemo = facts.length > 0 && (demo || facts.every(isDemoFact));
  const count = facts.length;
  const visibleFacts = embedded && !expanded ? facts.slice(0, 4) : facts;
  const Heading = embedded ? "h3" : "h2";
  const noun =
    count % 100 >= 11 && count % 100 <= 14
      ? "фактов"
      : count % 10 === 1
        ? "факт"
        : count % 10 >= 2 && count % 10 <= 4
          ? "факта"
          : "фактов";
  return (
    <section
      className={`hotel-facts${embedded ? " hotel-facts--embedded" : ""}`}
      id="hotel-facts"
      aria-labelledby="hotel-facts-title"
    >
      <header className="hotel-facts-heading">
        <div>
          <Heading id="hotel-facts-title">{embedded ? "Что известно" : "Факты об отеле"}</Heading>
          {!embedded && <p>Условия с учётом стороны здания и этажа.</p>}
        </div>
        <div className="hotel-facts-heading-meta">
          <span>
            {count} {noun}
          </span>
          {allDemo && <span className="hotel-facts-demo">Демо-данные</span>}
        </div>
      </header>
      {count > 0 ? (
        <div className="hotel-facts-panel">
          {embedded && (
            <div className="hotel-facts-embedded-columns" aria-hidden="true">
              <span>Уверенность</span>
            </div>
          )}
          {!embedded && (
            <div className="hotel-facts-columns" aria-hidden="true">
              <span>Что известно</span>
              <span>Уверенность</span>
            </div>
          )}
          <ul className="hotel-facts-list" id={listId}>
            {visibleFacts.map((fact) => {
              const Icon = icons[fact.characteristic as keyof typeof icons] ?? FileSearch;
              const confidence = factConfidence(fact);
              const percentage = Number.isFinite(fact.confidence)
                ? Math.round(fact.confidence * 100)
                : null;
              const source = isDemoFact(fact) ? "Демо-данные" : fact.sourceLabel;
              return (
                <li key={fact.id}>
                  <button
                    type="button"
                    className={`hotel-fact-row${selectedId === fact.id ? " is-selected" : ""}`}
                    onClick={() => onFact(fact)}
                    aria-haspopup="dialog"
                  >
                    <Icon className="hotel-fact-icon" size={21} aria-hidden="true" />
                    <span className="hotel-fact-copy">
                      <b>{fact.statement}</b>
                      <span>{fact.scopeText}</span>
                    </span>
                    <span className="hotel-fact-meta">
                      <span
                        className={`hotel-fact-confidence hotel-fact-confidence--${confidence.tone}`}
                        aria-label={`Уверенность: ${confidence.label}`}
                        title={
                          percentage === null
                            ? "Уверенность не указана"
                            : `Уверенность в факте: ${percentage}%`
                        }
                      >
                        <span className="hotel-fact-confidence-label">Уверенность: </span>
                        {confidence.label}
                      </span>
                      {!allDemo && <small>{source}</small>}
                    </span>
                    <span className="hotel-fact-action">
                      Источники <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {embedded && count > 4 && (
            <button
              type="button"
              className="hotel-facts-expand"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Свернуть" : `Все ${count} ${noun}`}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <div className="hotel-facts-empty">
          <FileSearch size={24} aria-hidden="true" />
          <p>Сведения об отеле пока не добавлены.</p>
        </div>
      )}
    </section>
  );
}
