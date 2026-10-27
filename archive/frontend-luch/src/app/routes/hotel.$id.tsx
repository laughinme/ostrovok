import { getHotel, type Hotel } from "@/entities/hotel";
import { HotelPage } from "@/pages/hotel";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
export const Route = createFileRoute("/hotel/$id")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
  }),
  loader: ({ params }): { hotel: Hotel } => {
    const hotel = getHotel(params.id);
    if (!hotel) throw notFound();
    return { hotel };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.hotel.name} — Луч` },
          { name: "description", content: loaderData.hotel.tagline },
          { property: "og:title", content: `${loaderData.hotel.name} — Луч` },
          { property: "og:description", content: loaderData.hotel.tagline },
          { property: "og:image", content: loaderData.hotel.image },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: loaderData.hotel.image },
        ]
      : [{ title: "Отель не найден — Луч" }, { name: "robots", content: "noindex" }],
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
  return <HotelPage hotel={hotel} query={q} />;
}
