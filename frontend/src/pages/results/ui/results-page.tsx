import { useCompare } from "@/features/compare-hotels";
import { CriteriaFilter, useSearchFilters } from "@/features/hotel-search";
import { ResearchOffers, useLiveResearch, type SearchResult } from "@/features/live-research";
import { cn } from "@/shared/lib";
import { RequestState } from "@/shared/ui";
import { CoastMap } from "@/widgets/hotel-map";
import { AgentTrace } from "@/widgets/agent-trace";
import { HotelResultCard } from "@/widgets/hotel-result-card";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { List, Map as MapIcon, Scale, Search, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
export function ResultsPage({
  query: q = "Тихий отель у моря с хорошей инфраструктурой",
}: {
  query?: string | undefined;
}) {
  const navigate = useNavigate();
  const [liveSearch, setLiveSearch] = useState<SearchResult | null>(null);
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
  } = useSearchFilters(q, liveSearch);
  const live = useLiveResearch(
    searchResult?.searchId,
    useCallback((next: SearchResult | null) => setLiveSearch(next), []),
  );
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const ids = useCompare((state) => state.ids);
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="max-w-3xl text-3xl [overflow-wrap:anywhere] sm:text-4xl">«{q}»</h1>
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
            value={refine}
            onChange={(e) => setRefine(e.target.value)}
            placeholder="Уточните: «и чтобы с собакой»"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button className="rounded-xl bg-foreground px-3 py-2 text-xs text-background">
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <CriteriaFilter
          value={criteria}
          onToggle={(criterion) => {
            live.reset();
            toggleCriterion(criterion);
          }}
        />
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          до <span className="font-mono text-foreground">{maxPrice.toLocaleString("ru")} ₽</span>
          <input
            type="range"
            min={1000}
            max={20000}
            step={500}
            value={maxPrice}
            onChange={(e) => setMaxPrice(+e.target.value)}
            className="accent-coral"
          />
        </label>
        <div className="flex rounded-full border p-0.5 lg:hidden">
          <button
            onClick={() => setView("list")}
            className={cn("rounded-full p-1.5", view === "list" && "bg-muted")}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("map")}
            className={cn("rounded-full p-1.5", view === "map" && "bg-muted")}
          >
            <MapIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <RequestState pending={pending} error={error} retry={retry} />
      {searchResult && !live.label && (
        <ResearchOffers
          search={searchResult}
          busy={live.busy}
          onResearch={(chipId, title) => void live.research(chipId, title)}
        />
      )}
      {live.label && (
        <div className="mt-6">
          {live.runId || live.busy ? (
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
          {!pending && !error && ranked.length === 0 && (
            <p className="rounded-3xl border p-10 text-center text-muted-foreground">
              Под такой бюджет вариантов нет — попробуйте увеличить цену.
            </p>
          )}
          {ranked.map((result, index) => (
            <HotelResultCard
              key={result.hotel.id}
              result={result}
              index={index}
              criteria={criteria}
              query={q}
              active={hover === result.hotel.id}
              onHover={setHover}
            />
          ))}
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
