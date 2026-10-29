import { cn } from "@/shared/lib";
import { ArrowLeft, ArrowRight, Images, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const [full, setFull] = useState(false);
  const n = images.length;

  const go = useCallback((d: number) => setIdx((v) => (v + d + n) % n), [n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const swipe = (() => {
    let x = 0;
    return {
      onPointerDown: (e: React.PointerEvent) => {
        x = e.clientX;
      },
      onPointerUp: (e: React.PointerEvent) => {
        const dx = e.clientX - x;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      },
    };
  })();

  const frame = (
    <div className="relative overflow-hidden rounded-3xl bg-muted" {...swipe}>
      <img
        src={images[idx]}
        alt={`${name} - фото ${idx + 1}`}
        width={1024}
        height={768}
        className="h-full w-full object-cover"
      />
      <span className="absolute right-3 bottom-3 rounded-full bg-night/70 px-3 py-1 font-mono text-xs text-night-foreground backdrop-blur">
        {idx + 1} / {n}
      </span>
      {n > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Предыдущее фото"
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card/85 text-foreground shadow-soft backdrop-blur transition hover:bg-card"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Следующее фото"
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card/85 text-foreground shadow-soft backdrop-blur transition hover:bg-card"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </>
      )}
      <button
        onClick={() => setFull(true)}
        className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/85 px-3 py-1.5 text-xs font-medium text-foreground shadow-soft backdrop-blur transition hover:bg-card"
      >
        <Images className="h-3.5 w-3.5" /> Все фото
      </button>
    </div>
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_128px]">
        <div className="aspect-[16/10]">{frame}</div>
        <div className="flex gap-3 overflow-x-auto sm:flex-col sm:overflow-visible">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setIdx(i)}
              aria-label={`Открыть фото ${i + 1}`}
              className={cn(
                "relative h-20 w-28 shrink-0 overflow-hidden rounded-2xl border-2 transition sm:h-[76px] sm:w-full",
                i === idx ? "border-coral" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                width={1024}
                height={768}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {full && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-night/95 p-4 backdrop-blur-sm sm:p-8">
          <div className="flex items-center justify-between text-night-foreground">
            <p className="font-display text-lg">{name}</p>
            <button
              onClick={() => setFull(false)}
              aria-label="Закрыть галерею"
              className="grid h-10 w-10 place-items-center rounded-full bg-night-foreground/10 transition hover:bg-night-foreground/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative mt-4 flex min-h-0 flex-1 items-center justify-center" {...swipe}>
            <img
              src={images[idx]}
              alt={`${name} - фото ${idx + 1}`}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
            {n > 1 && (
              <>
                <button
                  onClick={() => go(-1)}
                  aria-label="Предыдущее фото"
                  className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-night-foreground/15 text-night-foreground transition hover:bg-night-foreground/25"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => go(1)}
                  aria-label="Следующее фото"
                  className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-night-foreground/15 text-night-foreground transition hover:bg-night-foreground/25"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <button
                key={src}
                onClick={() => setIdx(i)}
                className={cn(
                  "h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition",
                  i === idx ? "border-sun" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
