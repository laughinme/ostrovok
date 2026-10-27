# ostrovok

Приватный рабочий репозиторий Ostrovok Hackathon 2026.

## Frontend

Из проекта `chupapis` перенесены две независимые демонстрационные версии:

| Каталог | Реализация | Локальный адрес |
| --- | --- | --- |
| [`frontend`](frontend/README.md) | React, TanStack Start, FSD; текущая рабочая версия с локальными правками | http://localhost:5173 |
| [`frontend-2`](frontend-2/README.md) | React, Vite, React Router; версия из ветки `feat/frontend-2` | http://127.0.0.1:5174 |

Для обеих версий нужны Node.js 22.12+ и npm. Запуск первой версии:

```sh
cd frontend
npm ci
npm run dev
```

В другом терминале из корня репозитория можно запустить вторую:

```sh
cd frontend-2
npm ci
npm run dev
```

Проверка каждой версии: `npm run check` из соответствующего каталога.
Для браузерных тестов второй версии предварительно выполнить `npx playwright install chromium`.
Каталог отелей и ответы агентов демонстрационные; backend и ключи API не нужны.

Исследование, дизайн-система и прототип находятся в `docs/research/`, `DESIGN.md` и `design/prototype/`.
