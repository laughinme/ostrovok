import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { characteristicLabel, type ApiHotel } from "@/entities/hotel";
import { sessionApi } from "@/entities/session";
import { api, getApiMode, type components } from "@/shared/api";
import { RequestState } from "@/shared/ui";

type Schemas = components["schemas"];
const facadeNames = {
  N: "Север",
  NE: "Северо-восток",
  E: "Восток",
  SE: "Юго-восток",
  S: "Юг",
  SW: "Юго-запад",
  W: "Запад",
  NW: "Северо-запад",
};

export function PartnerManagement({ hotel }: { hotel: ApiHotel }) {
  const [open, setOpen] = useState(false);
  return (
    <section id="partner-management" className="partner-panel scroll-mt-24" data-partner-section>
      <details className="p-5 sm:p-6" onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="list-inside cursor-pointer py-3 text-xl font-semibold">
          Номера, заявки гостей и спрос
        </summary>
        {open && (
          <div className="space-y-8 pt-5">
            <FacadeEditor hotel={hotel} />
            <Requests hotel={hotel} />
            <Demand hotelId={hotel.id} />
            <Notifications hotelId={hotel.id} />
          </div>
        )}
      </details>
    </section>
  );
}

function FacadeEditor({ hotel }: { hotel: ApiHotel }) {
  const client = useQueryClient();
  const [mappings, setMappings] = useState<Schemas["FacadeMappingIn"][]>(() =>
    hotel.rooms.flatMap((room) =>
      room.facades.map((facade) => ({
        roomTypeId: room.id,
        facade,
        floorFrom: room.floors?.[0] ?? 1,
        floorTo: room.floors?.[1] ?? hotel.floors,
      })),
    ),
  );
  const save = useMutation({
    mutationFn: () =>
      sessionApi<Schemas["ChangedFactsOut"]>(`/partner/hotels/${hotel.id}/facades`, {
        method: "PUT",
        body: { mappings },
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["hotels"] }),
        client.invalidateQueries({ queryKey: ["partner"] }),
        client.invalidateQueries({ queryKey: ["search"] }),
        client.invalidateQueries({ queryKey: ["comparison"] }),
      ]);
    },
  });
  const invalid =
    !mappings.length ||
    mappings.some(
      (mapping) =>
        mapping.floorFrom < 1 ||
        mapping.floorTo > hotel.floors ||
        mapping.floorTo < mapping.floorFrom,
    );
  if (!hotel.rooms.length || !hotel.facades.length)
    return (
      <section>
        <h2 className="text-xl">Стороны и этажи номеров</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Категории номеров или стороны здания пока не добавлены. Подтвердить разметку можно после
          их добавления.
        </p>
      </section>
    );
  function change(index: number, patch: Partial<Schemas["FacadeMappingIn"]>) {
    setMappings((current) => current.map((row, at) => (at === index ? { ...row, ...patch } : row)));
    save.reset();
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid) save.mutate();
      }}
    >
      <h2 className="text-xl">Стороны и этажи номеров</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Укажите, какие категории выходят на каждую сторону здания. Сохранение подтверждает разметку
        от имени отеля.
      </p>
      <fieldset disabled={save.isPending} className="mt-4 space-y-3">
        {mappings.map((row, index) => (
          <div key={index} className="flex flex-wrap items-end gap-3 rounded-xl border p-3">
            <label className="grid max-w-full gap-1 text-xs">
              Категория
              <select
                className="min-h-11 max-w-full rounded-lg border px-2"
                value={row.roomTypeId}
                onChange={(event) => change(index, { roomTypeId: event.target.value })}
              >
                {hotel.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              Сторона
              <select
                className="min-h-11 rounded-lg border px-2"
                value={row.facade}
                onChange={(event) =>
                  change(index, { facade: event.target.value as typeof row.facade })
                }
              >
                {hotel.facades.map((facade) => (
                  <option key={facade} value={facade}>
                    {facadeNames[facade]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              С этажа
              <input
                type="number"
                className="min-h-11 w-20 rounded-lg border px-2"
                min={1}
                max={hotel.floors}
                required
                value={row.floorFrom}
                onChange={(event) => change(index, { floorFrom: Number(event.target.value) })}
              />
            </label>
            <label className="grid gap-1 text-xs">
              По этаж
              <input
                type="number"
                className="min-h-11 w-20 rounded-lg border px-2"
                min={row.floorFrom}
                max={hotel.floors}
                required
                value={row.floorTo}
                onChange={(event) => change(index, { floorTo: Number(event.target.value) })}
              />
            </label>
            <button
              type="button"
              className="min-h-11 px-2 text-sm"
              onClick={() => {
                setMappings((current) => current.filter((_, at) => at !== index));
                save.reset();
              }}
              aria-label={`Удалить разметку ${index + 1}`}
            >
              Удалить
            </button>
          </div>
        ))}
        {hotel.rooms.length > 0 && hotel.facades.length > 0 && (
          <button
            type="button"
            className="partner-secondary"
            onClick={() => {
              setMappings((current) => [
                ...current,
                {
                  roomTypeId: hotel.rooms[0]!.id,
                  facade: hotel.facades[0]!,
                  floorFrom: 1,
                  floorTo: hotel.floors,
                },
              ]);
              save.reset();
            }}
          >
            Добавить сторону
          </button>
        )}
        <button className="partner-primary ml-3" type="submit" disabled={invalid || save.isPending}>
          {save.isPending ? "Сохраняем…" : "Подтвердить разметку"}
        </button>
      </fieldset>
      <RequestState error={save.error} />
      {save.isSuccess && (
        <p role="status" className="mt-3 text-sm">
          Разметка сохранена. Знания об отеле обновлены.
        </p>
      )}
    </form>
  );
}

function Requests({ hotel }: { hotel: ApiHotel }) {
  const query = useQuery({
    queryKey: ["partner", hotel.id, "requests"],
    queryFn: () => sessionApi<Schemas["BookingOut"][]>(`/partner/hotels/${hotel.id}/requests`),
    refetchInterval: 10000,
  });
  return (
    <section>
      <h2 className="text-xl">Заявки гостей</h2>
      <RequestState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">Новых заявок пока нет.</p>
      )}
      {query.data?.map((booking) => (
        <BookingDecision key={booking.id} booking={booking} hotel={hotel} />
      ))}
    </section>
  );
}

function BookingDecision({ booking, hotel }: { booking: Schemas["BookingOut"]; hotel: ApiHotel }) {
  const client = useQueryClient();
  const [status, setStatus] = useState<Schemas["DecisionIn"]["status"]>("confirmed");
  const [reply, setReply] = useState("");
  const action = useMutation({
    mutationFn: () =>
      sessionApi<Schemas["BookingOut"]>(`/partner/requests/${booking.id}/decision`, {
        method: "POST",
        body: { status, reply: reply.trim() },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["partner", hotel.id, "requests"] }),
  });
  const labels = {
    requested: "Ожидает ответа",
    confirmed: "Подтверждена",
    alternative_offered: "Предложена альтернатива",
    declined: "Отклонена",
    completed: "Завершена",
  };
  return (
    <article className="mt-4 rounded-xl border p-4">
      <p className="text-sm">
        {booking.checkIn} → {booking.checkOut} ·{" "}
        {hotel.rooms.find((room) => room.id === booking.roomTypeId)?.name ?? "Категория номера"}
      </p>
      <p className="mt-2 text-sm">{booking.request || "Без особых пожеланий"}</p>
      <p className="mt-2 text-sm font-semibold">{labels[booking.status]}</p>
      {booking.hotelReply && <p className="mt-2 text-sm">{booking.hotelReply}</p>}
      {booking.status === "requested" && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            if (reply.trim()) action.mutate();
          }}
        >
          <label className="grid gap-1 text-sm">
            Решение
            <select
              className="min-h-11 rounded-xl border px-3"
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
            >
              <option value="confirmed">Подтвердить</option>
              <option value="alternative_offered">Предложить альтернативу</option>
              <option value="declined">Отклонить</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Ответ гостю
            <textarea
              className="rounded-xl border p-3"
              value={reply}
              rows={3}
              required
              maxLength={4000}
              onChange={(event) => setReply(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="partner-primary"
            disabled={action.isPending || !reply.trim()}
          >
            {action.isPending ? "Отправляем…" : "Отправить решение"}
          </button>
        </form>
      )}
      <RequestState error={action.error} />
    </article>
  );
}

