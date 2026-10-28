import { useEffect, useState } from "react";
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
          aria-label="Прикрепить файл"
          title="Прикрепить файл"
        >
          <Icon name="paperclip" size={20} />
        </button>
        <textarea
          value={query}
          rows={2}
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
        <button
          type="button"
          className="icon-btn wish-mic"
          aria-label="Сказать голосом"
          title="Голосовой ввод"
        >
          <Icon name="mic" size={20} />
        </button>
        <button className="btn btn-primary go" type="submit">
          <span>Подобрать</span>
          <Icon name="arrow" size={17} />
        </button>
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
