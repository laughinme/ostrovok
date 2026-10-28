import { Star } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Fact } from "../model/types";
import { factConfidenceStars } from "../model/fact-confidence";
import "./fact-confidence-stars.css";

export function FactConfidenceStars({
  fact,
  tooltipId,
  focusable = false,
}: {
  fact: Pick<Fact, "confidence" | "status">;
  tooltipId?: string;
  focusable?: boolean;
}) {
  const generatedId = useId();
  const id = tooltipId ?? generatedId;
  const root = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const rating = factConfidenceStars(fact);
  useEffect(() => {
    const button = root.current?.closest("button");
    if (!button) return;
    const focus = () => {
      if (button.matches(":focus-visible")) setOpen(true);
    };
    const blur = () => setOpen(false);
    button.addEventListener("focus", focus);
    button.addEventListener("blur", blur);
    return () => {
      button.removeEventListener("focus", focus);
      button.removeEventListener("blur", blur);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return (
    <span
      ref={root}
      className={`fact-confidence-stars${rating.status ? " has-warning" : ""}`}
      role="img"
      aria-label={`Уверенность: ${rating.count} из 3${rating.status ? `, ${rating.status}` : ""}`}
      aria-describedby={id}
      tabIndex={focusable ? 0 : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => {
        if (focusable) setOpen(true);
      }}
      onBlur={() => setOpen(false)}
    >
      {[1, 2, 3].map((value) => (
        <Star
          key={value}
          size={13}
          strokeWidth={1.6}
          aria-hidden="true"
          className={value <= rating.count ? "is-filled" : ""}
        />
      ))}
      <span className="fact-confidence-tooltip" id={id} role="tooltip" hidden={!open}>
        {rating.tooltip}
      </span>
    </span>
  );
}
