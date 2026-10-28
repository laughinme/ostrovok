import type { Hotel } from "@/entities/hotel";
import { ClientOnly, LoadingSignal } from "@/shared/ui";
import { lazy, Suspense } from "react";
import type { RouteData } from "../model/geo";
import { RouteScheme } from "./route-scheme";
const RouteMap = lazy(() => import("./route-map"));
export function DetailMap({ hotel, route }: { hotel: Hotel; route: RouteData }) {
  if (route.geometry.coordinates.length < 2) return <RouteScheme route={route} />;
  return (
    <ClientOnly>
      <Suspense fallback={<LoadingSignal />}>
        <RouteMap hotel={hotel} route={route} />
      </Suspense>
    </ClientOnly>
  );
}
