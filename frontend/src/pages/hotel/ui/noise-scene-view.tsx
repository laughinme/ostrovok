import { Component, lazy, Suspense, useRef, type ReactNode } from "react";
import { ClientOnly } from "@/shared/ui";
import type { NoiseSceneProps } from "./noise-scene";
import { NoiseScenePlaceholder } from "./noise-scene-placeholder";

const Scene = lazy(() => import("./noise-scene"));

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? <NoiseScenePlaceholder /> : this.props.children;
  }
}

export function NoiseSceneView({
  ready,
  onRotate,
  ...props
}: NoiseSceneProps & { ready: boolean; onRotate(rotation: number): void }) {
  const drag = useRef<{ x: number; rotation: number; pointer: number } | null>(null);
  return (
    <div
      className="noise-scene-canvas"
      aria-label="Объёмная схема отеля. Выберите сторону кнопками рядом или поверните модель."
      onPointerDown={(event) => {
        if (!(event.target instanceof HTMLCanvasElement) || event.button !== 0) return;
        drag.current = { x: event.clientX, rotation: props.rotation, pointer: event.pointerId };
        event.target.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current || drag.current.pointer !== event.pointerId) return;
        onRotate(drag.current.rotation + (event.clientX - drag.current.x) * 0.009);
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
    >
      <SceneBoundary>
        <ClientOnly fallback={<NoiseScenePlaceholder />}>
          {ready ? (
            <Suspense fallback={<NoiseScenePlaceholder />}>
              <Scene {...props} />
            </Suspense>
          ) : (
            <NoiseScenePlaceholder />
          )}
        </ClientOnly>
      </SceneBoundary>
    </div>
  );
}
