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
  add(first, 0, angle, scale);
  add(exit, 0.07, angle, scale);
  add(exit, 0.08, angle, scale, 0);
  add(entry, 0.12, direction, 0.28, 0);
  for (let index = 1; index <= 36; index++) {
    const progress = index / 36;
    const t = progress * (1.5 - 0.5 * progress);
    const point = {
      x: entry.x + (target.x - entry.x) * t,
      y: entry.y + (target.y - entry.y) * t,
    };
    add(point, 0.12 + progress * 0.38, direction, 0.28 + 0.72 * t, Math.min(1, progress * 8));
  }
  add(destination, 1, direction, 1);
  return frames;
}

export function startSearchFlight(
  scene: HTMLElement,
  departure: FlightDeparture | undefined,
  complete: () => void,
) {
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const animations: Animation[] = [];
  let finished = false;
  let timer = 0;
  const finish = () => {
    if (finished) return;
    finished = true;
    complete();
  };
  const animate = (selector: string, frames: Keyframe[], options: KeyframeAnimationOptions) => {
    const element = scene.querySelector(selector);
    if (element) animations.push(element.animate(frames, { fill: "both", ...options }));
  };
  if (!preference.matches) {
    animate(".search-flight-plane", flightFrames(scene, departure), {
      id: "search-flight-plane",
      duration: DURATION,
      easing: "linear",
    });
    animate(
      ".search-flight-copy",
      [{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1, offset: 0.35 }, { opacity: 1 }],
      { duration: DURATION },
    );
    animate(
      ".search-flight-earth",
      [
        { opacity: 0, transform: "translate(-50%, -50%) scale(.64) rotate(-10deg)" },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1) rotate(0deg)" },
      ],
      { duration: 430, delay: 70, easing: "cubic-bezier(.22,1,.36,1)" },
    );
    animate(
      ".search-flight-land",
      [{ transform: "translateX(0)" }, { transform: "translateX(-170px)" }],
      { duration: DURATION, easing: "linear" },
    );
    animate(
      ".search-flight-progress span",
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      { duration: DURATION, easing: "cubic-bezier(.2,.5,.35,1)" },
    );
  }
  timer = window.setTimeout(finish, preference.matches ? 350 : DURATION);
  const reduce = () => {
    if (!preference.matches) return;
    animations.forEach((animation) => animation.cancel());
    clearTimeout(timer);
    timer = window.setTimeout(finish, 150);
  };
  preference.addEventListener("change", reduce);
  return () => {
    finished = true;
    clearTimeout(timer);
    animations.forEach((animation) => animation.cancel());
    preference.removeEventListener("change", reduce);
  };
}
