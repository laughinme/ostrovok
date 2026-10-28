import { StatusPill } from "@/entities/hotel";
import { useHotelProfile } from "@/features/manage-hotel-profile";
import { getApiMode } from "@/shared/api";
import { Reveal, RequestState } from "@/shared/ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleCheck,
  History,
  MessageCircle,
  Pencil,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ProfileIllustration } from "./profile-illustration";
import "./partner-page.css";

type Profile = ReturnType<typeof useHotelProfile>;

export function PartnerPage() {
  const profile = useHotelProfile();
  const {
    hotel,
    qs,
    facts,
    coverage,
    coverageKnown,
    coverageTotal,
    confirmed,
    conflicts,
    pending,
    error,
    retry,
  } = profile;
  const input = useRef<HTMLTextAreaElement>(null);
  const reduce = useReducedMotion();
  if (!hotel || pending || error)
    return <RequestState pending={pending} error={error} retry={retry} />;
  const open = qs.filter((question) => !question.done);
  const selectQuestion = (id: string) => {
    profile.selectQuestion(id);
    input.current?.focus({ preventScroll: true });
    document
      .getElementById("partner-assistant")
      ?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "nearest" });
  };
  const correct = (id: string) => {
    profile.correct(id);
    input.current?.focus({ preventScroll: true });
    document
      .getElementById("partner-assistant")
      ?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "nearest" });
  };
  return (
    <main className="partner-page">
      <div className="partner-shell">
        <Reveal className="partner-hero">
          <div className="partner-hero-copy">
            <p className="partner-eyebrow">
              <ShieldCheck size={15} />
              Кабинет отельера
            </p>
            <h1>
              Хороший отдых —<br />в деталях.
            </h1>
            <div className="partner-hotel">
              <img src={hotel.image} alt={hotel.name} width={64} height={64} />
              <div>
                <b>{hotel.name}</b>
                <span>{hotel.address || hotel.district}</span>
              </div>
            </div>
          </div>
          <div className="partner-hero-profile">
            <ProfileIllustration coverage={coverage} />
            <div>
              <b>Расскажите чуть больше.</b>
              <span>
                Проверено {coverageKnown} из {coverageTotal} характеристик отеля
              </span>
            </div>
          </div>
        </Reveal>
        <div className="partner-overview-line">
          <p>
            <b>{open.length}</b>вопроса ждут ответа
          </p>
          <p>
            <b>{confirmed}</b>фактов подтверждено вами
          </p>
          <p>
            <b>{facts.length}</b>характеристик в профиле
          </p>
          <a href="#partner-facts">
            Проверить профиль
            <ArrowDown size={15} />
          </a>
        </div>
        <div className="partner-workspace">
          <div className="partner-main-column">
            <Reveal className="partner-questions">
              <div className="partner-section-heading">
                <div>
                  <span>Путешественники спрашивают</span>
                  <h2>
                    Помогите выбрать
                    <br />
                    ваш отель.
                  </h2>
                </div>
                <MessageCircle size={26} />
              </div>
              <div className="partner-question-list">
                {qs.length === 0 && (
                  <div className="partner-all-done">
                    <CircleCheck size={22} />
                    <p>Новых вопросов пока нет. Можно проверить факты ниже.</p>
                  </div>
                )}
                {qs.map((question) => (
                  <article
                    key={question.id}
                    className={`partner-question${question.done ? " is-done" : ""}${profile.selectedId === question.id ? " is-selected" : ""}`}
                  >
                    <div>
                      <h3>{question.text}</h3>
                      <p>{question.why}</p>
                    </div>
                    {question.done ? (
                      <span className="partner-question-done">
                        <Check size={16} />
                        Ответили
                      </span>
                    ) : (
                      <button
                        onClick={() => selectQuestion(question.id)}
                        aria-label={`Ответить: ${question.text}`}
                      >
                        Ответить
                        <ArrowUpRight size={15} />
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </Reveal>
            {conflicts.length > 0 && (
              <section className="partner-conflicts">
                <h2>Есть расхождения в данных</h2>
                {conflicts.map((conflict) => (
                  <p key={conflict.id}>{conflict.resolution || conflict.rule}</p>
                ))}
              </section>
            )}
            <PartnerFacts profile={profile} onCorrect={correct} />
          </div>
          <aside className="partner-sidebar">
            <PartnerAssistant profile={profile} inputRef={input} />
            <section className="partner-history">
              <div>
                <History size={17} />
                <h2>История изменений</h2>
              </div>
              {profile.history.length ? (
                <ol>
                  {profile.history.map((item, index) => (
                    <li key={index}>
                      <span>{item.t}</span>
                      <p>{item.text}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>Здесь появятся ваши ответы и подтверждённые факты.</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function PartnerAssistant({
  profile,
  inputRef,
}: {
  profile: Profile;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const messages = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (messages.current) messages.current.scrollTop = messages.current.scrollHeight;
  }, [profile.msgs.length]);
  return (
    <section id="partner-assistant" className="partner-assistant">
      <div className="partner-assistant-heading">
        <span className="partner-agent-icon">
          <Sparkles size={19} />
        </span>
        <div>
          <h2>На связи с Лучом</h2>
          <p>
            <i />
            Помощник вашего отеля
          </p>
        </div>
        <ShieldCheck size={20} />
      </div>
      <div
        className="partner-messages"
        ref={messages}
        aria-live="polite"
        aria-label="Переписка с помощником"
      >
        <AnimatePresence initial={false}>
          {profile.msgs.map((message, index) => (
            <motion.div
              key={index}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              className={`partner-message partner-message--${message.from}`}
            >
              <span>{message.from === "bot" ? "Луч" : "Вы"}</span>
              <p>{message.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        {profile.saving && (
          <p className="partner-writing" role="status">
            Сохраняем ответ…
          </p>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          profile.send(profile.input);
        }}
      >
        <label className="sr-only" htmlFor="partner-answer">
          Ответ помощнику
        </label>
        <textarea
          id="partner-answer"
          ref={inputRef}
          value={profile.input}
          onChange={(event) => profile.setInput(event.target.value)}
          rows={2}
          placeholder="Ответьте своими словами…"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              profile.send(profile.input);
            }
          }}
        />
        <button
          type="submit"
          disabled={profile.saving || !profile.input.trim()}
          aria-label="Отправить ответ"
        >
          <Send size={18} />
        </button>
      </form>
      <p className="partner-assistant-note">
        {getApiMode() === "demo"
          ? "Демо: изменения остаются в этом браузере."
          : "Ответ сохранится в профиле отеля вместе с источником."}
      </p>
    </section>
  );
}

function PartnerFacts({
  profile,
  onCorrect,
}: {
  profile: Profile;
  onCorrect: (id: string) => void;
}) {
  const [filter, setFilter] = useState("Все");
  const facts = profile.facts.filter(
    (fact) =>
      filter === "Все" ||
      (filter === "Подтверждено" ? fact.status === "confirmed" : fact.status !== "confirmed"),
  );
  return (
    <section id="partner-facts" className="partner-facts">
      <div className="partner-facts-heading">
        <div>
          <span>Точность начинается с вас</span>
          <h2>Профиль в деталях</h2>
        </div>
        <span>{profile.facts.length}</span>
      </div>
      <div className="partner-fact-filters" role="group" aria-label="Фильтр фактов">
        {["Все", "Нужно проверить", "Подтверждено"].map((label) => (
          <button key={label} aria-pressed={filter === label} onClick={() => setFilter(label)}>
            {label}
          </button>
        ))}
      </div>
      <div className="partner-fact-list">
        {facts.length === 0 && (
          <div className="partner-all-done">
            <CircleCheck size={22} />
            <p>В этой категории пока нет фактов.</p>
          </div>
        )}
        {facts.map((fact) => (
          <article key={fact.id ?? fact.label} className="partner-fact">
            <div className="partner-fact-top">
              <h3>{fact.label}</h3>
              <StatusPill status={fact.status} />
            </div>
            <p>{fact.value}</p>
            <div
              className="partner-fact-confidence"
              aria-label={`Уверенность ${Math.round(fact.confidence * 100)}%`}
            >
              <span style={{ width: `${Math.round(fact.confidence * 100)}%` }} />
            </div>
            <div className="partner-fact-bottom">
              <span>
                {fact.source} · {fact.checkedAt}
              </span>
              <div>
                {fact.status !== "confirmed" && (
                  <button
                    disabled={profile.saving}
                    onClick={() => fact.id && profile.confirm(fact.id)}
                  >
                    <Check size={13} />
                    Верно
                  </button>
                )}
                <button disabled={profile.saving} onClick={() => fact.id && onCorrect(fact.id)}>
                  <Pencil size={12} />
                  Уточнить
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
