import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { catalogQuery, hotelFromApi, Price } from "@/entities/hotel";
import { FavoriteButton, useFavoriteHotels } from "@/features/favorite-hotels";
import { RequestState } from "@/shared/ui";

export function FavoritesPage() {
  const ids = useFavoriteHotels((state) => state.ids);
  const query = useQuery({ ...catalogQuery, enabled: ids.length > 0 });
  useEffect(() => {
    void useFavoriteHotels.persist.rehydrate();
  }, []);
  const hotels =
    query.data?.filter((hotel) => ids.includes(hotel.id)).map((hotel) => hotelFromApi(hotel)) ?? [];
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl sm:text-4xl">Избранные отели</h1>
      <p className="mt-3 text-muted-foreground">
        Список сохранён в этом браузере. У демо-режима отдельное избранное.
      </p>
      {ids.length > 0 && (
        <RequestState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
      )}
      {ids.length === 0 && (
        <section className="mt-8 rounded-3xl border bg-card p-8">
          <h2 className="text-xl">Пока ничего не сохранено</h2>
          <p className="mt-3 text-muted-foreground">Нажмите на сердце у понравившегося отеля.</p>
          <Link
            to="/results"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 py-3 text-primary-foreground"
          >
            Подобрать отель
          </Link>
        </section>
      )}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {hotels.map((hotel) => (
          <article key={hotel.id} className="relative overflow-hidden rounded-2xl border bg-card">
            <Link to="/hotel/$id" params={{ id: hotel.id }}>
              <img
                src={hotel.image}
                alt=""
                className="aspect-[4/3] w-full object-cover"
                width={480}
                height={360}
              />
              <div className="p-5">
                <h2 className="text-lg">{hotel.name}</h2>
                <p className="my-3 text-sm text-muted-foreground">{hotel.district}</p>
                <Price value={hotel.price} suffix="демо · за ночь" />
              </div>
            </Link>
            <FavoriteButton hotelId={hotel.id} className="absolute right-3 top-3" />
          </article>
        ))}
      </div>
      {ids.length > hotels.length && query.isSuccess && (
        <p className="mt-5 text-sm text-muted-foreground">
          Некоторые сохранённые отели больше не представлены в каталоге.
        </p>
      )}
    </main>
  );
}
