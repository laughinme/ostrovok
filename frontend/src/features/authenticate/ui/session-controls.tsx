import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api, getApiMode, setApiMode, type components } from "@/shared/api";
import {
  restoreSession,
  signIn,
  signInPersona,
  signOut,
  signUp,
  useSession,
} from "@/entities/session";
import { RequestState } from "@/shared/ui";
import "./session-controls.css";

const ROLE_LABEL = { guest: "Гость", hotelier: "Отельер", operator: "Оператор Островка" } as const;

function exitDemo() {
  setApiMode("live");
  window.location.assign("/");
}

async function leave(client: ReturnType<typeof useQueryClient>) {
  await client.cancelQueries();
  await signOut();
  client.clear();
  window.location.assign("/");
}

export function SessionControls() {
  const { account, open } = useSession();
  const client = useQueryClient();
  const menu = useRef<HTMLDetailsElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (getApiMode() === "demo")
    return (
      <button className="session-open" type="button" onClick={exitDemo}>
        Демо-режим · выйти
      </button>
    );
  if (!account)
    return (
      <div className="session-actions">
        <button className="session-open" type="button" onClick={() => open("login")}>
          Войти
        </button>
        <button
          className="session-open session-open--primary"
          type="button"
          onClick={() => open("register")}
        >
          Регистрация
        </button>
      </div>
    );
  const name = account.username || account.email;
  const hide = () => menu.current?.removeAttribute("open");
  return (
    <details className="session-menu" ref={menu}>
      <summary>
        <span className="session-avatar" aria-hidden="true">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="session-name">{name}</span>
      </summary>
      <div>
        <b>{name}</b>
        <span>
          {ROLE_LABEL[account.role]}
          {account.persona ? " · тестовый аккаунт" : ""}
        </span>
        <span>{account.email}</span>
        {account.role === "guest" && (
          <>
            <Link to="/profile" onClick={hide}>
              Профиль и предпочтения
            </Link>
            <Link to="/trips" onClick={hide}>
              Мои поездки
            </Link>
          </>
        )}
        {account.role === "hotelier" && (
          <Link to="/partner" onClick={hide}>
            Кабинет отеля
          </Link>
        )}
        {account.role === "operator" && (
          <Link to="/console" onClick={hide}>
            Консоль знаний
          </Link>
        )}
        <button type="button" onClick={() => open("login")}>
          Сменить аккаунт
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await leave(client);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Не удалось выйти");
              setBusy(false);
            }
          }}
        >
          {busy ? "Выходим…" : "Выйти"}
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}

export function SessionDialog() {
  const { dialog: open, close, intent } = useSession();
  const client = useQueryClient();
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPersonas, setShowPersonas] = useState(false);
  const personas = useQuery({
    queryKey: ["auth", "personas"],
    queryFn: ({ signal }) =>
      api<components["schemas"]["PersonaOut"][]>("/auth/personas", { signal }),
    enabled: open && showPersonas && getApiMode() !== "demo",
  });
  useEffect(() => {
    if (getApiMode() === "demo") return;
    void restoreSession().catch(() => undefined);
  }, []);
  useEffect(() => {
    if (open) {
      setMode(intent);
      setError(null);
      ref.current?.showModal();
    } else ref.current?.close();
  }, [open, intent]);
  async function authenticate(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await client.cancelQueries();
      await action();
      await client.resetQueries();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    void authenticate(() =>
      mode === "login"
        ? signIn(email, password)
        : signUp(email, password, String(form.get("username") ?? "")),
    );
  }
  return (
    <dialog
      ref={ref}
      className="session-dialog"
      aria-labelledby="session-title"
      onCancel={close}
      onClose={close}
    >
      <button className="session-close" aria-label="Закрыть вход" type="button" onClick={close}>
        <X size={20} />
      </button>
      <h2 id="session-title">{mode === "login" ? "Войти в О!кно" : "Создать аккаунт"}</h2>
      <p>Ваши поездки и предпочтения будут храниться в вашем аккаунте.</p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {mode === "register" && (
            <label>
              Имя
              <input name="username" autoComplete="nickname" maxLength={64} />
            </label>
          )}
          <label>
            Электронная почта
            <input name="email" type="email" autoComplete="username" required maxLength={254} />
          </label>
          <label>
            Пароль
            <input
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "register" ? 8 : 1}
              maxLength={128}
            />
          </label>
          {mode === "register" && <small>Не менее 8 символов.</small>}
          <button type="submit" className="session-primary">
            {busy ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
          <button
            type="button"
            className="session-text"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "Создать новый аккаунт" : "У меня уже есть аккаунт"}
          </button>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="session-error">
          {error}
        </p>
      )}
      <details
        className="session-personas"
        onToggle={(event) => setShowPersonas(event.currentTarget.open)}
      >
        <summary>Тестовые аккаунты для проверки сервиса</summary>
        <p>
          Это общие учебные аккаунты на сервере. Поездки и ответы доступны всем, кто выберет этот
          аккаунт. Для личной поездки создайте свой.
        </p>
        <RequestState
          pending={showPersonas && personas.isPending}
          error={personas.error}
          retry={() => void personas.refetch()}
        />
        {personas.data?.map((persona) => (
          <button
            type="button"
            key={persona.key}
            disabled={busy}
            onClick={() => void authenticate(() => signInPersona(persona.key))}
          >
            <b>{persona.name}</b>
            <span>{persona.title}</span>
          </button>
        ))}
      </details>
    </dialog>
  );
}

