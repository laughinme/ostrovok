import { X } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import "./booking-modal.css";

export function BookingModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: (titleId: string) => ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const elements = Array.from(
      dialog.current?.querySelectorAll<HTMLElement>(
        "button, input, textarea, select, a[href], [tabindex]",
      ) ?? [],
    ).filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(":disabled") &&
        element.getClientRects().length > 0,
    );
    const first = elements[0];
    const last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="hotel-detail booking-modal"
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
      <div className="booking-modal-content">
        <button
          className="booking-modal-close"
          type="button"
          aria-label="Закрыть бронирование"
          onClick={onClose}
        >
          <X size={21} />
        </button>
        {children(titleId)}
      </div>
    </dialog>
  );
}
