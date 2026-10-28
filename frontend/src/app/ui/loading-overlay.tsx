import { getFlightDeparture } from "@/features/search-flight";
import { SearchProgress } from "@/widgets/search-progress";
import { Header } from "@/widgets/site-header";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import "./loading-overlay.css";

export function LoadingOverlay({
  active,
  title,
  query,
}: {
  active: boolean;
  title: string;
  query?: string | undefined;
}) {
  return (
    <AnimatePresence initial={false}>
      {active && <LoadingFlight key="loading" title={title} query={query} />}
    </AnimatePresence>
  );
}

function LoadingFlight({ title, query }: { title: string; query?: string | undefined }) {
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  const dialog = useRef<HTMLDivElement>(null);
  const [departure] = useState(() => (query ? getFlightDeparture(query) : undefined));
  useEffect(() => {
    const background = document.querySelector<HTMLElement>("[data-app-content]");
    const previous = document.activeElement;
    const wasInert = background?.inert ?? false;
    const overflow = document.body.style.overflow;
    if (background) background.inert = true;
    document.body.style.overflow = "hidden";
    dialog.current?.focus({ preventScroll: true });
    return () => {
      if (background) background.inert = wasInert;
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected && !previous.closest("[inert]"))
        previous.focus({ preventScroll: true });
    };
  }, []);

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    event.stopPropagation();
    const elements = Array.from(
      dialog.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex="0"]',
      ) ?? [],
    ).filter((element) => element.getClientRects().length > 0);
    const first = elements[0];
    const last = elements.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === dialog.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <motion.div
      ref={dialog}
      className="loading-overlay"
      data-loading-overlay
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.18 }}
      onKeyDownCapture={trapFocus}
    >
      <Header tone="clear" />
      <SearchProgress active={present} title={title} departure={departure} />
    </motion.div>
  );
}
