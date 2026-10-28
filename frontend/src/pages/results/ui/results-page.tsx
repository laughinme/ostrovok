import { useCompare } from "@/features/compare-hotels";
import { CriteriaFilter, useSearchFilters } from "@/features/hotel-search";
import { ResearchOffers, useLiveResearch } from "@/features/live-research";
import { cn } from "@/shared/lib";
import { RequestState } from "@/shared/ui";
import { CoastMap } from "@/widgets/hotel-map";
import { AgentTrace } from "@/widgets/agent-trace";
import { HotelResultCard } from "@/widgets/hotel-result-card";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { List, Map as MapIcon, Scale, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
export function ResultsPage({
  query: q = "Тихий отель у моря с хорошей инфраструктурой",
  hotelId,
}: {
  query?: string | undefined;
  hotelId?: string | undefined;
}) {
  const navigate = useNavigate();
  const {
    refine,
    setRefine,
    criteria,
    maxPrice,
    setMaxPrice,
    ranked,
    toggleCriterion,
    refineQuery,
    pending,
    error,
    retry,
    search: searchResult,
    hints,
    removeChip,
    acceptSearch,
    updating,
    canUseProfile,
    useProfile,
    setUseProfile,
  } = useSearchFilters(q, hotelId);
  const live = useLiveResearch(searchResult?.searchId, acceptSearch);
  const [visibleCount, setVisibleCount] = useState(20);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const hash = useLocation({ select: (location) => location.hash });
  const linkedIndex = ranked.findIndex((result) => hash === `hotel-${result.hotel.id}`);
  const renderedCount = Math.max(visibleCount, linkedIndex + 1);
  useEffect(() => {
    if (!pending && hash.startsWith("hotel-")) {
      document.getElementById(hash)?.scrollIntoView({ block: "center" });
    }
  }, [hash, pending, ranked]);
  const ids = useCompare((state) => state.ids);
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="max-w-3xl text-3xl [overflow-wrap:anywhere] sm:text-4xl">
            «{q.length > 240 ? `${q.slice(0, 220)}…` : q}»
          </h1>
          {q.length > 240 && (
            <details className="mt-3 max-w-3xl text-sm [overflow-wrap:anywhere]">
              <summary className="cursor-pointer text-primary">Полный запрос</summary>
              <p className="mt-2 text-muted-foreground">{q}</p>
            </details>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchResult && refine.trim()) {
              void live.wish(refine.trim());
              setRefine("");
            } else refineQuery();
          }}
          className="flex w-full max-w-md items-center gap-2 rounded-2xl border bg-card p-1.5 pl-4"
        >
          <Sparkles className="h-4 w-4 text-coral" />
          <input
            aria-label="Уточнение пожеланий"
            value={refine}
            onChange={(e) => setRefine(e.target.value)}
            placeholder="Уточните: «и чтобы с собакой»"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <button
            aria-label="Добавить пожелание"
            disabled={live.busy}
            className="min-h-11 rounded-xl bg-foreground px-3 py-2 text-xs text-background disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      <RequestState page={!searchResult} pending={pending} error={error} retry={retry} />
      {hints.length > 0 && !error && (
        <div className="mt-6 space-y-2 rounded-2xl border bg-card p-5 text-sm" role="status">
          {hints.map((hint) => (
            <p key={hint}>{hint}</p>
          ))}
        </div>
      )}

      {hotelId && (
        <p className="mt-5 text-sm text-muted-foreground">
          В подборе выбран отель из консоли.{" "}
          <Link to="/results" search={{ q: "Все отели Сочи" }} className="text-primary underline">
            Показать все отели
          </Link>
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <CriteriaFilter
          value={criteria}
          onToggle={(criterion) => {
            live.reset();
            toggleCriterion(criterion);
          }}
        />
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono text-foreground">
            {maxPrice ? `до ${maxPrice.toLocaleString("ru")} ₽` : "Без ограничения цены"}
          </span>
          <input
            type="range"
            min={1000}
            max={Math.max(50000, maxPrice ?? 50000)}
            step={500}
            aria-label="Бюджет за ночь"
            value={maxPrice ?? 50000}
            onChange={(e) => {
              live.reset();
              setMaxPrice(+e.target.value);
            }}
            className="accent-coral"
          />
        </label>
        {maxPrice !== null && (
          <button
            type="button"
            className="min-h-11 px-2 text-xs underline"
            onClick={() => {
              live.reset();
              setMaxPrice(null);
            }}
          >
            Снять ограничение
          </button>
        )}
        <div className="flex rounded-full border p-0.5 lg:hidden">
          <button
            aria-label="Показать список"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={cn("rounded-full p-1.5", view === "list" && "bg-muted")}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            aria-label="Показать карту"
            aria-pressed={view === "map"}
            onClick={() => setView("map")}
            className={cn("rounded-full p-1.5", view === "map" && "bg-muted")}
          >
            <MapIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      {canUseProfile && (
        <label className="mt-4 flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useProfile}
            onChange={(event) => {
              live.reset();
              setUseProfile(event.target.checked);
            }}
          />
          Учитывать мой профиль вкуса
        </label>
      )}
      {searchResult?.relaxations.map((relaxation) => (
        <button
          key={relaxation.chipId}
          type="button"
          className="mt-3 min-h-11 rounded-xl border px-4 py-2 text-sm"
          onClick={() => {
            live.reset();
            removeChip(relaxation.chipId);
          }}
        >
          {relaxation.label} · вариантов: {relaxation.wouldMatch}
        </button>
      ))}

      {updating && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Обновляем подбор под новые условия…
        </p>
      )}
      {searchResult && !live.label && (
        <ResearchOffers
          search={searchResult}
          busy={live.busy}
          onResearch={(chipId, title) => void live.research(chipId, title)}
        />
      )}
      {live.label && (
        <div className="mt-6">
          {!live.error && (live.runId || live.busy) ? (
            <AgentTrace run={live.run} title={live.label} compact />
          ) : (
            <p className="rounded-2xl border bg-card px-4 py-3 text-sm">
              {live.error ?? "Пожелание добавлено: всё нужное уже известно, выдача обновлена."}
            </p>
          )}
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className={cn("space-y-4", view === "map" && "hidden lg:block")}>
          {!pending && !error && ranked.length === 0 && hints.length === 0 && (
            <p className="rounded-3xl border p-10 text-center text-muted-foreground">
              Под эти условия вариантов пока нет. Измените бюджет или уточните пожелания.
            </p>
          )}
          {ranked.slice(0, renderedCount).map((result, index) => (
            <HotelResultCard
              key={result.hotel.id}
              result={result}
              index={index}
              criteria={criteria}
              query={q}
              active={hover === result.hotel.id || hash === `hotel-${result.hotel.id}`}
              onHover={setHover}
            />
          ))}
          {ranked.length > renderedCount && (
            <button
              type="button"
              className="min-h-11 w-full rounded-2xl border px-5 py-3"
              onClick={() => setVisibleCount(renderedCount + 20)}
            >
              Показать ещё {Math.min(20, ranked.length - renderedCount)} из {ranked.length}
            </button>
          )}
        </div>
        <aside
          className={cn(
            "lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]",
            view === "list" && "hidden lg:block",
          )}
        >
          <div className="h-[70vh] lg:h-full">
            <CoastMap
              items={ranked.map((r) => ({ hotel: r.hotel, score: r.score }))}
              active={hover}
              onHover={setHover}
              onSelect={(id) =>
                navigate({
                  to: "/hotel/$id",
                  params: { id },
                  search: { q, sid: searchResult?.searchId },
                })
              }
            />
          </div>
        </aside>
      </div>

      {ids.length > 0 && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          className="fixed inset-x-0 bottom-6 z-40 mx-auto w-fit"
        >
          <Link
            to="/compare"
            className="flex items-center gap-3 rounded-full bg-night px-5 py-3 text-sm text-night-foreground shadow-soft"
          >
            <Scale className="h-4 w-4 text-sun" /> Сравнить {ids.length}{" "}
            {ids.length === 1 ? "отель" : "отеля"} →
          </Link>
        </motion.div>
      )}
    </main>
  );
}
