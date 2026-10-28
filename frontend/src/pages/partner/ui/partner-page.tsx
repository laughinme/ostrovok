import { Beam, StatusPill } from "@/entities/hotel";
import { useHotelProfile } from "@/features/manage-hotel-profile";
import { cn } from "@/shared/lib";
import { RequestState } from "@/shared/ui";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Check,
  History,
  MessageCircleQuestion,
  Pencil,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";
export function PartnerPage() {
  const {
    hotel,
    facts,
    qs,
    msgs,
    input,
    setInput,
    history,
    send,
    confirm,
    coverage,
    pending,
    error,
    retry,
    selectQuestion,
    correct,
    saving,
  } = useHotelProfile();
  if (!hotel || pending || error)
    return <RequestState pending={pending} error={error} retry={retry} />;
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={hotel.image}
            alt={hotel.name}
            width={1024}
            height={768}
            className="h-20 w-20 rounded-2xl object-cover"
          />
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-coral">
              Кабинет отельера
            </p>
            <h1 className="text-4xl">{hotel.name}</h1>
            <p className="text-sm text-muted-foreground">{hotel.district}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Stat
            icon={Users}
            label="вопросов от агента"
            value={qs.filter((question) => !question.done).length.toLocaleString("ru")}
          />
          <Stat icon={TrendingUp} label="полнота профиля" value={`${coverage}%`} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border bg-card p-6">
            <h2 className="flex items-center gap-2 text-2xl">
              <MessageCircleQuestion className="h-5 w-5 text-coral" /> Вопросы от агента
            </h2>
            <ul className="mt-4 space-y-3">
              {qs.map((q) => (
                <li
                  key={q.id}
                  className={cn("rounded-2xl border p-4 transition", q.done && "opacity-50")}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{q.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{q.why}</p>
                    </div>
                    {q.done ? (
                      <Check className="h-5 w-5 text-conf-high" />
                    ) : (
                      <button
                        onClick={() => selectQuestion(q.id)}
                        className="rounded-full bg-foreground px-3 py-1 text-xs text-background"
                      >
                        Ответить
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border bg-card p-6">
            <h2 className="text-2xl">Что AI знает о вашем отеле</h2>
            <div className="mt-4 divide-y">
              <AnimatePresence initial={false}>
                {facts.map((f) => (
                  <motion.div layout key={f.id ?? f.label} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{f.label}</p>
                        <p className="text-sm text-muted-foreground">{f.value}</p>
                      </div>
                      <StatusPill status={f.status} />
                    </div>
                    <Beam value={f.confidence} status={f.status} className="mt-2" />
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {f.source} · {f.checkedAt}
                      </span>
                      {f.status !== "confirmed" && (
                        <span className="ml-auto flex gap-2">
                          <button
                            onClick={() => f.id && confirm(f.id)}
                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-foreground hover:border-conf-high"
                          >
                            <Check className="h-3 w-3" /> Верно
                          </button>
                          <button
                            onClick={() => f.id && correct(f.id)}
                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-foreground hover:border-coral"
                          >
                            <Pencil className="h-3 w-3" /> Исправить
                          </button>
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="flex h-[560px] flex-col rounded-3xl bg-night p-4 text-night-foreground">
            <div className="flex items-center gap-2 border-b border-night-muted/20 px-2 pb-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-sunset">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Агент О!кна</p>
                <p className="text-[11px] text-night-muted">Демо-отельер · Салют</p>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-2">
              {msgs.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    m.from === "me"
                      ? "ml-auto bg-coral text-primary-foreground"
                      : "bg-night-foreground/10",
                  )}
                >
                  {m.text}
                </motion.div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2 rounded-2xl bg-night-foreground/10 p-1.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ответьте своими словами…"
                className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-night-muted"
              />
              <button className="rounded-xl bg-sunset p-2.5" disabled={saving}>
                <Send className="h-4 w-4" />
              </button>
            </form>
          </section>

          <section className="rounded-3xl border bg-card p-6">
            <h2 className="flex items-center gap-2 text-2xl">
              <History className="h-5 w-5" /> История изменений
            </h2>
            <ol className="mt-4 space-y-3 border-l pl-4">
              {history.map((h, i) => (
                <motion.li layout key={h.text + i} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-coral" />
                  <span className="font-mono text-xs text-muted-foreground">{h.t}</span> — {h.text}
                </motion.li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3">
      <p className="flex items-center gap-2 font-mono text-2xl font-semibold">
        <Icon className="h-4 w-4 text-coral" />
        {value}
      </p>
      <p className="max-w-[160px] text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
