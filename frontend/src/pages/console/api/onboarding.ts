import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isFinished, type ApiRun } from "@/entities/agent-run";
import { demoApi } from "@/entities/session";
import { api } from "@/shared/api";
import type { Schema } from "./console";

export function useReserveHotels(enabled: boolean) {
  return useQuery({
    queryKey: ["console", "/console/hotels/reserve"],
    queryFn: () => demoApi<Schema["ReserveHotelOut"][]>("operator", "/console/hotels/reserve"),
    enabled,
    retry: false,
  });
}

export function useOnboardHotel(onStarted: (result: Schema["OnboardStarted"]) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (osmId: string) =>
      demoApi<Schema["OnboardStarted"]>("operator", "/console/hotels", "POST", { osmId }),
    retry: false,
    onSuccess: async (result) => {
      onStarted(result);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["console"] }),
        client.invalidateQueries({ queryKey: ["hotels"] }),
      ]);
    },
    onError: () => client.invalidateQueries({ queryKey: ["console", "/console/hotels/reserve"] }),
  });
}

export function useOnboardingSnapshot(hotelId: string | undefined, run: ApiRun | undefined) {
  const finished = isFinished(run);
  const client = useQueryClient();
  useEffect(() => {
    if (!hotelId || !finished) return;
    for (const key of ["hotels", "search", "console"]) {
      void client.invalidateQueries({ queryKey: [key] });
    }
  }, [hotelId, finished, client]);
  return useQuery({
    queryKey: ["onboarding", hotelId, finished ? "finished" : "live"],
    queryFn: async ({ signal }) => {
      const path = `/hotels/${encodeURIComponent(hotelId ?? "")}`;
      const [hotel, facts] = await Promise.all([
        api<Schema["HotelOut"]>(path, { signal }),
        api<Schema["FactOut"][]>(`${path}/facts`, { signal }),
      ]);
      return { hotel, facts };
    },
    enabled: !!hotelId,
    refetchInterval: finished ? false : 1500,
    retry: 1,
  });
}
