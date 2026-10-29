import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { characteristicLabel, CRITERIA, criterionKeys, type Criterion } from "@/entities/hotel";
import { sessionApi } from "@/entities/session";
import type { components } from "@/shared/api";
import { RequestState } from "@/shared/ui";
import { AccountCard } from "./account-card";

type Profile = components["schemas"]["TasteProfileOut"];
type Patch = components["schemas"]["TastePatch"];

export function ProfilePage() {
  const client = useQueryClient();
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Patch | null>(null);
  const query = useQuery({ queryKey: ["taste"], queryFn: () => sessionApi<Profile>("/me/taste") });
  const change = useMutation({
    onMutate: (variables) => {
      const previous = client.getQueryData<Profile>(["taste"]);
      if (previous && variables.patch) {
        const patch = variables.patch;
        client.setQueryData<Profile>(["taste"], {
          ...previous,
          enabled: patch.enabled ?? previous.enabled,
          weights: patch.weights
            ? [
                ...previous.weights.filter(
                  (weight) =>
                    !patch.weights!.some((item) => item.characteristic === weight.characteristic),
                ),
                ...patch.weights.map((weight) => ({ ...weight, because: "Вы задали этот вес" })),
              ]
            : previous.weights,
        });
      }
      return previous;
    },
    onError: (_, __, previous) => {
      if (previous) client.setQueryData(["taste"], previous);
      setPreview(null);
    },
    mutationFn: ({ reset, patch }: { reset?: boolean; patch?: Patch }) =>
      sessionApi<Profile | void>("/me/taste", {
        method: reset ? "DELETE" : "PATCH",
        ...(patch ? { body: patch } : {}),
      }),
    onSuccess: async (profile, variables) => {
      setMessage(
        variables.reset
          ? "Предпочтения удалены. Персонализация выключена."
          : "Предпочтения сохранены.",
      );
      client.setQueryData<Profile>(
        ["taste"],
        profile ?? { enabled: false, summary: [], weights: [] },
      );
      setPreview(null);
      await client.invalidateQueries({ queryKey: ["search"] });
    },
  });
  const data =
    query.data && preview
      ? {
          ...query.data,
          enabled: preview.enabled ?? query.data.enabled,
          weights: preview.weights
            ? [
                ...query.data.weights.filter(
                  (weight) =>
                    !preview.weights!.some((item) => item.characteristic === weight.characteristic),
                ),
                ...preview.weights.map((weight) => ({ ...weight, because: "Вы задали этот вес" })),
              ]
            : query.data.weights,
        }
      : query.data;
  function savePatch(patch: Patch) {
    setPreview(patch);
    setMessage("");
    change.mutate({ patch });
  }
  const weights = [
    ...new Set([
      ...Object.values(criterionKeys),
      ...(data?.weights.map((weight) => weight.characteristic) ?? []),
    ]),
  ];
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <AccountCard />
      <h1 className="mt-10 text-3xl sm:text-4xl">Ваш профиль вкуса</h1>
      <p className="mt-4 text-muted-foreground">
        Предпочтения из ваших поисков и ответов. Их можно изменить или удалить. Явные пожелания в
        новом запросе всегда важнее профиля.
      </p>
      <RequestState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {data && (
        <>
          <label className="mt-6 flex min-h-11 items-center gap-3 rounded-2xl border bg-card p-4">
            <input
              type="checkbox"
              checked={data.enabled}
              disabled={change.isPending}
              onChange={(event) => savePatch({ enabled: event.target.checked })}
            />
            Учитывать профиль при подборе
          </label>
          {data.summary.length > 0 ? (
            <ul className="mt-5 list-disc space-y-2 pl-5">
              {data.summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-muted-foreground">
              Пока мало данных о ваших предпочтениях. Задайте важность вручную или начните с поиска.
            </p>
          )}
          <section
            className="mt-6 rounded-2xl border bg-card p-5"
            aria-label="Важность предпочтений"
          >
            {weights.map((key) => {
              const weight = data.weights.find((item) => item.characteristic === key);
              const criterion = (Object.keys(criterionKeys) as Criterion[]).find(
                (item) => criterionKeys[item] === key,
              );
              const label = criterion ? CRITERIA[criterion].label : characteristicLabel(key);
              return (
                <label
                  className="flex flex-col gap-2 border-b py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  key={key}
                >
                  <span>
                    {label}
                    {weight?.because && (
                      <small className="mt-1 block max-w-md text-xs text-muted-foreground">
                        {weight.because}
                      </small>
                    )}
                  </span>
                  <select
                    className="min-h-11 rounded-xl border bg-card px-3"
                    aria-label={`Важность: ${label}`}
                    value={weight?.weight ?? 0}
                    disabled={change.isPending}
                    onChange={(event) =>
                      savePatch({
                        weights: [{ characteristic: key, weight: Number(event.target.value) }],
                      })
                    }
                  >
                    <option value={0}>Не учитывать</option>
                    <option value={1}>Желательно</option>
                    <option value={2}>Важно</option>
                    <option value={3}>Очень важно</option>
                    {weight && ![0, 1, 2, 3].includes(weight.weight) && (
                      <option value={weight.weight}>По истории: {weight.weight.toFixed(1)}</option>
                    )}
                  </select>
                </label>
              );
            })}
          </section>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 py-3 text-primary-foreground"
            >
              Подобрать отель
            </Link>
            <button
              type="button"
              className="min-h-11 rounded-full border px-5 py-3"
              disabled={change.isPending}
              onClick={() => change.mutate({ reset: true })}
            >
              Удалить предпочтения
            </button>
          </div>
        </>
      )}
      <RequestState error={change.error} />
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </main>
  );
}
