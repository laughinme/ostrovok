import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Footprints,
  Moon,
  Sun,
  Volume2,
  Waves,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TravelAirplane } from "@/shared/ui";
import { Logo } from "@/widgets/site-header";
import type { Mood } from "../../model/use-moods";
import { Photo } from "../landing-ui";
import { TravelCity } from "../travel-city";
import type { HotelScene } from "./hotel-scene";
import { Proof } from "./landing-proof";
import { LandingFlight } from "./landing-flight";
import { useLandingMotion } from "./use-landing-motion";
import "./landing-showcase.css";

const cx = (...items: (string | false)[]) => items.filter(Boolean).join(" ");

function PhotoCollections({ onMood, moods }: { onMood(mood: Mood): void; moods: Mood[] }) {
  return (
    <section className="photo-collections" aria-label="Подборки по настроению">
      <div className="collection-grid">
        {moods.map((mood) => (
          <button
            className="collection-card"
            type="button"
            key={mood.id}
            onClick={() => onMood(mood)}
          >
            <Photo k={mood.photo} alt="" />
            <div className="collection-caption">
              <h2>{mood.title}</h2>
              <p>{mood.proof}</p>
              <span>
                Подобрать <ArrowRight size={16} />
              </span>
            </div>
          </button>
        ))}
      </div>
      <p className="collection-note">
        Большой Сочи · фотографии для настроения, количество отелей по данным сервиса
      </p>
    </section>
  );
}

function HotelDemo() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<HotelScene | null>(null);
  const stage = useRef<HTMLElement>(null);
  const manual = useRef(false);
  const [floor, setFloor] = useState(6);
  const [side, setSide] = useState<"sea" | "yard">("sea");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let gone = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        try {
          const { createHotelScene } = await import("./hotel-scene");
          if (gone || !host.current) return;
          scene.current = createHotelScene(host.current);
          scene.current.setFloor(6);
          setReady(true);
        } catch {
          if (!gone) setFailed(true);
        }
      },
      { rootMargin: "400px" },
    );
    if (host.current) observer.observe(host.current);
    return () => {
      gone = true;
      observer.disconnect();
      scene.current?.dispose();
    };
  }, []);
  useEffect(() => {
    scene.current?.setFloor(floor);
  }, [floor, ready]);
  useEffect(() => {
    scene.current?.setSide(side);
  }, [side, ready]);
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
      ScrollTrigger.create({
        trigger: stage.current,
        start: "top top",
        end: "+=650",
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          if (!manual.current) {
            scene.current?.setProgress(self.progress);
            setFloor(Math.min(8, 2 + Math.floor(self.progress * 7)));
          }
        },
      });
    });
    return () => mm.revert();
  }, []);
  const changeFloor = (n: number) => {
    manual.current = true;
    setFloor(n);
  };
  return (
    <section className="hotel-stage" id="window" ref={stage}>
      <div className="hotel-layout showcase-container">
        <div className="hotel-copy" data-reveal>
          <span className="section-note">
            <span />
            Ваше окно, ещё до поездки
          </span>
          <h2>
            Найдём вашу
            <br />
            сторону отдыха.
          </h2>
          <p>
            У моря или во двор? Второй этаж или шестой? Одно здание, а вид и тишина совсем разные.
          </p>
          <p className="subtle">
            О!кно смотрит на конкретный фасад и этаж. Попробуйте поменять их сами.
          </p>
          <div className="facade-control" role="group" aria-label="Сторона отеля">
            <button
              className={side === "sea" ? "active" : ""}
              onClick={() => {
                manual.current = true;
                setSide("sea");
              }}
              aria-pressed={side === "sea"}
            >
              <Waves size={17} />К морю
            </button>
            <button
              className={side === "yard" ? "active" : ""}
              onClick={() => {
                manual.current = true;
                setSide("yard");
              }}
              aria-pressed={side === "yard"}
            >
              Во двор
            </button>
          </div>
          <div className="floor-control">
            <label htmlFor="floor">
              Этаж <strong>{floor}</strong>
            </label>
            <input
              id="floor"
              aria-label="Этаж номера"
              type="range"
              min="2"
              max="8"
              step="1"
              value={floor}
              onChange={(e) => changeFloor(+e.target.value)}
            />
            <div className="range-labels">
              <span>2 этаж</span>
              <span>8 этаж</span>
            </div>
          </div>
        </div>
        <div className="hotel-visual">
          <div className="scene-topline">
            <span>Всё дело в деталях</span>
            <span className="demo-label">Демо-сцена</span>
          </div>
          <div
            ref={host}
            className={cx("three-host", ready && "is-ready")}
            role="img"
            aria-label={`Объёмная модель отеля у моря, выбран ${floor} этаж, ${side === "sea" ? "сторона к морю" : "сторона во двор"}`}
          >
            {!ready && (
              <div className="scene-fallback">
                <div className="fallback-building">
                  {Array.from({ length: 7 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        background: 8 - i === floor ? "#c2ec92" : undefined,
                      }}
                    >
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  ))}
                </div>
                <span>{failed ? "Схема отеля" : "Готовим ваш ракурс"}</span>
              </div>
            )}
          </div>
          <div className="scene-annotation">
            <span className="annotation-dot" />
            <span>
              {side === "yard"
                ? "Тише, но без морского горизонта"
                : floor < 5
                  ? "Часть горизонта закрывают здания"
                  : "Выше соседних крыш. Больше моря."}
            </span>
          </div>
          <div className="scene-facts" aria-live="polite">
            <div>
              <span>Вид из окна</span>
              <strong>
                {side === "yard" ? "Зелёный двор" : floor < 5 ? "Море частично" : "Открытое море"}
              </strong>
            </div>
            <div>
              <span>Ваш номер</span>
              <strong>
                {floor} этаж · {side === "sea" ? "юго-запад" : "северо-восток"}
              </strong>
            </div>
            <span className="verified-mark">
              <Check size={15} />
              Учитываем этаж
            </span>
          </div>
        </div>
      </div>
      <div className="stage-bottom showcase-container">
        <span>Иллюстрация принципа. Реальные условия зависят от отеля и дат.</span>
        <span>
          Прокрутите — сменится ракурс <ArrowDown size={14} />
        </span>
      </div>
    </section>
  );
}

