export interface FlightDeparture {
  query: string;
  createdAt: number;
  viewport: { width: number; height: number };
  plane: { x: number; y: number; size: number; angle: number };
  route: { path: string; matrix: number[] };
}

let departure: FlightDeparture | undefined;

export function rememberFlightDeparture(query: string, scene: HTMLElement | null) {
  departure = undefined;
  const plane = scene?.querySelector<SVGSVGElement>("[data-flight-plane]");
  const route = Array.from(scene?.querySelectorAll<SVGSVGElement>("[data-flight-route]") ?? [])
    .find((element) => getComputedStyle(element).display !== "none")
    ?.querySelector<SVGPathElement>(":scope > path");
  if (!plane || !route) return;
  const box = plane.getBoundingClientRect();
  const matrix = route.getScreenCTM();
  if (!matrix || box.bottom < 0 || box.top > innerHeight) return;
  const style = getComputedStyle(plane);
  const transform = new DOMMatrixReadOnly(style.transform);
  departure = {
    query,
    createdAt: performance.now(),
    viewport: { width: innerWidth, height: innerHeight },
    plane: {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      size: parseFloat(style.width),
      angle: (Math.atan2(transform.b, transform.a) * 180) / Math.PI,
    },
    route: {
      path: route.getAttribute("d") ?? "",
      matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
    },
  };
}

export function getFlightDeparture(query: string) {
  return departure?.query === query && performance.now() - departure.createdAt < 10000
    ? departure
    : undefined;
}
