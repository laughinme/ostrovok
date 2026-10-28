import { ArrowRight, Check, Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Hotel } from "@/entities/hotel";
import { Reveal } from "@/shared/ui";
import type { Fact, HotelDetails } from "../model/types";
import { selectHotelHighlights } from "../model/hotel-highlights";
import { groupHotelInfo } from "../model/hotel-info-groups";
import { hotelInfoIcons } from "./hotel-info-icons";
import { HotelFacts, HotelFactItem } from "./hotel-facts";
import "./hotel-about.css";

function HotelInfoModal({
  name,
  onClose,
  children,
}: {
  name: string;
  onClose(): void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const elements = Array.from(
      dialog.current?.querySelectorAll<HTMLElement>(
        "button,a[href],input,textarea,select,[tabindex]",
      ) ?? [],
    ).filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(":disabled") &&
        element.getClientRects().length > 0,
    );
    const first = elements[0],
      last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  return (
    <dialog
      ref={dialog}
      className="hotel-detail hotel-info-modal"
      aria-labelledby={titleId}
      onKeyDownCapture={trapFocus}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="hotel-info-modal-content">
        <header className="hotel-info-modal-heading">
          <div>
            <h2 id={titleId}>Об отеле</h2>
            <p>{name}</p>
          </div>
          <button type="button" aria-label="Закрыть сведения об отеле" onClick={onClose}>
            <X size={21} aria-hidden="true" />
          </button>
        </header>
        <div className="hotel-info-modal-body">{children}</div>
      </div>
    </dialog>
  );
}

function Tradeoff({ text }: { text: string | null | undefined }) {
  return text ? (
    <div className="hotel-tradeoff">
      <Info size={17} aria-hidden="true" />
      <p>
        <b>Стоит учесть</b>
        {text}
      </p>
    </div>
  ) : null;
}

export function HotelAbout({
  hotel,
  details: h,
  selectedId,
  onFact,
  demo = false,
}: {
  hotel: Hotel;
  details: HotelDetails;
  selectedId?: string | undefined;
  onFact(fact: Fact): void;
  demo?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const description = hotel.description || h.tagline;
  const tradeoff = demo ? null : hotel.searchMatch?.tradeoff;
  const preferred =
    hotel.searchMatch?.perChip.flatMap((chip) => (chip.factId ? [chip.factId] : [])) ?? [];
  const highlights = selectHotelHighlights(h.facts, preferred);
  const topics = groupHotelInfo([], highlights);
  return (
    <>
      <Reveal
        className={`hotel-about hotel-about--with-facts hotel-about--summary${demo ? " hotel-about--demo" : ""}`}
        delay={0.1}
      >
        <section id="hotel-about" className="hotel-about-copy">
          <div className="hotel-about-summary-heading">
            <h2 id="hotel-about-title">Об отеле</h2>
            <button
              aria-label="Подробнее об отеле"
              className="hotel-about-more"
              type="button"
              aria-haspopup="dialog"
              onClick={() => setExpanded(true)}
            >
              Подробнее
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
          <p>{description}</p>
        </section>
        {highlights.length > 0 && (
          <div className="hotel-about-highlights" aria-label="Главное об отеле">
            {highlights.map((fact) => {
              const topic = topics.find((group) =>
                group.items.some((item) => item.id === fact.id),
              )!;
              const Icon = hotelInfoIcons[topic.key];
              return (
                <div className="hotel-about-highlight" key={fact.id}>
                  <h3>
                    <Icon size={18} aria-hidden="true" />
                    {topic.label}
                  </h3>
                  <HotelFactItem fact={fact} selected={fact.id === selectedId} onFact={onFact} />
                </div>
              );
            })}
          </div>
        )}
        {h.amenities.length > 0 && (
          <div className="hotel-about-summary-amenities">
            <ul aria-label="Основные удобства">
              {h.amenities.slice(0, 5).map((item, index) => (
                <li key={`${item}-${index}`}>
                  <Check size={15} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            {h.amenities.length > 5 && (
              <button type="button" onClick={() => setExpanded(true)} aria-haspopup="dialog">
                Все удобства
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <Tradeoff text={tradeoff} />
      </Reveal>
      {expanded && (
        <HotelInfoModal name={h.name} onClose={() => setExpanded(false)}>
          {description && <p className="hotel-info-description">{description}</p>}
          <HotelFacts
            facts={h.facts}
            amenities={h.amenities}
            selectedId={selectedId}
            onFact={onFact}
            demo={demo}
            embedded
          />
          <Tradeoff text={tradeoff} />
        </HotelInfoModal>
      )}
    </>
  );
}
