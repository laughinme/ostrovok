# ostrovok

Приватный рабочий репозиторий Ostrovok Hackathon 2026.

## Frontend

Основной фронтенд — [`frontend`](frontend/README.md): «О!кно», React, Vite, React Router, Motion, MapLibre, по `DESIGN.md`
и прототипу `design/prototype/`. Работает на демо-данных, backend и ключи API не нужны. Нужны Node.js 22.12+ и npm.

```sh
cd frontend
npm ci
npm run dev    # http://127.0.0.1:5175
npm run build  # dist/
```

Пуш в `main` с изменениями в `frontend/` автоматически деплоится на Vercel (https://ostrovok-okno.vercel.app/)
через `.github/workflows/deploy-frontend.yml`. Секреты: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

Другие версии лежат в [`archive/`](archive/): `frontend-luch` (React, TanStack Start, FSD; запуск на порту 5173)
и `frontend-2` (React, Vite, React Router; порт 5174). Запускаются так же: `cd archive/<папка>`, `npm ci`, `npm run dev`;
проверка: `npm run check`, для браузерных тестов `frontend-2` сначала `npx playwright install chromium`.

Исследование, дизайн-система и прототип находятся в `docs/research/`, `DESIGN.md` и `design/prototype/`.