function QuickPersonas({ role }: { role?: "guest" | "hotelier" | "operator" | undefined }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const personas = useQuery({
    queryKey: ["auth", "personas"],
    queryFn: ({ signal }) =>
      api<components["schemas"]["PersonaOut"][]>("/auth/personas", { signal }),
  });
  const list = (personas.data ?? []).filter((persona) => !role || persona.role === role);
  if (!personas.isPending && list.length === 0) return null;
  return (
    <section className="session-quick" aria-label="Тестовые аккаунты">
      <h2>Проверить без регистрации</h2>
      <p>Тестовый аккаунт, вход в один клик, пароль не нужен.</p>
      <RequestState
        pending={personas.isPending}
        error={personas.error}
        retry={() => void personas.refetch()}
      />
      <div>
        {list.map((persona) => (
          <button
            type="button"
            key={persona.key}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await client.cancelQueries();
                await signInPersona(persona.key);
                await client.resetQueries();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Не удалось войти");
              } finally {
                setBusy(false);
              }
            }}
          >
            <b>Войти как {persona.name}</b>
            <span>{persona.title}</span>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="session-error">
          {error}
        </p>
      )}
    </section>
  );
}

export function SessionGate({
  role,
  children,
}: {
  role?: "guest" | "hotelier" | "operator";
  children: ReactNode;
}) {
  const { account, ready, open } = useSession();
  if (getApiMode() === "demo") return children;
  if (!ready) return <RequestState page pending />;
  if (account && (!role || account.role === role))
    return <Fragment key={account.id}>{children}</Fragment>;
  const mismatch = !!account && account.role !== role;
  return (
    <main className="session-gate">
      <h1>{mismatch ? "Для этого раздела нужен другой аккаунт" : "Войдите в свой аккаунт"}</h1>
      <p>
        {mismatch
          ? `Раздел доступен для роли «${{ guest: "Гость", hotelier: "Отельер", operator: "Оператор" }[role!]}». Сейчас вы вошли как ${account.username || account.email}.`
          : "Поиск и страницы отелей открыты всем. Поездки, предпочтения и рабочий кабинет доступны после входа."}
      </p>
      <QuickPersonas role={role} />
      <div className="session-gate__actions">
        <button type="button" className="session-primary" onClick={() => open("login")}>
          {mismatch ? "Войти другим аккаунтом" : "Войти по почте"}
        </button>
        {!mismatch && (
          <button type="button" className="session-text" onClick={() => open("register")}>
            Создать аккаунт
          </button>
        )}
      </div>
      <Link to="/">На главную</Link>
    </main>
  );
}
