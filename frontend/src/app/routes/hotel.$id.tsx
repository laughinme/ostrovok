import { hotelQuery, hotelFromApi, type Hotel } from "@/entities/hotel";
import { api, ApiError, type components } from "@/shared/api";
import { HotelPage, HotelAlternatives } from "@/pages/hotel";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

function storedSearchQuery(id: string | undefined) {
  return {
    queryKey: ["stored-search", id],
    enabled: !!id,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      if (!id) return null;
      try {
        return await api<components["schemas"]["SearchResultOut"]>(
          `/searches/${encodeURIComponent(id)}`,
          { signal },
        );
      } catch (error) {
        if (error instanceof ApiError && [404, 422].includes(error.status)) return null;
        throw error;
      }
    },
  };
}

function withSearch(
  hotel: Hotel,
  search: components["schemas"]["SearchResultOut"] | null | undefined,
) {
  if (!search || !hotel.backend) return hotel;
  const match = search.matches.find((item) => item.hotelId === hotel.id);
  return {
    ...hotelFromApi(hotel.backend, match, search.intent),
    searchContext: { id: search.searchId, trip: search.intent.trip },
  };
}

export const Route = createFileRoute("/hotel/$id")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { q?: string | undefined; sid?: string | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sid: typeof s["sid"] === "string" ? s["sid"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ sid: search.sid }),
  loader: async ({ params, context, deps }) => {
    try {
      const hotel = await context.queryClient.ensureQueryData({
        ...hotelQuery(params.id),
        revalidateIfStale: true,
      });
      if (!deps.sid || !hotel.backend) return { hotel };
      const search = await context.queryClient.ensureQueryData({
        ...storedSearchQuery(deps.sid),
        revalidateIfStale: true,
      });
      return { hotel: withSearch(hotel, search) };
    } catch (error) {
      if (error instanceof ApiError && [404, 422].includes(error.status)) throw notFound();
      throw error;
    }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.hotel.name} — О!кно` },
          { name: "description", content: loaderData.hotel.tagline },
          { property: "og:title", content: `${loaderData.hotel.name} — О!кно` },
          { property: "og:description", content: loaderData.hotel.tagline },
          { property: "og:image", content: loaderData.hotel.image },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: loaderData.hotel.image },
        ]
      : [{ title: "Отель не найден — О!кно" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="p-20 text-center">
      Такого отеля нет.{" "}
      <Link to="/results" className="text-coral">
        К списку
      </Link>
    </div>
  ),
  component: PageRoute,
});
function PageRoute() {
  const loaded = Route.useLoaderData();
  const { id } = Route.useParams();
  const { q, sid } = Route.useSearch();
  const hotel = useQuery(hotelQuery(id)).data ?? loaded.hotel;
  const search = useQuery(storedSearchQuery(sid)).data;
  const resolved = useMemo(() => withSearch(hotel, search), [hotel, search]);
  return (
    <>
      <HotelPage key={hotel.id} hotel={resolved} query={q} />
      <HotelAlternatives key={`similar-${hotel.id}`} hotel={resolved} intent={search?.intent} />
    </>
  );
}
