import { useEffect, useId, useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TravelAirplane } from "@/shared/ui";

export function LandingFlight() {
  const wrap = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const route = useRef<SVGPathElement>(null);
  const darkClip = useRef<SVGRectElement>(null);
  const routeLayer = useRef<SVGGElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const trailId = `landing-flight-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const showcase = wrap.current?.closest<HTMLElement>(".landing-showcase");
    const arrival = showcase?.querySelector<HTMLElement>(".arrival-icon");
    const final = showcase?.querySelector<HTMLElement>(".final-cta");
    const band = document.querySelector<HTMLElement>(".landing-page .band");
    const hotel = showcase?.querySelector<HTMLElement>(".hotel-stage");
    const proof = showcase?.querySelector<HTMLElement>(".landing-proof");
    if (!showcase || !arrival || !final || !band || !hotel || !proof) return;
    const copy = Array.from(
      showcase.querySelectorAll<HTMLElement>(
        "h2,.hotel-copy,.proof-heading p,.scene-facts,.evidence-stage,.evidence-list",
      ),
    );
    let frame = 0;
    const measure = () => {
      const mobile = innerWidth < 720;
      const w = innerWidth;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const start = band.offsetTop + band.clientHeight;
      const finalTop = final.getBoundingClientRect().top + scrollY;
      const target = arrival.getBoundingClientRect();
      const destination = {
        x: target.left + target.width / 2,
        y: target.top + scrollY + target.height / 2,
      };
      const dockStart = Math.max(start, finalTop - innerHeight * (mobile ? 0.46 : 0.52));
      const dockEnd = Math.max(
        dockStart + 1,
        Math.min(maxScroll - 24, finalTop - innerHeight * 0.12),
      );
      const cruiseY = Math.min(250, innerHeight * 0.34);
      const cruiseLength = dockStart + cruiseY - start;
      const cruiseX = (t: number) =>
        mobile
          ? w - 18 + Math.sin(t * Math.PI * 3) * 15
          : w * (0.5 + 0.43 * Math.cos(t * Math.PI * 3));
      const departure = { x: cruiseX(1), y: dockStart + cruiseY };
      const distance = Math.hypot(destination.x - departure.x, destination.y - departure.y);
      const approach = Math.min(mobile ? 110 : 180, distance * 0.3);
      const control1 = {
        x: departure.x,
        y: departure.y + Math.min(170, distance * 0.3),
      };
      const control2 = {
        x: destination.x - Math.cos((Math.PI * 25) / 180) * approach,
        y: destination.y + Math.sin((Math.PI * 25) / 180) * approach,
      };
      const dark = proof.getBoundingClientRect();
      const pin = ScrollTrigger.getAll().find((trigger) => trigger.trigger === hotel);
      const pinStart = pin?.start ?? 0;
      const pinLength = pin ? pin.end - pin.start : 0;
      const pinOffset = Math.min(pinLength, Math.max(0, scrollY - pinStart));
      const blockers = copy.map((el) => {
        const rect = el.getBoundingClientRect();
        const pinned = hotel.contains(el);
        const offset = scrollY - (pinned ? pinOffset : 0);
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top + offset,
          bottom: rect.bottom + offset,
          pinned,
        };
      });
      let points = "";
      const cruisePoints = Array.from({ length: 100 }, (_, i) => {
        const t = i / 99;
        points += `${i ? " L" : "M"}${cruiseX(t)} ${start + t * cruiseLength}`;
        return points;
      });
      return {
        w,
        maxScroll,
        start,
        destination,
        dockStart,
        dockEnd,
        cruiseY,
        cruiseLength,
        cruiseX,
        cruisePoints,
        departure,
        control1,
        control2,
        darkTop: dark.top + scrollY,
        darkHeight: dark.height,
        planeSize: mobile ? 46 : 92,
        arrivalWidth: arrival.offsetWidth,
        pinStart,
        pinLength,
        blockers,
      };
    };
    let layout: ReturnType<typeof measure> | undefined;
    let dirty = true;
    const paint = () => {
      frame = 0;
      if (!plane.current || !route.current || !darkClip.current || !routeLayer.current) return;
      if (mq.matches) {
        if (showcase.dataset["flight"] !== "static") showcase.dataset["flight"] = "static";
        return;
      }
      if (dirty || !layout) {
        layout = measure();
        dirty = false;
        darkClip.current.setAttribute("y", `${layout.darkTop}`);
        darkClip.current.setAttribute("width", `${layout.w}`);
        darkClip.current.setAttribute("height", `${layout.darkHeight}`);
      }
      const {
        maxScroll,
        start,
        destination,
        dockStart,
        dockEnd,
        cruiseY,
        cruiseLength,
        cruiseX,
        cruisePoints,
        departure,
        control1,
        control2,
        planeSize,
      } = layout;
      const p = Math.min(1, Math.max(0, (scrollY - start + cruiseY) / cruiseLength));
      const landing = Math.min(1, Math.max(0, (scrollY - dockStart) / (dockEnd - dockStart)));
      const blend = landing * landing * (3 - 2 * landing);
      let planeX = cruiseX(p);
      let planeWorldY = start + p * cruiseLength;
      let angle =
        (Math.atan2(cruiseLength * 0.001, cruiseX(Math.min(1, p + 0.001)) - cruiseX(p)) * 180) /
        Math.PI;
      if (landing > 0) {
        const t = blend;
        const u = 1 - t;
        planeX =
          u ** 3 * departure.x +
          3 * u ** 2 * t * control1.x +
          3 * u * t ** 2 * control2.x +
          t ** 3 * destination.x;
        planeWorldY =
          u ** 3 * departure.y +
          3 * u ** 2 * t * control1.y +
          3 * u * t ** 2 * control2.y +
          t ** 3 * destination.y;
        const dx =
          3 * u ** 2 * (control1.x - departure.x) +
          6 * u * t * (control2.x - control1.x) +
          3 * t ** 2 * (destination.x - control2.x);
        const dy =
          3 * u ** 2 * (control1.y - departure.y) +
          6 * u * t * (control2.y - control1.y) +
          3 * t ** 2 * (destination.y - control2.y);
        angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      }
      const cruiseProgress = landing > 0 ? 1 : p;
      const points = cruisePoints[Math.floor(cruiseProgress * 99)];
      if (landing > 0) {
        const t = blend;
        const u = 1 - t;
        const first = {
          x: departure.x + (control1.x - departure.x) * t,
          y: departure.y + (control1.y - departure.y) * t,
        };
        const second = {
          x: u ** 2 * departure.x + 2 * u * t * control1.x + t ** 2 * control2.x,
          y: u ** 2 * departure.y + 2 * u * t * control1.y + t ** 2 * control2.y,
        };
        route.current.setAttribute(
          "d",
          `${points} C${first.x} ${first.y} ${second.x} ${second.y} ${planeX} ${planeWorldY}`,
        );
      } else {
        route.current.setAttribute("d", `${points} L${planeX} ${planeWorldY}`);
      }
      const scale = 1 + (layout.arrivalWidth / planeSize - 1) * blend;
      const y = planeWorldY - scrollY;
      plane.current.style.transform = `translate3d(${planeX - planeSize / 2}px,${y - planeSize / 2}px,0) rotate(${angle}deg) scale(${scale})`;
      plane.current.style.setProperty("--flight-shadow", `${0.1 * (1 - blend)}`);
      const onDark =
        planeWorldY > layout.darkTop && planeWorldY < layout.darkTop + layout.darkHeight;
      plane.current.style.color = onDark ? "#c2ec92" : "#1b4de4";
      const pinOffset = Math.min(layout.pinLength, Math.max(0, scrollY - layout.pinStart));
      const behindCopy = layout.blockers.some((r) => {
        const offset = r.pinned ? pinOffset : 0;
        return (
          planeX - planeSize / 2 < r.right &&
          planeX + planeSize / 2 > r.left &&
          planeWorldY - planeSize / 2 < r.bottom + offset &&
          planeWorldY + planeSize / 2 > r.top + offset
        );
      });
      const docked = landing >= 1;
      const state = docked ? "docked" : "flying";
      if (showcase.dataset["flight"] !== state) showcase.dataset["flight"] = state;
      const cruiseOpacity = behindCopy ? 0.12 : 0.65;
      plane.current.style.opacity =
        docked || scrollY <= start - 220 ? "0" : `${cruiseOpacity + (1 - cruiseOpacity) * blend}`;
      routeLayer.current.setAttribute("transform", `translate(0 ${-scrollY})`);
      if (progress.current) progress.current.style.transform = `scaleX(${scrollY / maxScroll})`;
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const invalidate = () => {
      dirty = true;
      queue();
    };
    const observer = new ResizeObserver(invalidate);
    observer.observe(document.body);
    observer.observe(band);
    observer.observe(proof);
    observer.observe(final);
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", invalidate);
    ScrollTrigger.addEventListener("refresh", invalidate);
    mq.addEventListener("change", invalidate);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeEventListener("scroll", queue);
      removeEventListener("resize", invalidate);
      ScrollTrigger.removeEventListener("refresh", invalidate);
      mq.removeEventListener("change", invalidate);
      delete showcase.dataset["flight"];
    };
  }, []);
  return (
    <>
      <div className="flight-route" ref={wrap} aria-hidden="true">
        <svg
          width="100%"
          height="100%"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 10"
          strokeLinecap="round"
        >
          <defs>
            <clipPath id={`${trailId}-dark`} clipPathUnits="userSpaceOnUse">
              <rect ref={darkClip} x="0" y="0" width="0" height="0" />
            </clipPath>
          </defs>
          <g ref={routeLayer}>
            <path id={trailId} ref={route} />
            <use href={`#${trailId}`} stroke="var(--verified)" clipPath={`url(#${trailId}-dark)`} />
          </g>
        </svg>
      </div>
      <div className="travelling-plane" ref={plane} aria-hidden="true">
        <TravelAirplane />
      </div>
      <div className="reading-progress" ref={progress} aria-hidden="true" />
    </>
  );
}
