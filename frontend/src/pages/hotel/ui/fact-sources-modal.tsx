import { X } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import type { Fact, HotelDetails } from "../model/types";
import { WhyPanel } from "./overlays";
import "./fact-sources-modal.css";

export function FactSourcesModal({
  fact,
  hotel,
  onClose,
}: {
  fact: Fact;
  hotel: HotelDetails;
  onClose(): void;
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
      className="hotel-detail fact-sources-modal"
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
      <div className="fact-sources-content">
        <header className="fact-sources-heading">
          <h2 id={titleId}>Источники факта</h2>
          <button type="button" aria-label="Закрыть источники" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <WhyPanel fact={fact} hotel={hotel} />
      </div>
    </dialog>
  );
}
