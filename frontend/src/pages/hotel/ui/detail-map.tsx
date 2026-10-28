import type { Hotel } from "@/entities/hotel";
import { ClientOnly, LoadingSignal } from "@/shared/ui";
import { lazy, Suspense } from "react";
import type { NearbyRoute } from "../model/types";
const RouteMap = lazy(() => import("./route-map"));
export function DetailMap({ hotel, route }: { hotel: Hotel; route: NearbyRoute }) {
  return (
    <ClientOnly>
      <Suspense fallback={<LoadingSignal />}>
        <RouteMap hotel={hotel} route={route} />
      </Suspense>
    </ClientOnly>
  );
}
