import { ArrowUpRight } from "lucide-react";
import { hotelInfoIcons } from "./hotel-info-icons";
import { useEffect, useId, useRef } from "react";
import { groupHotelInfo } from "../model/hotel-info-groups";
import { factConfidenceStars } from "../model/fact-confidence";
import type { Fact } from "../model/types";
import { FactConfidenceStars } from "./fact-confidence-stars";
import "./hotel-facts.css";

export function HotelFactItem({
  fact,
  selected,
  onFact,
  hideScope = false,
}: {
  fact: Fact;
  hideScope?: boolean;
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
        {!hideScope && <small>{fact.scopeText}</small>}
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
  const gridRef = useRef<HTMLDivElement>(null);
  const groups = groupHotelInfo(amenities, facts);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new ResizeObserver((entries) => {
      for (const { target } of entries) {
        const tile = target.parentElement;
        if (tile)
          tile.style.gridRowEnd = `span ${Math.ceil(target.getBoundingClientRect().height + 20)}`;
      }
      grid.dataset["masonry"] = "ready";
    });
    grid.querySelectorAll(".hotel-info-group").forEach((group) => observer.observe(group));
    return () => observer.disconnect();
  }, [amenities, facts]);
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
        <div ref={gridRef} className="hotel-info-groups">
          {groups.map((group) => {
            const Icon = hotelInfoIcons[group.key];
            const groupFacts = group.items.flatMap((item) =>
              item.kind === "fact" ? [item.fact] : [],
            );
            const commonScope =
              groupFacts.length > 1 &&
              groupFacts.every((fact) => fact.scopeText === groupFacts[0]!.scopeText)
                ? groupFacts[0]!.scopeText
                : null;
            return (
              <div className="hotel-info-tile" key={group.key}>
                <section className="hotel-info-group" aria-labelledby={`hotel-info-${group.key}`}>
                  <h4 id={`hotel-info-${group.key}`}>
                    <Icon size={18} aria-hidden="true" />
                    {group.label}
                  </h4>
                  {commonScope && <p className="hotel-info-group-scope">{commonScope}</p>}
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        {item.kind === "fact" ? (
                          <HotelFactItem
                            fact={item.fact}
                            selected={item.fact.id === selectedId}
                            onFact={onFact}
                            hideScope={!!commonScope}
                          />
                        ) : (
                          <span className="hotel-amenity-item">{item.label}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="hotel-facts-empty">Сведения об отеле пока не добавлены.</p>
      )}
    </section>
  );
}