function DayArt({ time }: { time: "evening" | "night" | "morning" }) {
  return (
    <svg viewBox="0 0 400 340" className="window-scenery" aria-hidden="true">
      <rect width="400" height="340" fill={time === "night" ? "#0a1c66" : "#b4cdff"} />
      {time === "evening" ? (
        <>
          <path
            d="M48 211Q190 -20 350 211"
            fill="none"
            stroke="#f4f7ff"
            strokeWidth="1.5"
            strokeDasharray="5 7"
          />
          <circle cx="278" cy="173" r="43" fill="#c2ec92" />
          <path d="M0 209Q200 198 400 209V340H0" fill="#1b4de4" />
          <path d="m273 210-39 130h89l-35-130" fill="#c2ec92" opacity=".24" />
          <path
            d="M0 239q70-8 140 0t140 0t140 0M0 284q84-7 168 0t168 0t168 0"
            fill="none"
            stroke="#cfdcff"
            strokeWidth="1.5"
          />
          <path d="m0 221 59-54 42 33 49-12 33 35Z" fill="#799be5" />
          <path d="M0 288H400V340H0" fill="#0a1c66" />
          <path
            d="M0 287H400M49 289v51M121 289v51M278 289v51M350 289v51"
            fill="none"
            stroke="#cfdcff"
            strokeWidth="4"
          />
          <path d="M28 184h67v104H28Z" fill="#0a1c66" />
          <path d="M22 181h80" stroke="#cfdcff" strokeWidth="4" />
        </>
      ) : time === "night" ? (
        <>
          {[
            [48, 70, 2],
            [105, 41, 2.5],
            [188, 89, 2],
            [232, 40, 2],
            [322, 121, 2],
            [359, 68, 1.5],
            [151, 124, 1.5],
          ].map(([x, y, r]) => (
            <circle key={x} cx={x} cy={y} r={r} fill="#cfdcff" />
          ))}
          <circle cx="282" cy="79" r="32" fill="#c2ec92" />
          <circle cx="295" cy="69" r="29" fill="#0a1c66" />
          <path d="M0 228Q210 198 400 228V340H0" fill="#1438c2" />
          <path d="M0 284Q200 232 400 287V340H0" fill="#244b92" />
          <path d="M58 145h108v195H58Z" fill="#0b1533" />
          <path d="M53 145h119M77 145v-17h69v17" fill="none" stroke="#799be5" strokeWidth="5" />
          {[79, 112, 145].map((x, i) => (
            <g key={x}>
              <rect x={x} y="172" width="14" height="26" fill={i === 1 ? "#c2ec92" : "#799be5"} />
              <rect x={x} y="222" width="14" height="26" fill={i !== 0 ? "#c2ec92" : "#799be5"} />
              <rect x={x} y="272" width="14" height="26" fill="#799be5" />
            </g>
          ))}
          <path d="M252 340Q217 290 274 251" fill="none" stroke="#799be5" strokeWidth="17" />
          {[252, 337].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 295v-92`} stroke="#0b1533" strokeWidth="7" />
              <circle cx={x} cy={203 + i * 13} r={31 + i * 5} fill="#0b1533" />
              <circle cx={x - 16} cy={211 + i * 13} r="22" fill="#0b1533" />
            </g>
          ))}
        </>
      ) : (
        <>
          <circle cx="99" cy="92" r="32" fill="#f4f7ff" />
          <path d="M0 190Q200 180 400 190V340H0" fill="#1b4de4" />
          <path d="M0 215Q158 195 400 251V340H0" fill="#c2ec92" />
          <path d="M0 269Q191 231 400 290V340H0" fill="#aee07a" />
          <path
            d="M174 350C139 314 152 289 205 267S260 227 249 208"
            fill="none"
            stroke="#f4f7ff"
            strokeWidth="25"
          />
          <path d="M264 208q31 2 64 9" fill="none" stroke="#cfdcff" strokeWidth="1.5" />
          <path
            d="M292 245V171M312 245V171M284 170h37"
            fill="none"
            stroke="#0a1c66"
            strokeWidth="5"
          />
          {[48, 351].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 287V151`} stroke="#0a1c66" strokeWidth="8" />
              <circle cx={x} cy={154 + i * 8} r="38" fill="#0a1c66" />
              <circle cx={x + 22} cy={168 + i * 8} r="25" fill="#0a1c66" />
            </g>
          ))}
          <path d="m223 203 5-8 5 8Zm19 8 5-8 5 8Z" fill="#f4f7ff" />
        </>
      )}
    </svg>
  );
}

