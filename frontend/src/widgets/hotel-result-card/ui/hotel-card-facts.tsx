import { AlertCircle, Calculator, HelpCircle, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import type { Hotel } from "@/entities/hotel";

export function HotelCardFacts({ hotel }: { hotel: Hotel }) {
  const facts = hotel.facts.filter((fact) => fact.status !== "conflict").slice(0, 2);
  const caveat = hotel.cons[0];
  const id = useId();
  const [open, setOpen] = useState<number | null>(null);
  const selected = open === null ? undefined : facts[open];
  const showCaveat = open === facts.length && !!caveat;
  if (!facts.length && !caveat) return null;
  return (
    <div className="hotel-card-facts">
      <div className="hotel-card-facts-row" aria-label="Коротко об отеле">
        {facts.map((fact, index) => {
          const Icon =
            fact.status === "confirmed"
              ? ShieldCheck
              : fact.status === "computed"
                ? Calculator
                : HelpCircle;
          return (
            <button
              key={fact.id ?? fact.label}
              type="button"
              id={`${id}-trigger-${index}`}
              aria-expanded={open === index}
              aria-controls={`${id}-details`}
              className={`hotel-card-fact${open === index ? " is-open" : ""}`}
              onClick={() => setOpen(open === index ? null : index)}
              title={`${fact.label} · ${fact.value}`}
            >
              <Icon
                aria-hidden="true"
                size={14}
                className={fact.status === "confirmed" ? "text-conf-high" : "text-primary"}
              />
              <span>{fact.label}</span>
            </button>
          );
        })}
        {caveat && (
          <button
            type="button"
            id={`${id}-trigger-${facts.length}`}
            aria-expanded={showCaveat}
            aria-controls={`${id}-details`}
            className={`hotel-card-fact hotel-card-fact--caveat${showCaveat ? " is-open" : ""}`}
            onClick={() => setOpen(showCaveat ? null : facts.length)}
            title={caveat}
          >
            <AlertCircle size={14} aria-hidden="true" className="text-primary" />
            <span>Стоит учесть</span>
          </button>
        )}
      </div>
      {open !== null && (selected || showCaveat) && (
        <div
          className="hotel-card-fact-details"
          id={`${id}-details`}
          role="region"
          aria-labelledby={`${id}-trigger-${open}`}
        >
          {selected ? (
            <>
              <b>{selected.label}</b>
              <p>{selected.value}</p>
              <small>
                {selected.status === "confirmed"
                  ? "Подтверждено"
                  : selected.status === "computed"
                    ? "Рассчет"
                    : "Предположение"}
                {selected.source && ` · ${selected.source}`}
                {selected.checkedAt && ` · ${selected.checkedAt}`}
              </small>
              {selected.note && <small>{selected.note}</small>}
            </>
          ) : (
            <>
              <b>Стоит учесть</b>
              <p>{caveat}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
