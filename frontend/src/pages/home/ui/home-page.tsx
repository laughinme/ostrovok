import { EXAMPLE_QUERIES, HotelSearchForm } from "@/features/hotel-search";
import hero from "@/shared/assets/hero.jpg";
import { Greeting } from "@/widgets/greeting";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Footprints, MessagesSquare, Sun, Volume1 } from "lucide-react";

const FEATURES = [
  {
    icon: Volume1,
    title: "Слышит тишину",
    text: "Модель шума по часам суток: дороги, бары, набережная, самолёты.",
  },
  {
    icon: Sun,
    title: "Видит закат",
    text: "Азимут фасада, рельеф и застройка — какие окна поймают солнце.",
  },
  {
    icon: Footprints,
    title: "Ходит пешком",
    text: "Реальные минуты по тропам и лестницам, а не «500 м по прямой».",
  },
  {
    icon: MessagesSquare,
    title: "Спрашивает отельера",
    text: "Если данных нет — агент сам задаёт вопрос и ждёт ответ.",
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const go = (query: string) =>
    query.trim() && navigate({ to: "/search", search: { q: query.trim() } });

  return (
    <main>
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <img
          src={hero}
          alt="Закат над побережьем Сочи"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-night/60 via-night/50 to-background" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-20 pb-24 text-center sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full"
          >
            <Greeting />
          </motion.div>
          <HotelSearchForm onSearch={go} />

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {EXAMPLE_QUERIES.map((e, i) => (
              <motion.button
                key={e}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.07 }}
                onClick={() => go(e)}
                className="glass rounded-full px-4 py-2 text-sm transition hover:bg-card"
              >
                «{e}»
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-coral">Что умеет Луч</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">Знает об отеле то, чего нет в его карточке</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group rounded-3xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground transition group-hover:bg-sunset group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 rounded-3xl bg-night p-8 text-night-foreground sm:grid-cols-3 sm:p-12">
          {[
            ["6 агентов", "работают над каждым запросом параллельно"],
            ["4 уровня", "достоверности у каждой характеристики"],
            ["1 ответ отельера", "улучшает выдачу для тысяч гостей"],
          ].map(([a, b]) => (
            <div key={a}>
              <div className="font-display text-4xl text-sunset">{a}</div>
              <p className="mt-2 text-sm text-night-muted">{b}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Прототип: отели, цифры и ответы AI — демонстрационные данные.
        </p>
      </section>
    </main>
  );
}
