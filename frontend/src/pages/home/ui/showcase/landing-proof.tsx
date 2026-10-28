import { useEffect, useRef, useState } from "react";
import { ChevronDown, Footprints, Sun, Volume2 } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BEACH_ROUTE, projectRoadPoint, SUN_ARC } from "./evidence-geometry";
import { NoiseScene, RouteScene, SunScene } from "./evidence-scenes";

const ITEMS = [
  {
    title: "Тот самый вид из окна",
    body: "Смотрим, куда выходит фасад, что перекрывает горизонт и где будет солнце в ваши даты.",
    source: "Рельеф Copernicus DEM + здания OpenStreetMap",
    icon: Sun,
  },
  {
    title: "Ночь, в которую вы выспитесь",
    body: "Учитываем дороги, железную дорогу и аэропорт рядом. Разделяем расчётную оценку и то, что нужно уточнить у отеля.",
    source: "Окружение по OpenStreetMap + уточнение у отеля",
    icon: Volume2,
  },
  {
    title: "Дорога к морю без сюрпризов",
    body: "Проверяем пешеходный маршрут: не только расстояние по прямой, но и перепад высот на пути обратно.",
    source: "Пешеходные пути OpenStreetMap + рельеф",
    icon: Footprints,
  },
];

function EvidenceGraphic({
  type,
  active,
  replay,
}: {
  type: number;
  active: boolean;
  replay: number;
}) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = svg.current;
    if (!root) return;
    if (!active) {
      root.dataset["motion"] = "inactive";
      return;
    }
    const query = <T extends SVGElement>(selector: string) => root.querySelector<T>(selector)!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: gsap.core.Timeline | undefined;
    let inView = false;
    const drawPaths = root.querySelectorAll("[data-draw]");
    const buildings = root.querySelectorAll("[data-building]");
    const waves = root.querySelectorAll("[data-sea-wave]");

    const placeSun = (progress: number) => {
      const path = query<SVGPathElement>("[data-sun-arc]");
      const point = path.getPointAtLength(path.getTotalLength() * progress);
      const sun = query<SVGCircleElement>("[data-sun]");
      const ray = query<SVGLineElement>("[data-sun-ray]");
      sun.setAttribute("cx", `${point.x}`);
      sun.setAttribute("cy", `${point.y}`);
      ray.setAttribute("x2", `${point.x}`);
      ray.setAttribute("y2", `${point.y}`);
    };
    const placeWalker = (progress: number) => {
      const path = query<SVGPathElement>("[data-beach-route]");
      const point = path.getPointAtLength(path.getTotalLength() * progress);
      query<SVGGElement>("[data-walker]").setAttribute(
        "transform",
        `translate(${point.x} ${point.y})`,
      );
    };
    const reset = () => {
      if (drawPaths.length) gsap.set(drawPaths, { strokeDashoffset: 0 });
      gsap.set(buildings, { y: 0, opacity: 1 });
      if (waves.length) gsap.set(waves, { x: 0 });
      if (type === 0) placeSun(0.7);
      if (type === 1) {
        gsap.set(root.querySelectorAll("[data-noise-wave]"), { x: 0, opacity: 0.4 });
        root.querySelectorAll("[data-car]").forEach((car, i) => {
          const point = projectRoadPoint(Number(car.getAttribute("data-road-lane")), i ? 178 : 85);
          gsap.set(car, { x: point.x, y: point.y });
        });
      }
      if (type === 2) placeWalker(0.66);
    };
    const playback = () => {
      if (!animation) return;
      const running = inView && !document.hidden;
      if (running) animation.resume();
      else animation.pause();
      root.dataset["motion"] = running ? "playing" : "paused";
    };
    const build = () => {
      animation?.kill();
      reset();
      if (media.matches) {
        animation = undefined;
        root.dataset["motion"] = "static";
        return;
      }
      animation = gsap.timeline({ paused: true });
      animation.fromTo(
        buildings,
        { y: 12, opacity: 0.4 },
        { y: 0, opacity: 1, duration: 0.85, ease: "power3.out" },
        0,
      );
      if (type === 0) {
        const phase = { value: 0 };
        placeSun(phase.value);
        animation.fromTo(
          drawPaths,
          { strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: 1.8,
            ease: "power2.out",
            autoRound: false,
          },
          0.1,
        );
        animation.to(
          phase,
          {
            value: 1,
            duration: 8.4,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            repeatDelay: 0.8,
            onUpdate: () => placeSun(phase.value),
          },
          0.2,
        );
        animation.to(
          waves,
          { x: 10, duration: 3.3, ease: "sine.inOut", repeat: -1, yoyo: true },
          0,
        );
      } else if (type === 1) {
        root.querySelectorAll("[data-noise-wave]").forEach((wave, i) => {
          animation!.fromTo(
            wave,
            { x: -7, opacity: 0 },
            {
              x: 8,
              opacity: 0.65,
              duration: 1.55,
              repeat: -1,
              repeatDelay: 0.45,
              delay: i * 0.35,
              ease: "sine.inOut",
            },
            0,
          );
        });
        root.querySelectorAll("[data-car]").forEach((car, i) => {
          const lane = Number(car.getAttribute("data-road-lane"));
          const from = projectRoadPoint(lane, i ? 210 : 60);
          const to = projectRoadPoint(lane, i ? 60 : 220);
          animation!.fromTo(
            car,
            { x: from.x, y: from.y },
            { x: to.x, y: to.y, duration: i ? 4.5 : 4, repeat: -1, repeatDelay: 0.2, ease: "none" },
            0,
          );
        });
      } else {
        const phase = { value: 0 };
        placeWalker(0);
        animation.fromTo(
          drawPaths,
          { strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: 4.2,
            ease: "sine.inOut",
            autoRound: false,
          },
          0.35,
        );
        animation.to(waves, { x: 6, duration: 2.8, ease: "sine.inOut", repeat: -1, yoyo: true }, 0);
        animation.to(
          phase,
          {
            value: 1,
            duration: 4.2,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            repeatDelay: 0.7,
            onUpdate: () => placeWalker(phase.value),
          },
          0.35,
        );
      }
      playback();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
        playback();
      },
      { threshold: 0.12 },
    );
    observer.observe(root);
    document.addEventListener("visibilitychange", playback);
    media.addEventListener("change", build);
    build();
    return () => {
      animation?.kill();
      observer.disconnect();
      document.removeEventListener("visibilitychange", playback);
      media.removeEventListener("change", build);
      root.dataset["motion"] = "paused";
    };
  }, [type, active, replay]);

  return (
    <svg
      ref={svg}
      viewBox="0 0 530 310"
      className="evidence-graphic"
      role="img"
      aria-hidden={!active}
      aria-label={
        [
          "Иллюстрация окна отеля с видом на солнце над морем",
          "Схема шумной дороги и тихого двора",
          "Схема пути от отеля до пляжа",
        ][type]
      }
    >
      <defs>
        <mask
          id={`proof-draw-${type}`}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="530"
          height="310"
        >
          <path
            data-draw
            d={type === 0 ? SUN_ARC : BEACH_ROUTE}
            fill="none"
            stroke="white"
            strokeWidth="10"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset="0"
          />
        </mask>
        <clipPath id={`proof-noise-zone-${type}`}>
          <rect x="190" y="170" width="36" height="72" />
        </clipPath>
      </defs>
      {type === 0 ? <SunScene /> : type === 1 ? <NoiseScene /> : <RouteScene />}
    </svg>
  );
}

