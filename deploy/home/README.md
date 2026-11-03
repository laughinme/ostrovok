# Домашний сервер: размещение О!кно

Внутренний файл (не часть сдачи: сдача запускается через корневой `docker-compose.yml`).

Весь стек (db, redis, backend, worker, frontend, gateway) работает на домашнем сервере под Coolify на одном домене: **https://okno.prooood.ru** (приложение, `/health`, `/api/docs`, `/mcp`). Это актуальный адрес демо. Старые размещения на Fly.io и Vercel больше не считаются основными.

- `docker-compose.yml` — прод-стек из готовых образов GHCR (`ghcr.io/laughinme/ostrovok-{backend,frontend,gateway}`), тег задаёт переменная `IMAGE_TAG`.
- `../../.github/workflows/deploy-home.yml` — сборка образов, вход в Tailscale, деплой на сервер, проверка `/health`.

Переменные приложения в Coolify: `PUBLIC_HOST` (домен без схемы, он же `MCP_PUBLIC_HOSTS`), `IMAGE_TAG` (ставит деплой), при желании `LLM_API_KEY`. Пароль PostgreSQL и `CSRF_HMAC_KEY` Coolify генерирует сам (`SERVICE_PASSWORD_*`). Без `LLM_API_KEY` агенты работают по правилам.

Как настроены сервер, Tailscale и секреты GitHub: `docs/AUTODEPLOY.md` в проекте sara-hosting на Mac владельца (`/Users/laughinme/Code/python/sara-hosting`).
