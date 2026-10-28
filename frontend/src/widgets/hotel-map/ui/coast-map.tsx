import { ClientOnly } from "@/shared/ui";
import { lazy, Suspense } from "react";
import type { CoastMapProps } from "../model/types";

const MapCanvas = lazy(() => import("./map-canvas"));

export function CoastMap(props: CoastMapProps) {
  return (
    <div
      className="relative h-full w-full touch-none overflow-hidden rounded-3xl bg-sand select-none"
      role="region"
      aria-label="Карта отелей"
    >
      <ClientOnly>
        <Suspense fallback={null}>
          <MapCanvas {...props} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