function DayPreview() {
  const moments = [
    {
      time: "evening" as const,
      title: "Вечер. Тот самый закат",
      body: "Покажем, где сядет солнце в ваши даты и не закроют ли его соседние здания.",
      icon: Sun,
    },
    {
      time: "night" as const,
      title: "Ночь. Можно выдохнуть",
      body: "Оценим дороги вокруг и подскажем, на какую сторону выходят более тихие номера.",
      icon: Moon,
    },
    {
      time: "morning" as const,
      title: "Утро. Море зовёт",
      body: "Проверим путь до пляжа: где придётся подниматься и сколько ступеней встретится по дороге.",
      icon: Footprints,
    },
  ];
  return (
    <section className="landing-day-preview day-preview showcase-container" id="inspiration">
      <div className="moods-heading" data-reveal>
        <h2>
          Один день отдыха.
          <br />
          Ещё до поездки.
        </h2>
        <p>
          Загляните в вечер, ночь и утро.
          <br />У каждого момента — своя проверка.
        </p>
      </div>
      <div className="mood-windows">
        {moments.map((m) => (
          <article className="mood-window day-window" key={m.time}>
            <div className="window-frame">
              <DayArt time={m.time} />
              <div className="window-mullion" />
              <div className="window-handle" />
              <span className="window-icon">
                <m.icon size={22} />
              </span>
            </div>
            <div className="mood-title">
              <h3>{m.title}</h3>
            </div>
            <p className="day-caption">{m.body}</p>
          </article>
        ))}
      </div>
      <p className="art-note">
        Это иллюстрация одного дня. Реальный вид и условия зависят от отеля, этажа и дат.
      </p>
    </section>
  );
}

