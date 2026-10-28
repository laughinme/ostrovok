import { LoadingSignal } from "./loading-signal";

export function RequestState({
  pending,
  error,
  retry,
}: {
  pending?: boolean;
  error?: Error | null | undefined;
  retry?: (() => void) | undefined;
}) {
  if (!error) return pending ? <LoadingSignal /> : null;
  return (
    <div className="mx-auto my-6 max-w-3xl rounded-2xl border bg-card p-6" role="alert">
      <p>Не удалось загрузить данные</p>
      <p className="mt-2 break-words text-sm text-muted-foreground">{error.message}</p>
      {retry && (
        <button className="mt-4 rounded-full border px-4 py-2 text-sm" onClick={retry}>
          Попробовать снова
        </button>
      )}
    </div>
  );
}
