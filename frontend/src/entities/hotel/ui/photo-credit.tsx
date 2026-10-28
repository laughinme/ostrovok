import { cn } from "@/shared/lib";
import { photoInfo } from "../model/photos";

export function PhotoCredit({
  src,
  compact = false,
  className,
}: {
  src: string | undefined;
  compact?: boolean;
  className?: string;
}) {
  const photo = photoInfo(src);
  if (!photo) return null;
  const info =
    photo.kind === "ai"
      ? "Вымышленная сцена: не фотография этого отеля, номера или вида из окна"
      : `${photo.title} · ${photo.author} · ${photo.license} · ${photo.capturedAt} · ${photo.changes}`;
  return (
    <span className={cn("photo-credit", className)} title={info}>
      <a
        href={photo.page}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {photo.label}
        {!compact && photo.kind === "photo" && ` · ${photo.author}`}
      </a>
      {photo.kind === "photo" && (
        <>
          {" · "}
          <a
            href={photo.licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {compact ? "Лицензия" : photo.license}
          </a>
        </>
      )}
      {!compact && photo.kind === "ai" && <span> · {info}</span>}
    </span>
  );
}
