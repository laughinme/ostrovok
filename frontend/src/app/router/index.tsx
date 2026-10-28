import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../../../.tanstack/route-tree.gen";
import { registerDemoTransport } from "@/shared/api";
import { handleDemoRequest } from "../demo";
import { LoadingSignal } from "@/shared/ui";
import { createAppQueryClient } from "../providers/query-client";
export function getRouter() {
  registerDemoTransport(handleDemoRequest);
  return createRouter({
    routeTree,
    context: { queryClient: createAppQueryClient() },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 120,
    defaultPendingMinMs: 0,
    defaultPendingComponent: LoadingSignal,
  });
}
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
