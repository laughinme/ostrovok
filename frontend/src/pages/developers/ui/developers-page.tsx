import { api, getApiMode } from "@/shared/api";
import {
  Blocks,
  Bot,
  Check,
  CodeXml,
  Copy,
  LoaderCircle,
  Play,
  Plug,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EXAMPLES, MCP_TOOLS, curl, mcpConfig, preview, type Example } from "../model/examples";
import { DevelopersIntroInfo } from "./developers-intro-info";
import "./developers-page.css";

function useOrigin(): string {
  const [origin, setOrigin] = useState("https://okno-api.fly.dev");
  useEffect(() => {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") setOrigin(window.location.origin);
  }, []);
  return origin;
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timeout = window.setTimeout(() => setDone(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [done]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
    } catch {
      toast.error("Не удалось скопировать. Выделите и скопируйте код вручную.");
    }
  };
  const label = done ? "Скопировано" : "Копировать код";
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={label}
      title={label}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current motion-reduce:transition-none"
    >
      {done ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      <span className="sr-only" role="status">
        {done ? "Код скопирован" : ""}
      </span>
    </button>
  );
}

function Code({
  children,
  language = "JSON",
  onRun,
  busy = false,
}: {
  children: string;
  language?: string;
  onRun?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-night text-night-foreground">
      <div className="flex min-h-16 items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <span className="flex items-center gap-2 text-xs font-medium sm:text-sm">
          <CodeXml className="size-4 shrink-0" aria-hidden="true" />
          {language}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <CopyButton text={children} />
          {onRun && (
            <button
              type="button"
              disabled={busy}
              onClick={onRun}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-3 text-xs font-medium transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none sm:px-4 sm:text-sm"
            >
              {busy ? (
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
              {busy ? "Выполняем…" : "Запустить"}
            </button>
          )}
        </div>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words px-4 pb-5 pt-2 font-mono text-[12.5px] leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
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
    <article className="min-w-0 rounded-3xl border bg-card p-5">
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
        <Code language="cURL" onRun={() => void run()} busy={busy}>
          {curl(origin, example)}
        </Code>
      </div>
      <div aria-live="polite" aria-busy={busy}>
        {state && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-muted-foreground">
              {"error" in state ? "Ошибка запроса" : `Ответ за ${state.ms} мс`}
            </p>
            <Code language={"error" in state ? "Ошибка" : "JSON"}>
              {"error" in state ? state.error : state.body}
            </Code>
          </div>
        )}
      </div>
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
        Знания об отелях как строительный{" "}
        <span className="whitespace-nowrap">
          блок
          <DevelopersIntroInfo />
        </span>
      </h1>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Blocks,
            title: "REST API",
            text: "OpenAPI-схема, типы для фронта генерируются из неё",
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
            Streamable HTTP, без ключа, только чтение. Публичный URL для Claude и ChatGPT:
          </p>
          <p className="mt-3 break-all font-mono text-sm">https://okno-api.fly.dev/mcp</p>
          <div className="mt-5 space-y-4 text-sm leading-relaxed">
            <p>
              <strong>Claude.</strong> Customize → Connectors → + Add → Add custom connector.
              Назовите «О!кно», вставьте URL, выберите No sign in и добавьте сервер. В чате включите
              его через «+» → Connectors.
            </p>
            <p>
              <strong>ChatGPT.</strong> Откройте Plugins → «+» → Add custom MCP server. Назовите
              «О!кно», вставьте URL в Server URL, выберите No authentication, создайте и установите
              плагин. В чате выберите @О!кно. В рабочем пространстве может понадобиться доступ
              администратора.
            </p>
            <p>
              Спросите: «Через О!кно найди тихий номер с закатом над морем в Сочи на 12–15 ноября
              вдвоём. Покажи три варианта и доказательства».
            </p>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">Для клиентов с JSON-конфигурацией:</p>
          <div className="mt-4">
            <Code>{mcpConfig(origin)}</Code>
          </div>
          <div className="mt-3 flex gap-2">
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
          {getApiMode() === "demo"
            ? "В режиме «Демо» ответы локальные. Чтобы проверить настоящий API, переключитесь в режим «Гость»."
            : "Запросы уходят в настоящий бэкенд. Без ключа LLM разбор делают правила, с ключом — модель."}
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
