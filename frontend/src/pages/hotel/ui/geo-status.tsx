import { ApiError } from "@/shared/api";

export function GeoStatus({
  pending,
  error,
  retry,
  available = true,
}: {
  pending: boolean;
  error: Error | null;
  retry(): unknown;
  available?: boolean;
}) {
  if (!available) return <p className="geo-status">Нет данных для расчёта</p>;
  if (error)
    return (
      <div className="geo-status" role="alert">
        <p>
          {error instanceof ApiError && [404, 422, 503].includes(error.status)
            ? "Нет данных"
            : "Не удалось загрузить расчёт"}
          . {error.message}
        </p>
        <button
          className="link"
          onClick={() => {
            void retry();
          }}
        >
          Повторить
        </button>
      </div>
    );
  return pending ? (
    <p className="geo-status" role="status">
      Загружаем расчёт…
    </p>
  ) : null;
}

export function GeoNotes({ attribution, caveats }: { attribution?: string; caveats: string[] }) {
  return (
    <div className="attrib geo-notes">
      {caveats.map((text) => (
        <p key={text}>{text}</p>
      ))}
      {attribution && <p>{attribution}</p>}
    </div>
  );
}
