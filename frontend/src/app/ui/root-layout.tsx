import { Toaster } from "@/shared/ui";
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
        {children}
        <Toaster />
      </div>
      <LoadingOverlay {...loading} />
    </>
  );
}
