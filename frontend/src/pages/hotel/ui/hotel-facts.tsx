import {
  AirVent,
  ArrowUpRight,
  Baby,
  Building2,
  CookingPot,
  FileSearch,
  Laptop,
  MapPin,
  Moon,
  ShowerHead,
  Sun,
  Utensils,
} from "lucide-react";
import { useId } from "react";
import { groupHotelInfo, type HotelInfoGroupKey } from "../model/hotel-info-groups";
import { factConfidenceStars } from "../model/fact-confidence";
import type { Fact } from "../model/types";
import { FactConfidenceStars } from "./fact-confidence-stars";
import "./hotel-facts.css";

const icons = {
  view: Sun,
  quiet: Moon,
  nearby: MapPin,
  work: Laptop,
  family: Baby,
  food: Utensils,
  room: AirVent,
  bathroom: ShowerHead,
  kitchen: CookingPot,
  general: Building2,
  other: FileSearch,
} satisfies Record<HotelInfoGroupKey, unknown>;
function FactItem({
  fact,
  selected,
  onFact,
}: {
  fact: Fact;
  selected: boolean;
  onFact(fact: Fact): void;
}) {
  const tooltipId = useId();
  const rating = factConfidenceStars(fact);
  return (
    <button
      type="button"
      className={`hotel-fact-item${selected ? " is-selected" : ""}`}
      onClick={() => onFact(fact)}
      aria-haspopup="dialog"
      aria-describedby={tooltipId}
    >
      <span className="hotel-fact-item-copy">
        <b>{fact.statement}</b>
        <small>{fact.scopeText}</small>
        {rating.status && <span className="hotel-fact-status">{rating.status}</span>}
      </span>
      <FactConfidenceStars fact={fact} tooltipId={tooltipId} />
      <ArrowUpRight className="hotel-fact-open" size={13} aria-hidden="true" />
    </button>
  );
}
export function HotelFacts({
  facts,
  selectedId,
  onFact,
  demo = false,
  embedded = false,
  amenities = [],
}: {
  facts: Fact[];
  selectedId?: string | undefined;
  onFact(fact: Fact): void;
  demo?: boolean;
  embedded?: boolean;
  amenities?: string[];
}) {
  const groups = groupHotelInfo(amenities, facts);
  const allDemo =
    facts.length > 0 && (demo || facts.every((fact) => fact.isDemo || fact.source === "demo_card"));
  const count = facts.length;
  const noun =
    count % 100 >= 11 && count % 100 <= 14
      ? "фактов"
      : count % 10 === 1
        ? "факт"
        : count % 10 >= 2 && count % 10 <= 4
          ? "факта"
          : "фактов";
  const Heading = embedded ? "h3" : "h2";
  return (
    <section
      className={`hotel-facts${embedded ? " hotel-facts--embedded" : ""}`}
      id="hotel-facts"
      aria-labelledby="hotel-facts-title"
    >
      <header className="hotel-facts-heading">
        <Heading id="hotel-facts-title">
          {embedded ? "Удобства и условия" : "Факты об отеле"}
        </Heading>
        <div className="hotel-facts-heading-meta">
          <span>
            {count} {noun}
          </span>
          {allDemo && <span className="hotel-facts-demo">Демо-данные</span>}
        </div>
      </header>
      {groups.length ? (
        <div className="hotel-info-groups">
          {groups.map((group) => {
            const Icon = icons[group.key];
            return (
              <section
                key={group.key}
                className="hotel-info-group"
                aria-labelledby={`hotel-info-${group.key}`}
              >
                <h4 id={`hotel-info-${group.key}`}>
                  <Icon size={18} aria-hidden="true" />
                  {group.label}
                </h4>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.id}>
                      {item.kind === "fact" ? (
                        <FactItem
                          fact={item.fact}
                          selected={item.fact.id === selectedId}
                          onFact={onFact}
                        />
                      ) : (
                        <span className="hotel-amenity-item">{item.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="hotel-facts-empty">Сведения об отеле пока не добавлены.</p>
      )}
    </section>
  );
}
