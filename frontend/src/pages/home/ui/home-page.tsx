import { Header } from "@/widgets/site-header";
import { rememberFlightDeparture } from "@/features/search-flight";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { buildLandingQuery } from "../model/build-query";
import { EXAMPLES } from "../model/catalog";
import { useMoods, type Mood } from "../model/use-moods";
import { useSearchSession } from "@/features/hotel-search";
import { RequestState } from "@/shared/ui";
import type { IntentChip } from "../model/types";
import { Examples, Landing, ProofCard } from "./landing-sections";
import { LandingShowcase } from "./showcase/landing-showcase";
import { LandingSearch } from "./landing-search";
import { Icon, Photo } from "./landing-ui";
import "./landing.css";
import { TravelBackground } from "./travel-background";

type Variant = "photo" | "split" | "lime";
const VARIANTS: [Variant, string, string][] = [
  ["photo", "A", "Фото и поле по центру"],
  ["split", "B", "Номер с доказательством"],
  ["lime", "C", "Салатовый Островок"],
];
const isVariant = (value: unknown): value is Variant => VARIANTS.some(([key]) => key === value);
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function HomePage() {
  const moods = useMoods();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { v?: string; variants?: string };
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<IntentChip[]>([]);
  const [enabled, setEnabled] = useState(search.variants === "1");
  const [stored, setStored] = useState<Variant>("lime");
  const variant = enabled ? (isVariant(search.v) ? search.v : stored) : "lime";

  useEffect(() => {
    try {
      const value = localStorage.getItem("okno-variant");
      if (isVariant(value)) setStored(value);
      if (localStorage.getItem("okno-variants") === "1") setEnabled(true);
    } catch {
      setStored("lime");
    }
  }, []);

  useEffect(() => {
    if (enabled && isVariant(search.v)) {
      setStored(search.v);
      save("okno-variant", search.v);
    }
  }, [enabled, search.v]);

  const go = (text: string, selection: readonly IntentChip[] = []) => {
    const q = buildLandingQuery(text, EXAMPLES[0]!, selection);
    rememberFlightDeparture(q, document.querySelector<HTMLElement>("[data-flight-scene]"));
    void navigate({ to: "/search", search: { q } });
  };
  const onMood = (mood: Mood) => {
    if (mood.apiChips) {
      useSearchSession.getState().remember(mood.title, {
        text: mood.title,
        budget: null,
        intent: {
          text: mood.title,
          chips: mood.apiChips,
          trip: { month: mood.month ?? null },
          planner: "rules",
        },
      });
    }
    go(mood.title, mood.chips);
  };
  const onExample = (text: string) => go(text);
  const selectVariant = (next: Variant) => {
    setStored(next);
    save("okno-variant", next);
    void navigate({
      to: "/",
      search: { variants: "1", v: next },
      replace: true,
      resetScroll: false,
    });
  };
  const toggleVariants = () => {
    setEnabled(!enabled);
    save("okno-variants", enabled ? "0" : "1");
    if (enabled) {
      setStored("lime");
      save("okno-variant", "lime");
      void navigate({ to: "/", search: {}, replace: true, resetScroll: false });
    }
  };
  const wish = (
    <LandingSearch
      query={query}
      onQuery={setQuery}
      chips={chips}
      onChips={setChips}
      onSubmit={(placeholder) =>
        go(
          query.trim() ||
            EXAMPLES.find((text) => placeholder && text.startsWith(placeholder)) ||
            EXAMPLES[0]!,
          chips,
        )
      }
    />
  );

  return (
    <main className={`landing-page${variant === "lime" ? " landing-page--showcase" : ""}`}>
      <div className={`search-page v-${variant} is-landing`}>
        <section className={`band band-${variant}`}>
          {variant === "lime" && <TravelBackground variant="city" />}
          {variant === "photo" && (
            <div className="band-bg" aria-hidden="true">
              <Photo k="lux-hero" alt="" />
            </div>
          )}
          <Header
            embedded
            tone={variant === "photo" ? "clear" : variant === "lime" ? "lime" : "white"}
          />
          <div className="band-in">
            {variant === "photo" ? (
              <div className="hero-c">
                <div className="hero-copy">
                  <span className="kicker">
                    <Icon name="spark" size={15} />
                    Большой Сочи · проверяем условия по этажам
                  </span>
                  <h1>Опишите отдых — покажем, каким будет ваш номер</h1>
                  <p className="lede">
                    Вид из окна, тишина ночью и дорога до моря — для каждого этажа. С источником у
                    каждого факта.
                  </p>
                </div>
                {wish}
                <Examples onPick={onExample} />
              </div>
            ) : variant === "split" ? (
              <div className="hero-s">
                <div className="hero-l">
                  <div className="hero-copy">
                    <span className="kicker dark">
                      <Icon name="spark" size={15} />
                      Не просто отель. Номер, который вы ждёте
                    </span>
                    <h1>
                      Каким будет ваш номер — <em>видно до&nbsp;поездки</em>
                    </h1>
                    <p className="lede">
                      Расскажите, о чём мечтаете. Мы проверим вид, шум и дорогу до моря по рельефу и
                      картам — и честно скажем, где не уверены.
                    </p>
                  </div>
                  {wish}
                  <Examples onPick={onExample} light />
                </div>
                <ProofCard />
              </div>
            ) : (
              <div className="hero-c">
                <div className="hero-copy">
                  <h1>Оооочень точный подбор номера</h1>
                </div>
                {wish}
                <Examples onPick={onExample} light />
              </div>
            )}
          </div>
          {variant === "photo" && (
            <div className="band-proof">
              <span>
                <b className="num">16:58</b> закат из номера 512 «Закатного берега» 11 ноября
              </span>
              <span>
                <b className="num">38 дБ</b> ночью в номерах во двор
              </span>
              <span>
                <b className="num">6 мин</b> до пляжа, 64 ступени
              </span>
              <span className="muted-w">Демонстрационный пример расчёта</span>
            </div>
          )}
        </section>
        <RequestState
          pending={moods.pending}
          error={moods.error}
          retry={() => void moods.retry()}
        />
        {variant === "lime" ? (
          <LandingShowcase onMood={onMood} moods={moods.moods} />
        ) : (
          <Landing
            onMood={onMood}
            moods={moods.moods}
            showMoods
            variantsOn={enabled}
            onToggleVariants={toggleVariants}
          />
        )}
        {enabled && (
          <div className="vswitch" role="group" aria-label="Вариант главной">
            <span>Лендинг</span>
            {VARIANTS.map(([key, label, title]) => (
              <button
                key={key}
                type="button"
                className={variant === key ? "on" : ""}
                aria-pressed={variant === key}
                title={title}
                onClick={() => selectVariant(key)}
              >
                <b>{label}</b>
              </button>
            ))}
            <button
              type="button"
              className="vswitch-x"
              aria-label="Скрыть варианты лендинга"
              title="Скрыть варианты лендинга"
              onClick={toggleVariants}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
