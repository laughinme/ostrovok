import { demoApi } from "@/entities/session";
import { ApiError, type components } from "@/shared/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Schema = components["schemas"];
export type RegistryEntry = Schema["RegistryLineOut"];
export type Conflict = Schema["app__api__schemas__console__ConflictOut"];

export function useConsoleQuery<T>(path: string, interval: number | false = false) {
  return useQuery({
    queryKey: ["console", path],
    queryFn: () => demoApi<T>("operator", path),
    refetchInterval: interval,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  });
}

export function useConsoleAction<T, V>(
  action: (variables: V) => Promise<T>,
  onSuccess?: (data: T) => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (data) => {
      onSuccess?.(data);
      return client.invalidateQueries({ queryKey: ["console"] });
    },
  });
}
