import { useEffect, useRef, useState } from "react";
import { usePhotoInput, useVoiceInput } from "@/features/query-input";
import { EXAMPLES, QUICK_TAGS } from "../model/catalog";
import type { IntentChip } from "../model/types";
import { Icon } from "./landing-ui";
import "./landing-search.css";

function useTypingPlaceholder(active: boolean) {
  const [text, setText] = useState(EXAMPLES[0]!);
  useEffect(() => {
    if (!active || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let index = 0;
    let length = 0;
    let typing = true;
    let timer = 0;
    const tick = () => {
      const example = EXAMPLES[index]!;
      if (typing) {
        length++;
        setText(example.slice(0, length));
        if (length >= example.length) {
          typing = false;
          timer = window.setTimeout(tick, 1800);
          return;
        }
      } else {
        length = Math.max(0, length - 3);
        setText(example.slice(0, length));
        if (length === 0) {
          typing = true;
          index = (index + 1) % EXAMPLES.length;
        }
      }
      timer = window.setTimeout(tick, typing ? 38 : 14);
    };
    timer = window.setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [active]);
  return text;
}

export function LandingSearch({
  query,
  onQuery,
  chips,
  onChips,
  onSubmit,
}: {
  query: string;
  onQuery(value: string): void;
  chips: IntentChip[];
  onChips(value: IntentChip[]): void;
  onSubmit(placeholder: string): void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const photo = usePhotoInput(onQuery);
  const voice = useVoiceInput(query, onQuery);
  const busy = photo.status === "loading";
  const placeholder = useTypingPlaceholder(!query && !voice.listening);
  return (
    <form
      className="wish"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        voice.cancel();
        onSubmit(placeholder);
      }}
    >
      <div className="wish-surface" aria-hidden="true">
        <span className="wish-surface__top" />
        <span className="wish-surface__bottom" />
        <span className="wish-surface__join" />
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,.txt,text/plain"
        hidden
        aria-label="Фото желаемого отдыха или описание в файле .txt"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          voice.cancel();
          setFileError(null);
          if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
            photo.clear();
            if (file.size > 32000) {
              setFileError("Выберите текстовый файл не больше 32 КБ.");
              return;
            }
            try {
              const text = (await file.text()).trim();
              if (!text) {
                setFileError("Файл пуст. Добавьте описание поездки.");
                return;
              }
              onQuery([query.trim(), text].filter(Boolean).join("\n").slice(0, 4000));
            } catch {
              setFileError("Не удалось прочитать файл.");
            }
            return;
          }
          void photo.select(file);
        }}
      />
      <div className="wish-row">
        <button
          type="button"
          className="icon-btn wish-attachment"
          aria-label="Хочу как на этом фото"
          title="Фото JPG, PNG или WebP до 5 МБ или описание поездки .txt до 32 КБ"
          aria-busy={busy}
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="paperclip" size={20} />
        </button>
        <textarea
          value={query}
          rows={2}
          maxLength={4000}
          placeholder={placeholder}
          aria-label="Опишите поездку своими словами"
          aria-describedby="wish-input-status"
          onChange={(event) => {
            voice.cancel();
            photo.clear();
            setFileError(null);
            onQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (busy) return;
              voice.cancel();
              onSubmit(placeholder);
            }
          }}
        />
        {voice.supported && (
          <button
            type="button"
            className="icon-btn wish-mic"
            aria-pressed={voice.listening}
            disabled={busy}
            onClick={() => {
              photo.clear();
              setFileError(null);
              voice.toggle();
            }}
            aria-label={voice.listening ? "Остановить голосовой ввод" : "Сказать голосом"}
            title={voice.listening ? "Остановить голосовой ввод" : "Голосовой ввод"}
          >
            <Icon name="mic" size={20} />
          </button>
        )}
        <button className="btn btn-primary go" type="submit" disabled={busy}>
          <span>Подобрать</span>
          <Icon name="arrow" size={17} />
        </button>
      </div>
      <div id="wish-input-status" className="wish-input-status">
        {fileError && (
          <p className="wish-status" role="alert">
            {fileError}
          </p>
        )}
        {(voice.listening || voice.error) && (
          <p className="wish-status" role={voice.error ? "alert" : "status"}>
            {voice.listening ? "Слушаю… Нажмите на микрофон, чтобы закончить." : voice.error}
          </p>
        )}
        {photo.status !== "idle" && (
          <div className="wish-photo">
            {photo.preview && (
              <img src={photo.preview} width={48} height={48} alt="Прикреплённое фото" />
            )}
            <p role={photo.status === "error" ? "alert" : "status"}>{photo.message}</p>
            <button type="button" className="wish-photo-clear" onClick={photo.clear}>
              {busy ? "Отменить" : "Убрать фото"}
            </button>
          </div>
        )}
      </div>
      <div className="wish-tools">
        {QUICK_TAGS.map((tag) => {
          const selected = chips.some((chip) => chip.key === tag.key);
          return (
            <button
              key={tag.key}
              type="button"
              className={`qt${selected ? " on" : ""}`}
              aria-pressed={selected}
              onClick={() =>
                onChips(
                  selected
                    ? chips.filter((chip) => chip.key !== tag.key)
                    : [...chips, { key: tag.key, importance: "must" }],
                )
              }
            >
              <Icon name={tag.icon} size={15} />
              {tag.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}
