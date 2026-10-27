import { Toaster } from "@/shared/ui";
import { Header } from "@/widgets/site-header";
import { HeadContent, Scripts } from "@tanstack/react-router";
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
  return (
    <>
      <Header />
      {children}
      <Toaster />
    </>
  );
}
