import type { Facade } from "../model/types";
import { svgElement as el } from "@/shared/lib";
type Point = [number, number];
export interface SideStyle {
  color: string;
  text: string;
}
export interface BuildingApi {
  set(sides: Partial<Record<Facade, SideStyle>>): void;
  pick(facade: Facade | null, color: string): void;
}
export const FACADE_NAME: Record<Facade, string> = { NE: "СВ", SE: "ЮВ", SW: "ЮЗ", NW: "СЗ" };
let sequence = 0;
const W = 640,
  H = 360;
const C = { x: 344, y: 176 },
  HALF_L = 104,
  HALF_W = 44,
  ROT = Math.PI / 4,
  LIFT = 62;
const rot = ([x, y]: Point): Point => [
  C.x + x * Math.cos(ROT) - y * Math.sin(ROT),
  C.y + x * Math.sin(ROT) + y * Math.cos(ROT),
];
const pts = (a: Point[]) => a.map((p) => p.join(",")).join(" ");
const base = (
  [
    [-HALF_L, -HALF_W],
    [HALF_L, -HALF_W],
    [HALF_L, HALF_W],
    [-HALF_L, HALF_W],
  ] as Point[]
).map(rot);
const up = (p: Point): Point => [p[0], p[1] - LIFT];
const SIDES: Record<Facade, [number, number, Point]> = {
  NE: [0, 1, [0, -1]],
  SE: [1, 2, [1, 0]],
  SW: [2, 3, [0, 1]],
  NW: [3, 0, [-1, 0]],
};
const NAME = FACADE_NAME;
const normal = ([x, y]: Point): Point => [
  x * Math.cos(ROT) - y * Math.sin(ROT),
  x * Math.sin(ROT) + y * Math.cos(ROT),
];
export function drawBuilding(
  svg: SVGSVGElement,
  opts: {
    name?: string;
    floors?: number;
    onPick?: (facade: Facade) => void;
  } = {},
): BuildingApi {
  const floors = opts.floors ?? 8;
  const css = getComputedStyle(svg);
  const v = (n: string) => css.getPropertyValue(n).trim();
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = "";
  const waveId = `waves-${++sequence}`;
  const defs = el("defs", {}, svg);
  const hatch = el(
    "pattern",
    { id: waveId, width: 18, height: 10, patternUnits: "userSpaceOnUse" },
    defs,
  );
  el(
    "path",
    { d: "M0 6 Q 4.5 2 9 6 T 18 6", fill: "none", stroke: "#B5C8F7", "stroke-width": 1 },
    hatch,
  );
  el("rect", { width: W, height: H, fill: v("--map-land") }, svg);
  el("path", { d: `M0 156 L 204 ${H} L 0 ${H} Z`, fill: v("--map-sea") }, svg);
  el("path", { d: `M0 156 L 204 ${H} L 0 ${H} Z`, fill: `url(#${waveId})` }, svg);
  el("path", { d: `M0 140 L 222 ${H} L 204 ${H} L 0 156 Z`, fill: "#FFFFFF" }, svg);
  el(
    "text",
    { x: 34, y: 300, "font-size": 13, fill: "#1B3FB8", "font-weight": 600, "letter-spacing": 2 },
    svg,
  ).textContent = "МОРЕ";
  const rail = `M0 96 L ${H - 96 + 0} ${H}`.replace(`${H - 96 + 0}`, "264");
  el(
    "path",
    {
      d: rail,
      stroke: v("--muted"),
      "stroke-width": 9,
      "stroke-dasharray": "1.5 7",
      fill: "none",
      opacity: ".55",
    },
    svg,
  );
  el(
    "path",
    {
      d: rail,
      stroke: v("--ink"),
      "stroke-width": 1.4,
      fill: "none",
      transform: "translate(-2.5,2.5)",
      opacity: ".75",
    },
    svg,
  );
  el(
    "path",
    {
      d: rail,
      stroke: v("--ink"),
      "stroke-width": 1.4,
      fill: "none",
      transform: "translate(2.5,-2.5)",
      opacity: ".75",
    },
    svg,
  );
  const rl = el(
    "text",
    { x: 52, y: 132, "font-size": 12, fill: v("--muted"), transform: "rotate(45 52 132)" },
    svg,
  );
  rl.textContent = "железная дорога";
  el(
    "path",
    { d: `M640 120 L 440 ${H}`, stroke: "#DCE3F5", "stroke-width": 22, fill: "none" },
    svg,
  );
  el(
    "path",
    {
      d: `M640 120 L 440 ${H}`,
      stroke: "#fff",
      "stroke-width": 1.5,
      "stroke-dasharray": "8 8",
      fill: "none",
    },
    svg,
  );
  el(
    "text",
    { x: 596, y: 196, "font-size": 12, fill: v("--muted"), transform: "rotate(-50 596 196)" },
    svg,
  ).textContent = "ул. Морская";
  el(
    "polygon",
    {
      points: pts([
        [86, 58],
        [146, 58],
        [146, 104],
        [86, 104],
      ]),
      fill: "#E2E8F7",
    },
    svg,
  );
  for (const [x, y, r] of [
    [514, 44, 13],
    [542, 66, 10],
    [496, 74, 9],
    [560, 36, 8],
    [480, 30, 7],
  ] as [number, number, number][])
    el("circle", { cx: x, cy: y, r, fill: v("--verified"), opacity: ".7" }, svg);
  el(
    "text",
    { x: 530, y: 104, "font-size": 12, fill: v("--muted"), "text-anchor": "middle" },
    svg,
  ).textContent = "двор";
  const ribbons = {} as Record<Facade, SVGLineElement>;
  const drawRibbon = (k: Facade) => {
    const [a, b, n] = SIDES[k],
      nn = normal(n),
      off = 9;
    const src = k === "NE" || k === "NW" ? base.map(up) : base;
    const p1: Point = [src[a]![0] + nn[0] * off, src[a]![1] + nn[1] * off],
      p2: Point = [src[b]![0] + nn[0] * off, src[b]![1] + nn[1] * off];
    ribbons[k] = el(
      "line",
      {
        x1: p1[0],
        y1: p1[1],
        x2: p2[0],
        y2: p2[1],
        "stroke-width": 10,
        "stroke-linecap": "round",
        stroke: v("--line"),
        class: "side",
        "data-s": k,
      },
      svg,
    );
  };
  drawRibbon("SW");
  drawRibbon("SE");
  el(
    "polygon",
    { points: pts(base.map(([x, y]) => [x + 10, y + 8])), fill: "#0B1533", opacity: ".08" },
    svg,
  );
  const faces: [Facade, number, number][] = [
    ["SW", 2, 3],
    ["SE", 1, 2],
  ];
  for (const [k, a, b] of faces) {
    el(
      "polygon",
      {
        points: pts([base[a]!, base[b]!, up(base[b]!), up(base[a]!)]),
        fill: k === "SW" ? "#E6ECFA" : "#D5DEF5",
        stroke: v("--line"),
      },
      svg,
    );
    for (let f = 1; f < floors; f++) {
      const t = f / floors;
      el(
        "line",
        {
          x1: base[a]![0],
          y1: base[a]![1] - LIFT * t,
          x2: base[b]![0],
          y2: base[b]![1] - LIFT * t,
          stroke: "#C2CDEB",
          "stroke-width": 1,
        },
        svg,
      );
    }
  }
  el("polygon", { points: pts(base.map(up)), fill: "#FFFFFF", stroke: v("--line") }, svg);
  const roofC = up([C.x, C.y]);
  el(
    "text",
    {
      x: roofC[0],
      y: roofC[1] + 5,
      "text-anchor": "middle",
      "font-size": 15,
      "font-weight": 700,
      fill: v("--ink"),
    },
    svg,
  ).textContent = opts.name || "Маяк";
  drawRibbon("NE");
  drawRibbon("NW");
  el(
    "text",
    { x: roofC[0], y: roofC[1] + 22, "text-anchor": "middle", "font-size": 12, fill: v("--muted") },
    svg,
  ).textContent = `${floors} этажей`;
  const labels = {} as Record<
    Facade,
    {
      r: SVGRectElement;
      dot: SVGCircleElement;
      t: SVGTextElement;
    }
  >;
  for (const k of Object.keys(SIDES) as Facade[]) {
    const [a, b, n] = SIDES[k],
      nn = normal(n),
      mid: Point = [(base[a]![0] + base[b]![0]) / 2, (base[a]![1] + base[b]![1]) / 2];
    const d = k === "SW" || k === "NE" ? 52 : 60,
      lift = k === "NE" || k === "NW" ? -LIFT * 0.6 : 0;
    const g = el(
      "g",
      {
        transform: `translate(${mid[0] + nn[0] * d},${mid[1] + nn[1] * d + lift})`,
        class: "side-label",
        "data-s": k,
      },
      svg,
    );
    const r = el(
      "rect",
      { x: -56, y: -14, width: 112, height: 28, rx: 14, fill: "#fff", stroke: v("--line") },
      g,
    );
    const dot = el("circle", { cx: -40, cy: 0, r: 5, fill: v("--line") }, g);
    const t = el(
      "text",
      { x: -30, y: 4.5, "font-size": 12.5, "font-weight": 600, fill: v("--ink") },
      g,
    );
    labels[k] = { r, dot, t };
  }
  const cg = el("g", { transform: "translate(604,320)" }, svg);
  el("circle", { r: 17, fill: "#fff", stroke: v("--line") }, cg);
  el("path", { d: "M0 -12 L5 4 L0 1 L-5 4 Z", fill: v("--ink") }, cg);
  el(
    "text",
    { y: -21, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: v("--ink") },
    cg,
  ).textContent = "С";
  el("line", { x1: 470, x2: 540, y1: 342, y2: 342, stroke: v("--ink"), "stroke-width": 2 }, svg);
  el(
    "text",
    { x: 505, y: 335, "text-anchor": "middle", "font-size": 12, fill: v("--muted") },
    svg,
  ).textContent = "50 м";
  if (opts.onPick) {
    for (const facade of Object.keys(SIDES) as Facade[]) {
      for (const target of [ribbons[facade], labels[facade].r.parentNode as SVGGElement]) {
        target.setAttribute("role", "button");
        target.setAttribute("tabindex", "0");
        target.setAttribute("aria-label", `Выбрать ${NAME[facade]} сторону`);
        target.style.cursor = "pointer";
        target.addEventListener("click", () => opts.onPick?.(facade));
        target.addEventListener("keydown", (event) => {
          if (event instanceof KeyboardEvent && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            opts.onPick?.(facade);
          }
        });
      }
    }
  }
  return {
    set(map) {
      for (const k of Object.keys(map) as Facade[]) {
        const side = map[k];
        if (!side) continue;
        ribbons[k].setAttribute("stroke", side.color);
        labels[k].dot.setAttribute("fill", side.color);
        labels[k].t.textContent = `${NAME[k]} · ${side.text}`;
        const w = labels[k].t.getComputedTextLength() + 44;
        labels[k].r.setAttribute("x", String(-w / 2));
        labels[k].r.setAttribute("width", String(w));
        labels[k].dot.setAttribute("cx", String(-w / 2 + 16));
        labels[k].t.setAttribute("x", String(-w / 2 + 26));
      }
    },
    pick(k, color) {
      for (const s of Object.keys(ribbons) as Facade[])
        ribbons[s].setAttribute("stroke-width", s === k ? "14" : "10");
      for (const s of Object.keys(labels) as Facade[])
        labels[s].r.setAttribute("stroke", s === k ? color : v("--line"));
    },
  };
}
