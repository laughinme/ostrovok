import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

export function WindowMethodTooltip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div
      className="window-method"
      ref={root}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="window-method-trigger"
        aria-label="О расчёте и источниках"
        aria-describedby={open ? id : undefined}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) setOpen(true);
        }}
        onClick={() => setOpen((value) => !value)}
      >
        <Info size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="window-method-tooltip" id={id} role="tooltip">
          <strong>О расчёте и источниках</strong>
          {children}
        </div>
      )}
    </div>
  );
}
