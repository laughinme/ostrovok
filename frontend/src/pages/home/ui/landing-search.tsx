import { useEffect, useRef, useState } from "react";
import { useVoiceInput } from "../model/use-voice-input";
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
  const placeholder = useTypingPlaceholder(!query);
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const voice = useVoiceInput((text) => onQuery([query.trim(), text].filter(Boolean).join(", ")));
  return (
    <form
      className="wish"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(placeholder);
      }}
    >
      <div className="wish-surface" aria-hidden="true">
        <span className="wish-surface__top" />
        <span className="wish-surface__bottom" />
        <span className="wish-surface__join" />
      </div>
      <div className="wish-row">
        <button
          type="button"
          className="icon-btn wish-attachment"
          aria-label="Добавить пожелания из текстового файла"
          title="Добавить описание поездки из файла .txt"
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="paperclip" size={20} />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".txt,text/plain"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setFileError(null);
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
          }}
        />
        <textarea
          value={query}
          rows={2}
          maxLength={4000}
          placeholder={placeholder}
          aria-label="Опишите поездку своими словами"
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit(placeholder);
            }
          }}
        />
        {voice.supported && (
          <button
            type="button"
            className="icon-btn wish-mic"
            aria-label={voice.listening ? "Остановить запись" : "Сказать голосом"}
            aria-pressed={voice.listening}
            title={
              voice.listening
                ? "Слушаем. Нажмите, чтобы остановить"
                : "Голосовой ввод средствами браузера"
            }
            onClick={voice.toggle}
          >
            <Icon name="mic" size={20} />
          </button>
        )}
        <button className="btn btn-primary go" type="submit">
          <span>Подобрать</span>
          <Icon name="arrow" size={17} />
        </button>
      </div>
      {(voice.listening || voice.error || fileError) && (
        <p role="status" className="px-4 pb-3 text-sm">
          {voice.listening ? "Слушаем ваше пожелание…" : (voice.error ?? fileError)}
        </p>
      )}
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
