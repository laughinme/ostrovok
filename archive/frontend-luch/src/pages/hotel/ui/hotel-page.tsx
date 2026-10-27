import { Beam, CRITERIA, Price, StatusPill, type Hotel } from "@/entities/hotel";
import { useCompare } from "@/features/compare-hotels";
import { parseQuery, scoreHotel } from "@/features/hotel-search";
import { cn } from "@/shared/lib";
import { MatchRing, Section } from "@/shared/ui";
import { Gallery } from "@/widgets/hotel-gallery";
import { NoiseChart, ViewCompass } from "@/widgets/hotel-insights";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Baby,
  Bus,
  Check,
  Coffee,
  Dog,
  Laptop,
  Layers,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Trees,
  Waves,
} from "lucide-react";
const KIND_ICON = {
  beach: Waves,
  transport: Bus,
  park: Trees,
  shop: ShoppingBag,
  food: Coffee,
  kids: Baby,
};

export function HotelPage({ hotel, query: q }: { hotel: Hotel; query?: string | undefined }) {
  const criteria = parseQuery(q ?? "");
  const score = scoreHotel(hotel, criteria);
  const { ids, toggle } = useCompare();
  const inCmp = ids.includes(hotel.id);
  const images = hotel.gallery.length > 0 ? hotel.gallery : [hotel.image];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Link
        to="/results"
        search={{ q }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> К подборке
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Gallery images={images} name={hotel.name} />

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {hotel.district} · {"★".repeat(hotel.stars)}
              </p>
              <h1 className="mt-1 text-4xl sm:text-5xl">{hotel.name}</h1>
              <p className="mt-2 max-w-xl text-lg text-muted-foreground">{hotel.tagline}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-tint px-4 py-2">
              <Star className="h-4 w-4 fill-coral text-coral" />
              <span className="font-mono text-lg font-bold tabular-nums">{hotel.rating}</span>
              <span className="text-sm text-muted-foreground">от гостей</span>
            </div>
          </div>

          <Section title="Почему это ваш вариант">
            <p className="text-muted-foreground">{hotel.description}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {criteria.map((c) => (
                <div key={c} className="rounded-2xl bg-muted p-4">
                  <div className="flex justify-between text-sm">
                    <span>{CRITERIA[c].label}</span>
                    <span className="font-mono">{hotel.scores[c]}/100</span>
                  </div>
                  <Beam
                    value={hotel.scores[c] / 100}
                    status={hotel.scores[c] >= 80 ? "confirmed" : "computed"}
                    className="mt-2"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-dashed p-4 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <Sparkles className="h-4 w-4 text-coral" /> Что обнаружил AI
              </p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {hotel.discovered.map((d) => (
                  <li key={d}>— {d}</li>
                ))}
              </ul>
            </div>
          </Section>

          <Section title="Шум в течение суток" demo>
            <p className="text-sm text-muted-foreground">
              Ночью ≈ {Math.min(...hotel.noise)} дБ —{" "}
              {Math.min(...hotel.noise) < 32 ? "тише шёпота" : "как тихая квартира"}.
            </p>
            <div className="mt-6">
              <NoiseChart hotel={hotel} />
            </div>
          </Section>

          <div className="grid gap-6 sm:grid-cols-2">
            <Section title="Виды из окон" demo>
              <ViewCompass hotel={hotel} />
              <ul className="mt-2 space-y-1 text-sm">
                {hotel.views.map((v, i) => (
                  <li key={v.label} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        i === 0 ? "bg-sea" : "bg-conf-high",
                      )}
                    />
                    {v.label}
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sun" />
                  Закат летом, азимут {hotel.sunsetAzimuth}°
                </li>
              </ul>
            </Section>

            <Section title="Пешком реально">
              <ul className="space-y-3">
                {[...hotel.walk]
                  .sort((a, b) => a.minutes - b.minutes)
                  .map((w) => {
                    const Icon = KIND_ICON[w.kind];
                    return (
                      <li key={w.name} className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-tint text-coral">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-sm">{w.name}</span>
                        <span className="font-mono text-sm">
                          {w.minutes === 0 ? "рядом" : `${w.minutes} мин`}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </Section>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Section title="Кому тут хорошо" demo>
              <ul className="space-y-4">
                {[
                  {
                    icon: Baby,
                    title: "С детьми",
                    text: hotel.audiences.kids,
                    s: hotel.scores.kids,
                  },
                  {
                    icon: Dog,
                    title: "С питомцем",
                    text: hotel.audiences.pets,
                    s: hotel.scores.pets,
                  },
                  {
                    icon: Laptop,
                    title: "Для работы",
                    text: hotel.audiences.work,
                    s: hotel.scores.work,
                  },
                ].map((a) => (
                  <li key={a.title}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <a.icon className="h-4 w-4 text-coral" /> {a.title}
                      </span>
                      <span className="font-mono text-muted-foreground">{a.s}/100</span>
                    </div>
                    <Beam
                      value={a.s / 100}
                      status={a.s >= 80 ? "confirmed" : "computed"}
                      className="mt-1.5"
                    />
                    <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Какой этаж выбрать">
              <ul className="space-y-3">
                {hotel.floors.map((f) => (
                  <li
                    key={f.range}
                    className={cn(
                      "rounded-2xl border p-3",
                      f.good && "border-conf-high/50 bg-conf-high/5",
                    )}
                  >
                    <p className="font-mono text-sm">{f.range}</p>
                    <p className="text-sm text-muted-foreground">{f.note}</p>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <Section title="Откуда мы это знаем">
            <div className="divide-y">
              {hotel.facts.map((f) => (
                <div
                  key={f.label}
                  className="grid gap-3 py-4 sm:grid-cols-[1fr_180px] sm:items-center"
                >
                  <div>
                    <p className="font-medium">{f.label}</p>
                    <p className="text-sm text-muted-foreground">{f.value}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {f.source} · {f.checkedAt}
                    </p>
                    {f.note && <p className="mt-1 text-sm text-destructive">{f.note}</p>}
                  </div>
                  <div>
                    <StatusPill status={f.status} />
                    <Beam value={f.confidence} status={f.status} className="mt-2" />
                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                      уверенность {Math.round(f.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-3xl border bg-card p-5">
            <div className="flex items-center gap-4">
              <MatchRing value={score} size={72} stroke={6} />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  совпадение с запросом
                </p>
                <Price value={hotel.price} className="mt-1" />
              </div>
            </div>
            <button
              onClick={() => toggle(hotel.id)}
              className={cn(
                "mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition",
                inCmp
                  ? "border border-coral text-coral hover:bg-tint"
                  : "bg-coral text-primary-foreground shadow-glow",
              )}
            >
              {inCmp ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {inCmp ? "В сравнении" : "Добавить в сравнение"}
            </button>
            <Link
              to="/compare"
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border text-sm font-medium transition hover:border-coral hover:text-coral"
            >
              <Layers className="h-4 w-4" /> Сравнить с другими
            </Link>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              данные прототипа · демо
            </p>
          </div>

          <div className="mt-4 rounded-3xl border border-dashed p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-coral" /> Что заметил AI
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {hotel.pros.slice(0, 3).map((p) => (
                <li key={p}>— {p}</li>
              ))}
            </ul>
            {hotel.cons[0] && (
              <p className="mt-3 text-sm text-muted-foreground">
                Компромисс: {hotel.cons[0].toLowerCase()}
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
