import { LoadingSignal } from "./loading-signal";
import { LoaderCircle } from "lucide-react";

export function RequestState({
  pending,
  error,
  retry,
  page = false,
}: {
  pending?: boolean;
  error?: Error | null | undefined;
  retry?: (() => void) | undefined;
  page?: boolean;
}) {
  if (!error) {
    if (!pending) return null;
    return page ? (
      <LoadingSignal />
    ) : (
      <div
        role="status"
        className="flex items-center justify-center gap-2 p-5 text-sm text-muted-foreground"
      >
        <LoaderCircle
          aria-hidden="true"
          className="h-4 w-4 animate-spin motion-reduce:animate-none"
        />
        Загружаем…
      </div>
    );
  }
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
