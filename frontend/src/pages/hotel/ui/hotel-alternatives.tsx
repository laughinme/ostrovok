import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type ApiIntent, type Hotel } from "@/entities/hotel";
import { api, type components } from "@/shared/api";
import { RequestState } from "@/shared/ui";

type Schemas = components["schemas"];
const changes = [
  ["quieter", "Тише"],
  ["cheaper", "Дешевле"],
  ["closer_to_beach", "Ближе к пляжу"],
] as const;

export function HotelAlternatives({
  hotel,
  intent,
}: {
  hotel: Hotel;
  intent?: ApiIntent | undefined;
}) {
  const navigate = useNavigate();
  const alternatives = useMutation({
    mutationFn: (change: Schemas["Improvement"]) =>
      api<Schemas["SimilarOut"]>(`/hotels/${encodeURIComponent(hotel.id)}/similar`, {
        method: "POST",
        body: {
          change,
          chips: intent?.chips ?? [],
          trip: intent?.trip ?? hotel.searchContext?.trip ?? {},
        },
      }),
  });
  const select = useMutation({
    mutationFn: () =>
      api<Schemas["SearchResultOut"]>("/searches", {
        method: "POST",
        body: {
          chips: alternatives.data?.intent.chips,
          trip: alternatives.data?.intent.trip,
          useProfile: false,
        },
      }),
  });
  return (
    <aside className="mx-auto mb-12 max-w-7xl px-4 sm:px-6" aria-label="Похожие отели">
      <div className="rounded-3xl border bg-card p-5 sm:p-8">
        <h2 className="text-2xl">Как этот, но…</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Сохраним пожелания и найдём варианты с нужным отличием.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {changes.map(([change, title]) => (
            <button
              type="button"
              key={change}
              className="min-h-11 rounded-full border px-5 py-2 text-sm disabled:opacity-50"
              disabled={alternatives.isPending}
              aria-pressed={alternatives.variables === change && alternatives.isSuccess}
              onClick={() => alternatives.mutate(change)}
            >
              {title}
            </button>
          ))}
        </div>
        <RequestState
          pending={alternatives.isPending}
          error={alternatives.error ?? select.error}
          retry={() => {
            if (alternatives.variables) alternatives.mutate(alternatives.variables);
          }}
        />
        {alternatives.data && (
          <>
            {alternatives.data.caveats.map((line) => (
              <p key={line} className="mt-3 text-sm text-muted-foreground">
                {line}
              </p>
            ))}
            {!alternatives.data.matches.length && (
              <p className="mt-5 text-sm">
                Более подходящих вариантов пока не нашли. Попробуйте другое отличие.
              </p>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {alternatives.data.matches.slice(0, 3).map((match) => (
                <article className="rounded-2xl border p-4" key={match.hotelId}>
                  <h3 className="text-lg">{match.name}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">{match.area}</p>
                  <p className="mt-3 text-sm">{match.tradeoff}</p>
                  {match.recommendation?.scopeText && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {match.recommendation.scopeText}
                    </p>
                  )}
                  <button
                    type="button"
                    className="mt-4 min-h-11 rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
                    disabled={select.isPending}
                    onClick={async () => {
                      const search = await select.mutateAsync().catch(() => null);
                      if (search)
                        void navigate({
                          to: "/hotel/$id",
                          params: { id: match.hotelId },
                          search: {
                            sid: search.searchId,
                            q: alternatives.data?.intent.text ?? undefined,
                          },
                        });
                    }}
                  >
                    Посмотреть отель
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
