import { api } from "@/shared/api";
import { Blocks, Bot, Copy, Play, Plug, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { EXAMPLES, MCP_TOOLS, curl, mcpConfig, preview, type Example } from "../model/examples";

function useOrigin(): string {
  const [origin, setOrigin] = useState("https://okno-api.fly.dev");
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setDone(true));
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs"
    >
      <Copy className="h-3.5 w-3.5" /> {done ? "Скопировано" : "Копировать"}
    </button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-night p-4 font-mono text-[12.5px] leading-relaxed text-night-foreground">
      {children}
    </pre>
  );
}

function LiveExample({ example, origin }: { example: Example; origin: string }) {
  const [state, setState] = useState<{ ms: number; body: string } | { error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const started = performance.now();
    try {
      const body = await api<unknown>(example.path, {
        method: example.method,
        ...(example.body !== undefined ? { body: example.body } : {}),
      });
      setState({ ms: Math.round(performance.now() - started), body: preview(body) });
    } catch (error) {
      setState({ error: error instanceof Error ? error.message : "Ошибка запроса" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="rounded-3xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{example.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{example.what}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[11px]">
          {example.method} /api/v1{example.path}
        </span>
      </div>
      <div className="mt-4">
        <Code>{curl(origin, example)}</Code>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run()}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" /> {busy ? "Выполняем…" : "Выполнить"}
        </button>
        <CopyButton text={curl(origin, example)} />
        {state && "ms" in state && (
          <span className="text-xs text-muted-foreground">ответ за {state.ms} мс</span>
        )}
      </div>
      {state && (
        <div className="mt-3">
          <Code>{"error" in state ? state.error : state.body}</Code>
        </div>
      )}
    </article>
  );
}

export function DevelopersPage() {
  const origin = useOrigin();
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">
        Для разработчиков и партнёров
      </p>
      <h1 className="mt-3 max-w-3xl text-3xl sm:text-5xl">
        Знания об отелях как строительный блок
      </h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Всё, что видит гость, доступно другим системам Островка и внешним AI-агентам: поиск словами,
        факты по сторонам и этажам с доказательствами, сравнение. Один и тот же слой знаний — для
        сайта, приложения, чат-бота и голосового ассистента.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Blocks,
            title: "REST API",
            text: "63 ручки, OpenAPI-схема, типы для фронта генерируются из неё",
          },
          {
            icon: Bot,
            title: "MCP-сервер",
            text: "5 инструментов только на чтение для Claude, ChatGPT, Cursor и своих агентов",
          },
          {
            icon: ShieldCheck,
            title: "Факты с источником",
            text: "У каждого ответа есть метод, источник, уверенность, дата и срок годности",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-3xl border bg-card p-5">
            <Icon className="h-5 w-5 text-coral" />
            <h2 className="mt-3 text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="flex items-center gap-2 text-2xl">
            <Plug className="h-5 w-5" /> Подключить агента по MCP
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Streamable HTTP, без ключа, только чтение. Добавьте сервер в конфиг клиента:
          </p>
          <div className="mt-4">
            <Code>{mcpConfig(origin)}</Code>
          </div>
          <div className="mt-3 flex gap-2">
            <CopyButton text={mcpConfig(origin)} />
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg border bg-card px-2.5 py-1 text-xs"
            >
              Открыть OpenAPI →
            </a>
          </div>
        </div>
        <ul className="space-y-3">
          {MCP_TOOLS.map((tool) => (
            <li key={tool.name} className="rounded-2xl border bg-card px-4 py-3">
              <p className="font-mono text-sm font-semibold">{tool.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tool.what}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl">Попробовать API прямо здесь</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Запросы уходят в настоящий бэкенд. Без ключа LLM разбор делают правила, с ключом — модель.
        </p>
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
          {EXAMPLES.map((example) => (
            <LiveExample key={example.id} example={example} origin={origin} />
          ))}
        </div>
      </section>
    </main>
  );
}
