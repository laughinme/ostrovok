import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { Box, Eye, Minus, MoveHorizontal, Plus, RotateCcw } from "lucide-react";
import { ClientOnly } from "@/shared/ui";
import { FACADE_ANGLE } from "../model/geo";
import {
  schematicContext,
  type WindowContexts,
  type WindowSceneData,
} from "../model/window-context";
import { WindowContextFallback } from "./window-context-fallback";
import "./window-context.css";

const Scene = lazy(() => import("./window-context-scene"));
class SceneBoundary extends Component<
  { children: ReactNode; onFailure(): void },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onFailure();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function WindowPanorama({
  data,
  osmId,
  mode,
  onModeChange: setMode,
  active = true,
}: {
  data: WindowSceneData;
  active?: boolean;
  osmId?: string | undefined;
  mode: "overview" | "eye";
  onModeChange(mode: "overview" | "eye"): void;
}) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => setReady(false), []);
  const reducedMotion = useReducedMotion() ?? false;
  const labelRef = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ x: number; rotation: number } | null>(null);
  const contexts = useQuery({
    queryKey: ["window-contexts", 1],
    queryFn: async ({ signal }) => {
      const response = await fetch("/data/window-contexts.json", { signal });
      if (!response.ok) throw new Error("Контуры окрестностей недоступны");
      return (await response.json()) as WindowContexts;
    },
    enabled: active && !!osmId,
    staleTime: Infinity,
    retry: 0,
  });
  const source = osmId ? contexts.data?.hotels[osmId] : undefined;
  const generated = useMemo(() => schematicContext(data), [data]);
  const context = source ?? generated;
  const cameraBearing = (FACADE_ANGLE[data.facade] * Math.PI) / 180 + rotation + Math.PI + 0.55;
  const northRotation =
    mode === "overview"
      ? (Math.atan2(Math.sin(cameraBearing), Math.cos(cameraBearing) * 0.633) * 180) / Math.PI
      : -FACADE_ANGLE[data.facade] - (rotation * 180) / Math.PI;
  const reset = () => {
    setRotation(0);
    setZoom(1);
  };
  return (
    <div className="window-context" data-mode={mode}>
      <div className="window-context-toolbar">
        <div
          className="window-context-modes"
          role="group"
          aria-label="Режим просмотра окрестностей"
        >
          <button
            type="button"
            aria-pressed={mode === "overview"}
            onClick={() => {
              setMode("overview");
              reset();
            }}
          >
            <Box size={16} />
            3D-схема
          </button>
          <button
            type="button"
            aria-pressed={mode === "eye"}
            onClick={() => {
              setMode("eye");
              reset();
            }}
          >
            <Eye size={16} />
            Из окна
          </button>
        </div>
        <button
          className="window-context-reset"
          type="button"
          aria-label="Вернуть исходный вид"
          onClick={reset}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div
        className="window-context-viewport"
        role="img"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setRotation((value) => value + ((event.key === "ArrowLeft" ? -1 : 1) * Math.PI) / 12);
          }
        }}
        aria-label={`Объёмная схема окрестностей, сторона ${data.facade}, этаж ${data.floor}`}
        data-renderer={ready ? "webgl" : "fallback"}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          drag.current = { x: event.clientX, rotation };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const delta = event.clientX - drag.current.x;
          if (Math.abs(delta) > 5) {
            if (
              event.target instanceof HTMLCanvasElement &&
              !event.target.hasPointerCapture(event.pointerId)
            )
              event.target.setPointerCapture(event.pointerId);
            setRotation(drag.current.rotation - delta * 0.008);
          }
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
        {!ready && (
          <div className="window-context-backup" style={{ transform: `scale(${zoom})` }}>
            <WindowContextFallback
              context={context}
              rotation={cameraBearing - Math.PI / 4 - 0.35}
            />
          </div>
        )}
        <div className={`window-context-webgl${ready ? " is-ready" : ""}`}>
          <SceneBoundary onFailure={onFailure}>
            <ClientOnly>
              <Suspense fallback={null}>
                {active && (
                  <Scene
                    context={context}
                    data={data}
                    mode={mode}
                    rotation={rotation}
                    zoom={zoom}
                    reducedMotion={reducedMotion}
                    onReady={onReady}
                    onUnavailable={onFailure}
                    labelRef={labelRef}
                  />
                )}
              </Suspense>
            </ClientOnly>
          </SceneBoundary>
        </div>
        {mode === "overview" && (
          <span className="window-context-origin" ref={labelRef}>
            <i />
            Ваш номер · {data.floor} этаж
          </span>
        )}
        <span
          className="window-context-compass"
          style={{ transform: `rotate(${northRotation}deg)` }}
        >
          ↑<small>С</small>
        </span>
      </div>
      <div className="window-context-bottom">
        <span>
          <MoveHorizontal size={15} />
          Потяните, чтобы осмотреть
        </span>
        <div className="window-context-zoom">
          <button
            type="button"
            aria-label="Отдалить 3D-схему"
            disabled={zoom <= 0.8}
            onClick={() => setZoom((value) => Math.max(0.8, value - 0.2))}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            aria-label="Приблизить 3D-схему"
            disabled={zoom >= 1.6}
            onClick={() => setZoom((value) => Math.min(1.6, value + 0.2))}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="window-context-legend">
        <span>
          <i />
          Ваш отель
        </span>
        <span>
          <i />
          Соседние здания
        </span>
        <small>
          {source ? "Контуры OSM · высоты и рельеф упрощены" : "Условная 3D-схема по горизонту"}
        </small>
      </div>
    </div>
  );
}
