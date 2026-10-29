import { useCompare } from "@/features/compare-hotels";
import { useSearchSession } from "@/features/hotel-search";
import { cn } from "@/shared/lib";
import { SessionControls } from "@/features/authenticate";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import "./site-header.css";

const ITEMS = [
  { to: "/results", label: "Подбор" },
  { to: "/compare", label: "Сравнение" },
  { to: "/favorites", label: "Избранное" },
  { to: "/trips", label: "Мои поездки" },
  { to: "/partner", label: "Отельерам" },
  { to: "/console", label: "Консоль" },
  { to: "/developers", label: "API и MCP" },
] as const;

export function Logo({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      to="/"
      className={cn("site-brand", className)}
      aria-label="О!кно - на главную"
      onClick={onClick}
    >
      О<b>!</b>кно
    </Link>
  );
}

export function Header({
  tone = "lime",
  embedded = false,
}: {
  tone?: "lime" | "clear" | "white" | "blue";
  embedded?: boolean;
}) {
  const ids = useCompare((state) => state.ids);
  const lastQuery = useSearchSession((state) => state.lastQuery);
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigationId = useId();
  useEffect(() => {
    void useCompare.persist.rehydrate();
  }, []);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header
      className={cn("site-header", "site-header--" + tone, embedded && "site-header--embedded")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          closeMenu();
          menuButton.current?.focus();
        }
      }}
    >
      <div className="site-header__inner">
        <Logo onClick={closeMenu} />
        <button
          ref={menuButton}
          type="button"
          className="site-header__menu"
          aria-label={menuOpen ? "Закрыть навигацию" : "Открыть навигацию"}
          aria-controls={navigationId}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        <nav
          id={navigationId}
          className={cn("site-header__nav", menuOpen && "is-open")}
          aria-label="Разделы"
        >
          {ITEMS.map((item) => {
            const active =
              path === item.to ||
              (item.to === "/trips" && path.startsWith("/trips/")) ||
              (item.to === "/results" && (path === "/search" || path.startsWith("/hotel/")));
            return (
              <Link
                key={item.to}
                to={item.to}
                search={item.to === "/results" && lastQuery ? { q: lastQuery } : {}}
                data-active={active}
                aria-current={active ? "page" : undefined}
                onClick={closeMenu}
              >
                {item.label}
                {item.to === "/compare" && ids.length > 0 && (
                  <span className="site-header__count">{ids.length}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="site-header__account">
          <SessionControls />
        </div>
      </div>
      {tone === "blue" && (
        <svg
          className="site-header__wave"
          viewBox="0 0 1440 32"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 0H1440V14C1210 36 1050 30 820 15S320 1 0 26Z" />
        </svg>
      )}
    </header>
  );
}
