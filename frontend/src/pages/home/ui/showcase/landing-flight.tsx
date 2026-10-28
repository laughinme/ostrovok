import { useEffect, useId, useRef } from "react";
import { TravelAirplane } from "@/shared/ui";

export function LandingFlight() {
  const wrap = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const route = useRef<SVGPathElement>(null);
  const darkClip = useRef<SVGRectElement>(null);
  const trailId = `landing-flight-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const paint = () => {
      frame = 0;
      if (!wrap.current || !plane.current || !route.current || !darkClip.current) return;
      const arrival = wrap.current
        .closest(".landing-showcase")
        ?.querySelector<HTMLElement>(".arrival-icon");
      const final = wrap.current
        .closest(".landing-showcase")
        ?.querySelector<HTMLElement>(".final-cta");
      if (!arrival || !final) return;
      const mobile = innerWidth < 720;
      const h = document.documentElement.scrollHeight;
      const w = innerWidth;
      const start =
        document.querySelector<HTMLElement>(".landing-page .band")!.offsetTop +
        document.querySelector<HTMLElement>(".landing-page .band")!.clientHeight;
      const maxScroll = Math.max(1, h - innerHeight);
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
      const p = Math.min(1, Math.max(0, (scrollY - start + cruiseY) / cruiseLength));
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
      wrap.current.style.height = `${h}px`;
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
      const points = Array.from({ length: Math.floor(cruiseProgress * 99) + 1 }, (_, i) => {
        const t = i / 99;
        return `${i ? "L" : "M"}${cruiseX(t)} ${start + t * cruiseLength}`;
      }).join(" ");
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
      const planeSize = mobile ? 46 : 92;
      const scale = 1 + (arrival.offsetWidth / planeSize - 1) * blend;
      const y = planeWorldY - scrollY;
      plane.current.style.transform = `translate3d(${planeX - planeSize / 2}px,${y - planeSize / 2}px,0) rotate(${angle}deg) scale(${scale})`;
      plane.current.style.setProperty("--flight-shadow", `${0.1 * (1 - blend)}`);
      const darkSection = wrap.current
        .closest(".landing-showcase")
        ?.querySelector(".landing-proof")
        ?.getBoundingClientRect();
      const onDark = darkSection && y > darkSection.top && y < darkSection.bottom;
      plane.current.style.color = onDark ? "#c2ec92" : "#1b4de4";
      darkClip.current.setAttribute("y", `${darkSection ? darkSection.top + scrollY : 0}`);
      darkClip.current.setAttribute("width", `${w}`);
      darkClip.current.setAttribute("height", `${darkSection?.height ?? 0}`);
      const behindCopy = Array.from(
        document.querySelectorAll(
          "h2,.hotel-copy,.proof-heading p,.scene-facts,.evidence-stage,.evidence-list",
        ),
      ).some((el) => {
        const r = el.getBoundingClientRect();
        return (
          planeX - planeSize / 2 < r.right &&
          planeX + planeSize / 2 > r.left &&
          y - planeSize / 2 < r.bottom &&
          y + planeSize / 2 > r.top
        );
      });
      const docked = landing >= 1;
      document.documentElement.dataset["flight"] = mq.matches
        ? "static"
        : docked
          ? "docked"
          : "flying";
      const cruiseOpacity = behindCopy ? 0.12 : 0.65;
      plane.current.style.opacity =
        mq.matches || docked || scrollY <= start - 220
          ? "0"
          : `${cruiseOpacity + (1 - cruiseOpacity) * blend}`;
      document.documentElement.style.setProperty("--progress", `${(100 * scrollY) / maxScroll}%`);
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const observer = new ResizeObserver(queue);
    observer.observe(document.body);
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    mq.addEventListener("change", queue);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeEventListener("scroll", queue);
      removeEventListener("resize", queue);
      mq.removeEventListener("change", queue);
      delete document.documentElement.dataset["flight"];
      document.documentElement.style.removeProperty("--progress");
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
          <path id={trailId} ref={route} />
          <use href={`#${trailId}`} stroke="var(--verified)" clipPath={`url(#${trailId}-dark)`} />
        </svg>
      </div>
      <div className="travelling-plane" ref={plane} aria-hidden="true">
        <TravelAirplane />
      </div>
      <div className="reading-progress" aria-hidden="true" />
    </>
  );
}
