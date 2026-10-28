import { hotelQuery, hotelFromApi } from "@/entities/hotel";
import { api, ApiError, type components } from "@/shared/api";
import { HotelPage } from "@/pages/hotel";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
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
      const hotel = await context.queryClient.ensureQueryData(hotelQuery(params.id));
      if (!deps.sid || !hotel.backend) return { hotel };
      const search = await context.queryClient
        .fetchQuery({
          queryKey: ["stored-search", deps.sid],
          queryFn: ({ signal }) =>
            api<components["schemas"]["SearchResultOut"]>(
              `/searches/${encodeURIComponent(deps.sid!)}`,
              { signal },
            ),
          staleTime: 30000,
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError && [404, 422].includes(error.status)) return null;
          throw error;
        });
      if (!search) return { hotel };
      const match = search.matches.find((item) => item.hotelId === hotel.id);
      return {
        hotel: {
          ...hotelFromApi(hotel.backend, match, search.intent),
          searchContext: { id: search.searchId, trip: search.intent.trip },
        },
      };
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
  const { hotel } = Route.useLoaderData();
  const { q } = Route.useSearch();
  return <HotelPage key={hotel.id} hotel={hotel} query={q} />;
}
