import { useQuery } from "@tanstack/react-query";
import type { RouteData } from "./geo";
import {
  demoTravelOption,
  fetchDrivingOption,
  fetchWalkingFallback,
  sortTravelOptions,
  type TravelOption,
} from "./travel-options";

export function useTravelOptions({
  origin,
  destination,
  name,
  walking,
  pending,
  walkError,
  demo,
  enabled,
  walkProfile = "walk",
}: {
  origin: [number, number];
  destination: [number, number] | undefined;
  name: string;
  walking: RouteData | undefined;
  pending: boolean;
  walkError: boolean;
  demo: boolean;
  enabled: boolean;
  walkProfile?: string;
}) {
  const car = useQuery({
    queryKey: ["hotel-driving", origin, destination, name],
    queryFn: ({ signal }) => fetchDrivingOption(origin, destination!, name, signal),
    enabled: enabled && !demo && !!destination,
    staleTime: 300000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const foot = useQuery({
    queryKey: ["hotel-foot-fallback", origin, destination, name],
    queryFn: ({ signal }) => fetchWalkingFallback(origin, destination!, name, signal),
    enabled: enabled && !demo && !!destination && walkError && walkProfile === "walk",
    staleTime: 300000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const walk: TravelOption =
    !walking && walkError && walkProfile === "walk" && foot.data
      ? foot.data
      : {
          mode: "walk",
          minutes: walking?.there.minutes ?? null,
          distanceM: walking?.there.lengthM ?? null,
          ...(walking ? { drawing: walking } : {}),
          pending: pending || foot.isFetching,
          error: walkError && !foot.data,
          note: walkError
            ? "Расчёт недоступен · открыть в Яндекс Картах"
            : demo
              ? "Демо · время и схема условные"
              : walking?.estimated
                ? "Оценка пешего пути"
                : "По пешеходной сети",
        };
  const drive: TravelOption =
    demo && walking
      ? demoTravelOption("car", walking)
      : (car.data ?? {
          mode: "car",
          minutes: null,
          distanceM: null,
          pending: demo ? pending : car.isFetching || (pending && !destination),
          error: !!car.error,
          note: car.error
            ? "Расчёт недоступен · открыть в Яндекс Картах"
            : "Без пробок и поиска парковки",
        });
  const transit: TravelOption =
    demo && walking
      ? demoTravelOption("transit", walking)
      : {
          mode: "transit",
          minutes: null,
          distanceM: null,
          pending: demo && pending,
          note: "Время и рейсы - в Яндекс Картах",
        };
  return { options: sortTravelOptions([walk, drive, transit]), car, foot };
}