function ArrivalBackdrop() {
  const clouds = [
    { name: "left-high", opacity: 0.95 },
    { name: "top", opacity: 0.25 },
    { name: "right-high", opacity: 0.95 },
    { name: "left-low", opacity: 0.25 },
    { name: "right-low", opacity: 0.25 },
  ];
  return (
    <div className="home-sky arrival-sky" aria-hidden="true">
      {clouds.map((cloud) => (
        <svg
          key={cloud.name}
          className={`arrival-cloud arrival-cloud--${cloud.name}`}
          viewBox="0 0 100 44"
          fill="currentColor"
          focusable="false"
          style={{ opacity: cloud.opacity }}
        >
          <path d="M2 40C2 32 9 27 18 28C20 15 31 8 43 10C54 1 70 9 73 23C82 19 91 25 92 31C98 30 100 35 100 40Z" />
        </svg>
      ))}
      <TravelCity id="arrival-city" />
    </div>
  );
}

export function LandingShowcase({ onMood, moods }: { onMood(mood: Mood): void; moods: Mood[] }) {
  const root = useRef<HTMLDivElement>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useLandingMotion(root);
  useEffect(() => () => clearTimeout(focusTimer.current), []);
  const backToSearch = () => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .querySelector(".landing-page .band")
      ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
    clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(
      () =>
        document
          .querySelector<HTMLTextAreaElement>(".landing-page .wish textarea")
          ?.focus({ preventScroll: true }),
      reduced ? 0 : 500,
    );
  };
  return (
    <div className="landing-showcase" ref={root}>
      <LandingFlight />
      <PhotoCollections onMood={onMood} moods={moods} />
      <section className="intro showcase-container" id="how">
        <div className="intro-head" data-reveal>
          <h2>
            Отель один.
            <br />
            Впечатления — разные.
          </h2>
          <p>
            «Вид на море» бывает видом на соседний балкон. А «пять минут до пляжа» — дорогой
            по&nbsp;ступеням.
            <br />
            <br />
            Мы помогаем выбрать <strong>тот самый номер</strong>, чтобы отдых совпал
            с&nbsp;ожиданиями.
          </p>
        </div>
        <div className="intro-rule" />
        <div className="intro-bottom">
          <span>Дело не в количестве звёзд</span>
          <div>
            <span>
              <Sun size={18} />
              Ваш вид
            </span>
            <span>
              <Volume2 size={18} />
              Ваша тишина
            </span>
            <span>
              <Footprints size={18} />
              Ваш путь к морю
            </span>
          </div>
        </div>
      </section>
      <HotelDemo />
      <Proof />
      <DayPreview />
      <section className="final-cta">
        <ArrivalBackdrop />
        <div className="showcase-container final-inner">
          <div className="arrival-icon" aria-hidden="true">
            <TravelAirplane />
          </div>
          <span className="arrival-label">Следующая остановка — ваш отдых</span>
          <h2>
            Всё начинается
            <br />с вашего «хочу».
          </h2>
          <p>
            Расскажите о поездке своими словами.
            <br />
            Проверим то, что для вас важно.
          </p>
          <button className="btn btn-primary" onClick={backToSearch}>
            Найти свой номер <ArrowUpRight size={20} />
          </button>
          <span className="final-note">Большой Сочи · подбор по вашим желаниям</span>
        </div>
      </section>
      <footer className="showcase-footer showcase-container">
        <div className="footer-top">
          <Logo className="showcase-logo" />
          <nav className="footer-nav" aria-label="Разделы в подвале">
            <a href="#how">Как это работает</a>
            <a href="#proof">Что мы проверяем</a>
            <Link to="/partner">
              Для отелей <ArrowUpRight size={14} />
            </Link>
          </nav>
          <button onClick={backToSearch}>
            К началу <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="footer-meta">
          <span>О! Хакатон 2026 · прототип · визуализации демо</span>
          <div className="footer-sources">
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              © OpenStreetMap contributors · ODbL
            </a>
            <a
              href="https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM"
              target="_blank"
              rel="noreferrer"
            >
              Copernicus DEM
            </a>
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo · CC BY 4.0
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
