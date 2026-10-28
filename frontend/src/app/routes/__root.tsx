import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { AppProviders } from "../providers";
import appCss from "../styles/index.css?url";
import { ErrorComponent, NotFoundComponent } from "../ui/error-pages";
import { RootLayout, RootShell } from "../ui/root-layout";
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Луч — AI-поиск идеального отеля" },
      {
        name: "description",
        content: "Опишите идеальный отель своими словами — AI-агенты найдут его.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Unbounded:wght@400..800&family=Onest:wght@400..800&family=JetBrains+Mono:wght@400;600&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "128x128" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <AppProviders queryClient={queryClient}>
      <RootLayout>
        <Outlet />
      </RootLayout>
    </AppProviders>
  );
}
