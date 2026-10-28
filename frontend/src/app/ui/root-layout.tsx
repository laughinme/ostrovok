import { Toaster } from "@/shared/ui";
import { SessionDialog } from "@/features/authenticate";
import { getApiMode } from "@/shared/api";
import { Header } from "@/widgets/site-header";
import { HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LoadingOverlay } from "./loading-overlay";
import { useLoadingActivity } from "./use-loading-activity";
export function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
export function RootLayout({ children }: { children: ReactNode }) {
  const catalogPage = useRouterState({
    select: (state) =>
      ["/results", "/compare", "/favorites", "/trips"].includes(state.location.pathname) ||
      state.location.pathname.startsWith("/hotel/") ||
      state.location.pathname.startsWith("/trips/"),
  });
  const loading = useLoadingActivity();
  const surface = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === "/")
        ? "landing"
        : state.matches.some((match) => match.routeId === "/search")
          ? "search"
          : state.matches.some((match) => match.routeId === "/compare")
            ? "compare"
            : "app",
  });
  return (
    <>
      <div
        data-app-content
        data-surface={surface}
        className="relative isolate"
        aria-busy={loading.active}
      >
        {surface !== "landing" && <Header tone={surface === "search" ? "clear" : "lime"} />}
        {catalogPage && getApiMode() === "demo" && (
          <p
            className="mx-auto max-w-7xl px-4 pt-4 text-xs text-muted-foreground sm:px-6"
            role="note"
          >
            Демо: все данные и действия локальные, запросы в сервис и отели не отправляются.
          </p>
        )}
        {children}
        <Toaster />
      </div>
      <LoadingOverlay {...loading} />
      <SessionDialog />
    </>
  );
}
