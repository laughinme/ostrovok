import { ClientOnly, RequestState } from "@/shared/ui";
import { getApiMode } from "@/shared/api";
import { DemoMap } from "./demo-map";
import { lazy, Suspense } from "react";
import type { CoastMapProps } from "../model/types";

const MapCanvas = lazy(() => import("./map-canvas"));

export function CoastMap(props: CoastMapProps) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-3xl bg-sand select-none ${props.scrollZoom === false ? "touch-pan-y" : "touch-none"}`}
      role="region"
      aria-label="Карта отелей"
    >
      {getApiMode() === "demo" ? (
        <DemoMap {...props} />
      ) : (
        <ClientOnly>
          <Suspense fallback={<RequestState pending />}>
            <MapCanvas {...props} />
          </Suspense>
        </ClientOnly>
      )}
    </div>
  );
}
