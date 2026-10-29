# Fly.io: размещённый бэкенд

Внутренний файл (хостинг для демо и жюри, не часть сдачи: сдача запускается через Compose).

| Приложение | Что | Конфиг |
|---|---|---|
| okno-api | FastAPI (app) + воркер (worker), один образ backend/Dockerfile | okno-api.fly.toml |
| okno-db | PostGIS 17 на машине с томом pgdata, только приватная сеть (okno-db.internal:5432) | okno-db.fly.toml |
| okno-upstash | Redis от Upstash (pay-as-you-go), создан fly redis create | — |

API: https://okno-api.fly.dev (/health, /api/ready, /api/docs).

## Автодеплой

.github/workflows/deploy-backend.yml: пуш в main с изменениями в backend/** (или workflow_dispatch)
запускает flyctl deploy. Миграции и сид идут release-командой python -m app.init, потом Fly заменяет
машины после успешного /health. Секрет репозитория FLY_API_TOKEN — deploy-токен только на okno-api
(перевыпуск: fly tokens create deploy -a okno-api -x 8760h | gh secret set FLY_API_TOKEN).

## Секреты Fly (fly secrets list -a okno-api)

DATABASE_URL, REDIS_URL, CSRF_HMAC_KEY, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, LLM_* (с 28.10: gpt-5.6-luna,
300 вызовов в день); позже CORS_ALLOW_ORIGINS (адрес фронта на Vercel). Пароль БД — секрет POSTGRES_PASSWORD приложения okno-db. В git их нет.

## Вручную

```bash
fly deploy backend -c $PWD/deploy/fly/okno-api.fly.toml --ha=false   # из корня репозитория
fly logs -a okno-api
fly ssh console -a okno-api --machine <id>
```

Release-машина по умолчанию мала: сид (63 тыс. зданий) ловит OOM, поэтому performance-1x.