function Demand({ hotelId }: { hotelId: string }) {
  const registry = useQuery({
    queryKey: ["characteristics"],
    queryFn: ({ signal }) => api<Schemas["CharacteristicOut"][]>("/characteristics", { signal }),
    enabled: getApiMode() !== "demo",
  });
  const query = useQuery({
    queryKey: ["partner", hotelId, "demand"],
    queryFn: () => sessionApi<Schemas["DemandOut"]>(`/partner/hotels/${hotelId}/demand`),
  });
  return (
    <section>
      <h2 className="text-xl">Что ищут гости</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Пожелания за последние 7 дней в районе{" "}
        {(
          {
            center: "центр Сочи",
            khosta: "Хоста",
            adler: "Адлер",
            sirius: "Сириус",
            krasnaya_polyana: "Красная Поляна",
          } as Record<string, string>
        )[query.data?.district ?? ""] ??
          query.data?.district ??
          "отеля"}
        .
      </p>
      <RequestState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.items.length === 0 && (
        <p className="mt-3 text-sm">За этот период запросов пока нет.</p>
      )}
      <ul className="mt-3 space-y-2">
        {query.data?.items.map((item) => (
          <li key={item.characteristic} className="flex justify-between gap-3 text-sm">
            <span>
              {registry.data?.find((entry) => entry.key === item.characteristic)?.title ??
                characteristicLabel(item.characteristic)}
            </span>
            <b>{item.count}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Notifications({ hotelId }: { hotelId: string }) {
  const query = useQuery({
    queryKey: ["partner", hotelId, "notifications"],
    queryFn: () =>
      sessionApi<Schemas["NotificationOut"][]>(`/partner/hotels/${hotelId}/notifications`),
  });
  return (
    <section>
      <h2 className="text-xl">Уведомления об отеле</h2>
      <RequestState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.length === 0 && <p className="mt-3 text-sm">Новых уведомлений нет.</p>}
      {query.data?.map((notification) => (
        <article key={notification.id} className="mt-3 rounded-xl border p-4">
          <h3>{notification.title}</h3>
          <p className="mt-2 text-sm">{notification.body}</p>
          <time className="mt-2 block text-xs text-muted-foreground" dateTime={notification.at}>
            {new Date(notification.at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}
          </time>
        </article>
      ))}
    </section>
  );
}
