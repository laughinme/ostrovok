function flightFrames(sky: HTMLElement, plane: SVGSVGElement): Keyframe[] | undefined {
  const route = Array.from(
    sky.querySelectorAll<SVGSVGElement>(
      ".home-sky-mobile-route, .home-sky-tablet-route, .home-sky-route",
    ),
  ).find((element) => getComputedStyle(element).display !== "none");
  const path = route?.querySelector<SVGPathElement>(":scope > path");
  const matrix = path?.getScreenCTM();
  if (!path || !matrix) return;

  const origin = sky.getBoundingClientRect();
  const style = getComputedStyle(plane);
  const targetX = parseFloat(style.left);
  const targetY = parseFloat(style.top);
  const restingAngle = parseFloat(style.getPropertyValue("--sky-plane-angle"));
  const total = path.getTotalLength();
  const point = (length: number) => {
    const value = path.getPointAtLength(length).matrixTransform(matrix);
    return { x: value.x - origin.x, y: value.y - origin.y };
  };
  const distance = (length: number) => {
    const value = point(length);
    return Math.hypot(value.x - targetX, value.y - targetY);
  };

  const step = total / 192;
  let nearest = 0;
  let nearestDistance = Infinity;
  for (let length = 0; length <= total; length += step) {
    const current = distance(length);
    if (current < nearestDistance) {
      nearestDistance = current;
      nearest = length;
    }
  }
  let low = Math.max(0, nearest - step);
  let high = Math.min(total, nearest + step);
  for (let index = 0; index < 18; index++) {
    const first = low + (high - low) / 3;
    const second = high - (high - low) / 3;
    if (distance(first) < distance(second)) high = second;
    else low = first;
  }
  const end = (low + high) / 2;
  let previousAngle: number | undefined;
  return Array.from({ length: 121 }, (_, index) => {
    const length = (end * index) / 120;
    const current = point(length);
    const before = point(Math.max(0, length - 1));
    const after = point(Math.min(total, length + 1));
    let angle =
      index === 120
        ? restingAngle
        : (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI;
    if (previousAngle !== undefined) {
      while (angle - previousAngle > 180) angle -= 360;
      while (angle - previousAngle < -180) angle += 360;
    }
    previousAngle = angle;
    const x = index === 120 ? 0 : current.x - targetX;
    const y = index === 120 ? 0 : current.y - targetY;
    return {
      offset: index / 120,
      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${angle}deg)`,
    };
  });
}

export function startTravelFlight(sky: HTMLElement) {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const plane = sky.querySelector<SVGSVGElement>(".home-sky-plane");
  if (!plane || reducedMotion.matches) return;
  const frames = flightFrames(sky, plane);
  if (!frames) return;

  const flight = plane.animate(frames, {
    id: "home-sky-flight",
    duration: 1000,
    delay: 120,
    easing: "cubic-bezier(0.25, 0.6, 0.3, 1)",
    fill: "backwards",
  });
  const observer = new ResizeObserver(() => {
    const updated = flightFrames(sky, plane);
    if (updated && flight.effect instanceof KeyframeEffect) flight.effect.setKeyframes(updated);
  });
  observer.observe(sky);
  flight.onfinish = () => observer.disconnect();
  const onReducedMotion = () => {
    if (reducedMotion.matches) {
      flight.cancel();
      observer.disconnect();
    }
  };
  reducedMotion.addEventListener("change", onReducedMotion);

  return () => {
    flight.cancel();
    observer.disconnect();
    reducedMotion.removeEventListener("change", onReducedMotion);
  };
}
