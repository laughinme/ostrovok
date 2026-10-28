import type { FlightDeparture } from "@/features/search-flight";

type Point = { x: number; y: number };
const DURATION = 1300;

function flightFrames(scene: HTMLElement, departure: FlightDeparture | undefined) {
  const plane = scene.querySelector<HTMLElement>(".search-flight-plane")!;
  const box = scene.getBoundingClientRect();
  const style = getComputedStyle(plane);
  const size = parseFloat(style.width);
  const target = { x: parseFloat(style.left), y: parseFloat(style.top) };
  const first = departure
    ? {
        x: (departure.plane.x * box.width) / departure.viewport.width,
        y: (departure.plane.y * box.height) / departure.viewport.height,
      }
    : { x: box.width * 0.39, y: box.height * 0.12 };
  const scale = (departure?.plane.size ?? (box.width <= 720 ? 38 : 80)) / size;
  const angle = departure?.plane.angle ?? -14;
  const radians = (angle * Math.PI) / 180;
  const distance = (box.width + size - first.x) / Math.max(0.25, Math.cos(radians));
  const exit = {
    x: first.x + Math.cos(radians) * distance,
    y: first.y + Math.sin(radians) * distance,
  };
  const destination = { x: box.width + size * 0.6 + 20, y: box.height * 0.08 };
  const slope = (destination.y - target.y) / (destination.x - target.x);
  const direction = (Math.atan(slope) * 180) / Math.PI;
  const entryX = -size * 0.6 - 20;
  const entry = { x: entryX, y: target.y + (entryX - target.x) * slope };
  const frames: Keyframe[] = [];
  const add = (point: Point, offset: number, heading: number, zoom: number, opacity = 1) => {
    frames.push({
      offset,
      opacity,
      transform: `translate(calc(-50% + ${point.x - target.x}px), calc(-50% + ${point.y - target.y}px)) rotate(${heading}deg) scale(${zoom})`,
    });
  };
  if (departure) {
    add(first, 0, angle, scale);
    add(exit, 0.07, angle, scale);
    add(exit, 0.08, angle, scale, 0);
  }
  const entryOffset = departure ? 0.12 : 0;
  add(entry, entryOffset, direction, 0.28, 0);
  for (let index = 1; index <= 36; index++) {
    const progress = index / 36;
    const t = progress * (1.5 - 0.5 * progress);
    const point = {
      x: entry.x + (target.x - entry.x) * t,
      y: entry.y + (target.y - entry.y) * t,
    };
    add(
      point,
      entryOffset + progress * (0.5 - entryOffset),
      direction,
      0.28 + 0.72 * t,
      Math.min(1, progress * 8),
    );
  }
  add(destination, 1, direction, 1);
  return frames;
}

export interface SearchFlightController {
  finish: () => void;
  resume: () => void;
  stop: () => void;
}

export function startSearchFlight(
  scene: HTMLElement,
  departure: FlightDeparture | undefined,
): SearchFlightController {
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new Set<Animation>();
  const plane = scene.querySelector<HTMLElement>(".search-flight-plane")!;
  const progress = scene.querySelector<HTMLElement>(".search-flight-progress span")!;
  let planeAnimation: Animation | undefined;
  let progressAnimation: Animation | undefined;
  let finishing = false;
  let stopped = false;
  const animate = (selector: string, frames: Keyframe[], options: KeyframeAnimationOptions) => {
    const element = scene.querySelector(selector);
    if (!element) return undefined;
    const animation = element.animate(frames, { fill: "both", ...options });
    animations.add(animation);
    return animation;
  };
  const fly = (first: boolean) => {
    planeAnimation?.cancel();
    planeAnimation = animate(
      ".search-flight-plane",
      flightFrames(scene, first ? departure : undefined),
      {
        id: "search-flight-plane",
        duration: DURATION,
        easing: "linear",
        iterations: first && departure ? 1 : Infinity,
      },
    );
    if (first && departure && planeAnimation) {
      planeAnimation.onfinish = () => {
        if (!stopped && !finishing) fly(false);
      };
    }
  };
  const scan = () => {
    progressAnimation?.cancel();
    progress.style.width = "45%";
    progressAnimation = animate(
      ".search-flight-progress span",
      [{ transform: "translateX(-120%)" }, { transform: "translateX(300%)" }],
      { id: "search-flight-progress", duration: 1100, iterations: Infinity, easing: "ease-in-out" },
    );
  };
  if (!preference.matches) {
    fly(true);
    scan();
    animate(
      ".search-flight-earth",
      [
        { opacity: 0, transform: "translate(-50%, -50%) scale(.8)" },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
      ],
      { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" },
    );
    animate(
      ".search-flight-land",
      [{ transform: "translateX(0)" }, { transform: "translateX(-440px)" }],
      { id: "search-flight-earth", duration: 8000, iterations: Infinity, easing: "linear" },
    );
  }
  const finish = () => {
    if (finishing || stopped) return;
    finishing = true;
    const style = getComputedStyle(plane);
    const transform = style.transform;
    const opacity = style.opacity;
    const box = scene.getBoundingClientRect();
    const bounds = plane.getBoundingClientRect();
    const size = parseFloat(style.width);
    const matrix = new DOMMatrixReadOnly(transform);
    const direction = Math.atan2(matrix.b, matrix.a);
    const zoom = Math.hypot(matrix.a, matrix.b);
    const distance = box.width + size - (bounds.x + bounds.width / 2 - box.x);
    const target = {
      x: box.width + size,
      y: bounds.y + bounds.height / 2 - box.y + Math.tan(direction) * distance,
    };
    planeAnimation?.cancel();
    progressAnimation?.cancel();
    progress.style.width = "100%";
    if (preference.matches) return;
    planeAnimation = animate(
      ".search-flight-plane",
      [
        { transform, opacity },
        {
          transform: `translate(calc(-50% + ${target.x - parseFloat(style.left)}px), calc(-50% + ${target.y - parseFloat(style.top)}px)) rotate(${(direction * 180) / Math.PI}deg) scale(${zoom})`,
          opacity,
        },
      ],
      { id: "search-flight-exit", duration: 180, easing: "ease-in" },
    );
    progressAnimation = animate(
      ".search-flight-progress span",
      [
        { opacity: 0.5, transform: "scaleX(.7)" },
        { opacity: 1, transform: "scaleX(1)" },
      ],
      { duration: 120, easing: "ease-out" },
    );
  };
  const resume = () => {
    if (!finishing || stopped) return;
    finishing = false;
    if (!preference.matches) {
      fly(false);
      scan();
    }
  };
  const reduce = () => {
    if (preference.matches) animations.forEach((animation) => animation.cancel());
  };
  preference.addEventListener("change", reduce);
  return {
    finish,
    resume,
    stop: () => {
      stopped = true;
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", reduce);
    },
  };
}
