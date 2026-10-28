import { Sparkles } from "lucide-react";
import type { SearchResult } from "../api/research";

export function ResearchOffers({
  search,
  busy,
  onResearch,
}: {
  search: SearchResult;
  busy: boolean;
  onResearch: (chipId: string, title: string) => void;
}) {
  const offers = search.research.flatMap((offer) => {
    const chip = search.intent.chips.find((item) => item.id === offer.chipId);
    return chip && !offer.runId ? [{ ...offer, title: chip.label }] : [];
  });
  if (!offers.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {offers.map((offer) => (
        <div
          key={offer.chipId}
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed bg-card px-4 py-3 text-sm"
        >
          <span>
            Про «{offer.title}» мы пока не знаем у {offer.hotelIds.length}{" "}
            {offer.hotelIds.length === 1 ? "отеля" : "отелей"} из выдачи
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => onResearch(offer.chipId, offer.title)}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> Узнать вживую
          </button>
        </div>
      ))}
    </div>
  );
}
