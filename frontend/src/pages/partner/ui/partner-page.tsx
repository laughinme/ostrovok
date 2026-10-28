import { StatusPill } from "@/entities/hotel";
import { useHotelProfile } from "@/features/manage-hotel-profile";
import { getApiMode } from "@/shared/api";
import { RequestState } from "@/shared/ui";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  History,
  Info,
  MapPin,
  MessageCircle,
  Pencil,
  Search,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./partner-page.css";

type Profile = ReturnType<typeof useHotelProfile>;
type Section = "questions" | "facts" | "history";

export function PartnerPage() {
  const profile = useHotelProfile();
  const [questionFilter, setQuestionFilter] = useState("open");
  const [section, setSection] = useState<Section>("questions");
  const { hotel, pending, error, retry } = profile;
  const open = profile.qs.filter((question) => !question.done);
  const toSection = (next: Section) => setSection(next);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setSection(visible.target.id.replace("partner-", "") as Section);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    document
      .querySelectorAll("[data-partner-section]")
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pending, error]);

  if (!hotel || pending || error)
    return <RequestState pending={pending} error={error} retry={retry} />;

  return (
    <main className="partner-page">
      <div className="partner-shell">
        <aside className="partner-rail" aria-label="Навигация по кабинету">
          <div className="partner-property">
            <img src={hotel.image} alt="" width={216} height={132} />
            <span className="partner-property-label">Ваш отель</span>
            <h2>{hotel.name}</h2>
            <p>
              <MapPin size={14} />
              {hotel.address || hotel.district}
            </p>
          </div>
          <nav className="partner-nav" aria-label="Разделы кабинета">
            {(
              [
                ["questions", "Вопросы гостей", MessageCircle, open.length],
                ["facts", "Факты об отеле", ClipboardList, profile.facts.length],
                ["history", "История изменений", History, profile.history.length],
              ] as const
            ).map(([id, label, Icon, count]) => (
              <a
                key={id}
                href={`#partner-${id}`}
                onClick={() => toSection(id)}
                aria-current={section === id ? "location" : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
                {count > 0 && <b>{count}</b>}
              </a>
            ))}
          </nav>
          <div className="partner-completeness">
            <div>
              <span>Полнота профиля</span>
              <b>{profile.coverage}%</b>
            </div>
            <progress value={profile.coverage} max={100} aria-label="Полнота профиля" />
            <p>
              Известно {profile.coverageKnown} из {profile.coverageTotal} характеристик. Ваши ответы
              помогут узнать больше.
            </p>
            <a href="#partner-facts" onClick={() => toSection("facts")}>
              Проверить факты
              <ArrowRight size={15} />
            </a>
          </div>
          <p className="partner-mode-note">
            <Info size={15} />
            {getApiMode() === "demo"
              ? "Демо-кабинет. Изменения сохраняются только в этом браузере."
              : "Ваши ответы сохраняются в профиле отеля с указанием источника."}
          </p>
        </aside>

        <div className="partner-content">
          <header className="partner-heading">
            <div>
              <p>Управление информацией</p>
              <h1>Кабинет отельера</h1>
            </div>
            <span>
              <ShieldCheck size={16} />
              Подтверждено вами: {profile.confirmed}
            </span>
          </header>

          <section
            className={`partner-next-step${open.length === 0 ? " is-complete" : ""}`}
            aria-label="Следующий шаг"
          >
            <div className="partner-next-icon">
              {open.length ? <MessageCircle size={29} /> : <CircleCheck size={29} />}
            </div>
            <div>
              <h2>{open.length ? "Гостям важны ваши ответы" : "Вы ответили на все вопросы"}</h2>
              <p>
                {open.length
                  ? "Уточните детали, которые помогут выбрать ваш отель."
                  : "Спасибо! Проверьте факты, чтобы гости знали, чего ожидать."}
              </p>
            </div>
            <button
              type="button"
              className="partner-primary"
              onClick={() => {
                document
                  .getElementById(open.length ? "partner-questions" : "partner-facts")
                  ?.scrollIntoView({ block: "start", behavior: "instant" });
                if (open[0]) {
                  setQuestionFilter("open");
                  profile.selectQuestion(open[0].id);
                }
                toSection(open.length ? "questions" : "facts");
              }}
            >
              {open.length ? "Ответить на вопросы" : "Проверить факты"}
              <ArrowRight size={17} />
            </button>
          </section>

          {profile.conflicts.length > 0 && (
            <section className="partner-conflicts" role="status">
              <Info size={21} />
              <div>
                <h2>Есть расхождения — нужна ваша проверка</h2>
                {profile.conflicts.map((conflict) => (
                  <p key={conflict.id}>{conflict.resolution || conflict.rule}</p>
                ))}
              </div>
            </section>
          )}

          <PartnerQuestions
            profile={profile}
            filter={questionFilter}
            setFilter={setQuestionFilter}
          />
          <PartnerFacts profile={profile} />
          <section
            id="partner-history"
            className="partner-panel partner-history"
            data-partner-section
          >
            <div className="partner-section-heading">
              <div>
                <h2>
                  <History size={21} />
                  История изменений
                </h2>
                <p>Ваши ответы и подтверждения в этой сессии.</p>
              </div>
            </div>
            {profile.history.length ? (
              <ol>
                {profile.history.map((item, index) => (
                  <li key={index}>
                    <CircleCheck size={17} />
                    <div>
                      <p>{item.text}</p>
                      <span>{item.t}</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="partner-empty">
                <History size={23} />
                <div>
                  <h3>Пока без изменений</h3>
                  <p>Ответьте на вопрос или подтвердите факт — действие появится здесь.</p>
                </div>
              </div>
            )}
          </section>
          <p className="partner-footer">
            <ShieldCheck size={15} />
            Точные детали сегодня — довольные гости после поездки.
          </p>
        </div>
      </div>
    </main>
  );
}

function PartnerQuestions({
  profile,
  filter,
  setFilter,
}: {
  profile: Profile;
  filter: string;
  setFilter: (filter: string) => void;
}) {
  const open = profile.qs.filter((question) => !question.done);
  const answered = profile.qs.filter((question) => question.done);
  const questions = filter === "open" ? open : answered;
  return (
    <section
      id="partner-questions"
      className="partner-panel partner-questions"
      data-partner-section
    >
      <div className="partner-section-heading">
        <div>
          <h2>
            Вопросы гостей<span className="partner-count">{open.length}</span>
          </h2>
          <p>Ответьте своими словами. Мы сохраним детали в профиле отеля.</p>
        </div>
        <MessageCircle size={22} />
      </div>
      <div className="partner-tabs" role="group" aria-label="Фильтр вопросов">
        <button aria-pressed={filter === "open"} onClick={() => setFilter("open")}>
          Ждут ответа<span>{open.length}</span>
        </button>
        <button aria-pressed={filter === "answered"} onClick={() => setFilter("answered")}>
          Отвеченные<span>{answered.length}</span>
        </button>
      </div>
      <div className="partner-question-list">
        {questions.map((question) => {
          const selected =
            profile.selectedKind === "question" && profile.selectedId === question.id;
          return (
            <article
              key={question.id}
              className={`partner-question${selected ? " is-selected" : ""}`}
            >
              <div className="partner-question-row">
                <MessageCircle size={19} />
                <div>
                  <h3>{question.text}</h3>
                  <p>{question.why}</p>
                </div>
                {question.done ? (
                  <span className="partner-saved">
                    <Check size={16} />
                    Ответили
                  </span>
                ) : (
                  <button
                    className="partner-secondary"
                    disabled={profile.saving}
                    aria-expanded={selected}
                    aria-controls={`answer-${question.id}`}
                    onClick={() =>
                      selected ? profile.cancelSelection() : profile.selectQuestion(question.id)
                    }
                  >
                    Ответить
                    <ChevronDown size={15} />
                  </button>
                )}
              </div>
              {selected && !question.done && (
                <AnswerEditor
                  profile={profile}
                  id={`answer-${question.id}`}
                  label="Ваш ответ гостю"
                  placeholder="Расскажите об условиях: для каких номеров это доступно, есть ли ограничения или доплата."
                />
              )}
            </article>
          );
        })}
        {questions.length === 0 && (
          <div className="partner-empty">
            <CircleCheck size={24} />
            <div>
              <h3>{filter === "open" ? "Все вопросы разобраны" : "Здесь будут ваши ответы"}</h3>
              <p>
                {filter === "open"
                  ? "Новые вопросы появятся здесь. Пока можно проверить факты об отеле."
                  : "Выберите вопрос во вкладке «Ждут ответа» и расскажите гостям о деталях."}
              </p>
            </div>
            {filter === "open" && (
              <a href="#partner-facts" className="partner-text-link">
                К фактам
                <ArrowDown size={15} />
              </a>
            )}
          </div>
        )}
      </div>
      {profile.feedback && profile.feedback.kind === "question" && (
        <p className="partner-feedback" role="status">
          <CircleCheck size={17} />
          {profile.feedback.text}
        </p>
      )}
    </section>
  );
}

function AnswerEditor({
  profile,
  id,
  label,
  placeholder,
}: {
  profile: Profile;
  id: string;
  label: string;
  placeholder: string;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  return (
    <form
      id={id}
      className="partner-editor"
      onSubmit={(event) => {
        event.preventDefault();
        profile.send(profile.input);
      }}
    >
      <label htmlFor={`${id}-input`}>{label}</label>
      <textarea
        ref={input}
        id={`${id}-input`}
        value={profile.input}
        onChange={(event) => profile.setInput(event.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={profile.saving}
      />
      <div className="partner-editor-footer">
        <span>Укажите сторону, этаж или сезон, если это важно.</span>
        <div>
          <button
            type="button"
            className="partner-cancel"
            disabled={profile.saving}
            onClick={profile.cancelSelection}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="partner-primary"
            disabled={profile.saving || !profile.input.trim()}
          >
            <Send size={16} />
            {profile.saving ? "Сохраняем…" : "Сохранить ответ"}
          </button>
        </div>
      </div>
    </form>
  );
}

function PartnerFacts({ profile }: { profile: Profile }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const facts = profile.facts.filter(
    (fact) =>
      (filter === "all" ||
        (filter === "confirmed" ? fact.status === "confirmed" : fact.status !== "confirmed")) &&
      `${fact.label} ${fact.value}`
        .toLocaleLowerCase("ru")
        .includes(query.trim().toLocaleLowerCase("ru")),
  );
  return (
    <section id="partner-facts" className="partner-panel partner-facts" data-partner-section>
      <div className="partner-section-heading">
        <div>
          <h2>
            Что известно об отеле<span className="partner-count">{profile.facts.length}</span>
          </h2>
          <p>Проверьте информацию: подтвердите верное или уточните детали.</p>
        </div>
        <ClipboardList size={22} />
      </div>
      <div className="partner-fact-tools">
        <div className="partner-fact-filters" role="group" aria-label="Фильтр фактов">
          {(
            [
              ["all", "Все", profile.facts.length],
              ["review", "Проверить", profile.facts.length - profile.confirmed],
              ["confirmed", "Подтверждены", profile.confirmed],
            ] as const
          ).map(([key, label, count]) => (
            <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {label}
              <span>{count}</span>
            </button>
          ))}
        </div>
        <div className="partner-search">
          <Search size={17} />
          <input
            type="search"
            aria-label="Найти факт"
            placeholder="Найти факт"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button aria-label="Очистить поиск" onClick={() => setQuery("")}>
              <X size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="partner-fact-list">
        {facts.map((fact) => {
          const selected = profile.selectedKind === "fact" && profile.selectedId === fact.id;
          return (
            <article
              key={fact.id ?? fact.label}
              className={`partner-fact${selected ? " is-selected" : ""}`}
            >
              <div className="partner-fact-row">
                <div className="partner-fact-copy">
                  <h3>{fact.label}</h3>
                  <p>{fact.value}</p>
                  <details className="partner-source">
                    <summary>
                      Источник и достоверность
                      <ChevronDown size={13} />
                    </summary>
                    <div>
                      <p>
                        {fact.source} · {fact.checkedAt}
                      </p>
                      <p>Уверенность: {Math.round(fact.confidence * 100)}%</p>
                      {fact.note && <p>{fact.note}</p>}
                    </div>
                  </details>
                </div>
                <div className="partner-fact-actions">
                  <StatusPill status={fact.status} />
                  <div>
                    {fact.status !== "confirmed" && (
                      <button
                        className="partner-secondary"
                        disabled={profile.saving || !fact.id}
                        onClick={() => fact.id && profile.confirm(fact.id)}
                      >
                        <Check size={15} />
                        Всё верно
                      </button>
                    )}
                    <button
                      className="partner-edit"
                      disabled={profile.saving || !fact.id}
                      aria-expanded={selected}
                      aria-controls={`answer-${fact.id}`}
                      onClick={() =>
                        selected ? profile.cancelSelection() : fact.id && profile.correct(fact.id)
                      }
                    >
                      <Pencil size={14} />
                      Уточнить
                    </button>
                  </div>
                </div>
              </div>
              {selected && (
                <AnswerEditor
                  profile={profile}
                  id={`answer-${fact.id}`}
                  label={`Уточнение: ${fact.label}`}
                  placeholder="Расскажите, как обстоят дела на самом деле…"
                />
              )}
              {profile.feedback && profile.feedback.id === fact.id && (
                <p className="partner-feedback" role="status">
                  <CircleCheck size={17} />
                  {profile.feedback.text}
                </p>
              )}
            </article>
          );
        })}
        {facts.length === 0 && (
          <div className="partner-empty">
            <Search size={23} />
            <div>
              <h3>{query ? "Ничего не нашли" : "Здесь пока нет фактов"}</h3>
              <p>
                {query
                  ? "Попробуйте другое слово или выберите фильтр «Все»."
                  : "Подтвердите информацию об отеле — она появится в этой категории."}
              </p>
            </div>
            {(query || filter !== "all") && (
              <button
                className="partner-text-link"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
