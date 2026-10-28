import { Toaster } from "@/shared/ui";
import { Header } from "@/widgets/site-header";
import { HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
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
  const surface = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId === "/")
        ? "landing"
        : state.matches.some((match) => match.routeId === "/search")
          ? "search"
          : "app",
  });
  return (
    <>
      {surface !== "landing" && <Header tone={surface === "search" ? "clear" : "lime"} />}
      {children}
      <Toaster />
    </>
  );
}
