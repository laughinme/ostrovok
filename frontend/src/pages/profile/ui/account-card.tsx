import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sessionApi, signOut, useSession } from "@/entities/session";
import type { components } from "@/shared/api";

type TripSummary = components["schemas"]["TripSummaryOut"];

export function AccountCard() {
  const account = useSession((state) => state.account);
  const client = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const trips = useQuery({
    queryKey: ["me", "trips", "count"],
    queryFn: () => sessionApi<TripSummary[]>("/me/trips"),
  });
  if (!account) return null;
  const name = account.username || account.email.split("@")[0] || account.email;
  return (
    <section
      aria-label="Аккаунт"
      className="flex flex-col gap-5 rounded-3xl border bg-card p-6 sm:flex-row sm:items-center"
    >
      <span
        aria-hidden="true"
        className="grid size-16 flex-none place-items-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground"
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-semibold break-words">{name}</p>
        <p className="mt-1 text-sm break-words text-muted-foreground">{account.email}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Гость
          {account.persona ? " · тестовый аккаунт, его видят все, кто в него входит" : ""}
          {trips.data ? ` · поездок: ${trips.data.length}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/trips"
          className="inline-flex min-h-11 items-center rounded-full border px-5 py-3"
        >
          Мои поездки
        </Link>
        <button
          type="button"
          disabled={leaving}
          className="min-h-11 rounded-full border px-5 py-3"
          onClick={async () => {
            setLeaving(true);
            try {
              await client.cancelQueries();
              await signOut();
              client.clear();
              window.location.assign("/");
            } catch {
              setLeaving(false);
            }
          }}
        >
          {leaving ? "Выходим…" : "Выйти"}
        </button>
      </div>
    </section>
  );
}
