import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export function DevelopersIntroInfo() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 16 });
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <span
      ref={root}
      className="developers-intro-info"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label="О платформе знаний об отелях"
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        onClick={() => {
          const rect = root.current?.getBoundingClientRect();
          if (rect) {
            const width = Math.min(420, window.innerWidth - 32);
            setPosition({ top: rect.bottom + 8, left: Math.max(16, rect.right - width) });
          }
          setOpen((value) => !value);
        }}
      >
        <Info size={20} aria-hidden="true" />
      </button>
      {open && (
        <span className="developers-intro-tooltip" style={position} id={id} role="tooltip">
          Всё, что видит гость, доступно другим системам Островка и внешним AI-агентам: поиск
          словами, факты по сторонам и этажам с доказательствами, сравнение. Один и тот же слой
          знаний - для сайта, приложения, чат-бота и голосового ассистента.
        </span>
      )}
    </span>
  );
}
