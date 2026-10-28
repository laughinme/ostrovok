import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api, getApiMode, type components } from "@/shared/api";
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

export function SessionControls() {
  const { account, open } = useSession();
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (getApiMode() === "demo") return null;
  return account ? (
    <details className="session-menu">
      <summary>
        {account.username || account.email}
        {account.persona ? " · тест" : ""}
      </summary>
      <div>
        <span>{account.email}</span>
        {account.role === "guest" && <Link to="/profile">Профиль вкуса</Link>}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await client.cancelQueries();
              await signOut();
              client.clear();
              window.location.assign("/");
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
  ) : (
    <button className="session-open" type="button" onClick={open}>
      Войти
    </button>
  );
}

export function SessionDialog() {
  const { dialog: open, close } = useSession();
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
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
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
          ? `Раздел доступен для роли «${{ guest: "Гость", hotelier: "Отельер", operator: "Оператор" }[role!]}».`
          : "Поиск и страницы отелей открыты всем. Поездки, предпочтения и рабочий кабинет доступны после входа."}
      </p>
      <button type="button" className="session-primary" onClick={open}>
        {mismatch ? "Выбрать аккаунт" : "Войти или зарегистрироваться"}
      </button>
      <Link to="/">На главную</Link>
    </main>
  );
}
