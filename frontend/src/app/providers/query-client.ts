import { QueryClient } from "@tanstack/react-query";

export function createAppQueryClient(server = import.meta.env.SSR) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: server ? Infinity : 30 * 60 * 1000,
      },
    },
  });
}