export function Proof() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(0);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(
      {
        narrow: "(max-width: 720px)",
        animated: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const { narrow, animated } = context.conditions!;
        if (!animated) return;
        const heading = el.querySelector(".proof-heading");
        const rows = el.querySelectorAll(".evidence-item");
        const stage = el.querySelector(".evidence-stage");
        const enter = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top 84%", once: true },
        });
        enter.from(heading, { y: 24, opacity: 0.55, duration: 0.85, ease: "power3.out" }, 0);
        if (!narrow) {
          enter.from(
            rows,
            {
              x: -18,
              opacity: 0.4,
              stagger: 0.09,
              duration: 0.7,
              ease: "power3.out",
            },
            0.15,
          );
          enter.from(
            stage,
            {
              y: 28,
              scale: 0.97,
              opacity: 0.45,
              duration: 0.9,
              ease: "power3.out",
            },
            0.12,
          );
        } else {
          gsap.from(rows, {
            y: 18,
            opacity: 0.45,
            stagger: 0.08,
            duration: 0.6,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".evidence-list",
              start: "top 92%",
              once: true,
            },
          });
          gsap.from(stage, {
            y: 22,
            opacity: 0.45,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: stage, start: "top 94%", once: true },
          });
        }
      },
      el,
    );
    return () => mm.revert();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => ScrollTrigger.refresh(), 450);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <section className="landing-proof" id="proof" ref={root}>
      <div className="showcase-container">
        <div className="proof-heading">
          <h2>
            За каждым «да»
            <br />
            есть «почему».
          </h2>
          <p>
            Красивого описания мало.
            <br />
            Показываем, откуда взялся каждый факт.
            <br />А если не знаем — так и говорим.
          </p>
        </div>
        <div className="proof-layout">
          <div className="evidence-list">
            {ITEMS.map((item, i) => (
              <div key={item.title} className={`evidence-item${open === i ? " open" : ""}`}>
                <h3>
                  <button
                    onClick={() => {
                      setOpen(i);
                      setReplay((value) => value + 1);
                    }}
                    aria-expanded={open === i}
                    aria-controls={`evidence-${i}`}
                    id={`evidence-button-${i}`}
                  >
                    <item.icon size={23} />
                    <span>{item.title}</span>
                    <ChevronDown size={20} />
                  </button>
                </h3>
                <div className="evidence-reveal" aria-hidden={open !== i} inert={open !== i}>
                  <div className="evidence-reveal-inner">
                    <div
                      className="evidence-description"
                      id={`evidence-${i}`}
                      role="region"
                      aria-labelledby={`evidence-button-${i}`}
                    >
                      <p>{item.body}</p>
                      <span>{item.source}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="evidence-stage">
            <div className="evidence-viewport">
              {ITEMS.map((item, i) => (
                <div
                  className="evidence-panel"
                  data-active={open === i}
                  aria-hidden={open !== i}
                  key={item.title}
                >
                  <EvidenceGraphic type={i} active={open === i} replay={replay} />
                </div>
              ))}
            </div>
            <span className="evidence-signature" aria-hidden="true">
              О!кно
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
