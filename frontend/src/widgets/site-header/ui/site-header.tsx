import { useCompare } from "@/features/compare-hotels";
import { cn } from "@/shared/lib";
import { Link, useRouterState } from "@tanstack/react-router";
export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-sun font-display text-base font-extrabold text-primary">
        О!
      </span>
      <span className="font-display text-xl font-bold tracking-tight">Луч</span>
      <span className="hidden rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground sm:inline">
        by Островок!
      </span>
    </Link>
  );
}

export function Header() {
  const ids = useCompare((s) => s.ids);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/results", label: "Отели" },
    { to: "/compare", label: "Сравнение" },
    { to: "/partner", label: "Отельерам" },
  ] as const;
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={cn(
                "relative rounded-full px-3 py-1.5 transition-colors hover:bg-muted",
                path.startsWith(i.to) && "bg-foreground text-background hover:bg-foreground",
              )}
            >
              {i.label}
              {i.to === "/compare" && ids.length > 0 && (
                <span className="ml-1.5 rounded-full bg-coral px-1.5 font-mono text-[10px] text-primary-foreground">
                  {ids.length}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
