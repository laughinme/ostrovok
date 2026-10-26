# Луч — chupapis

Прототип поиска отелей для Ostrovok Hackathon 2026: запрос своими словами, подбор
по нестандартным характеристикам, сравнение и кабинет отельера.

Фронтенд находится в [`frontend`](frontend/README.md) и организован по FSD.
Каталог отелей, оценки и ответы агента — демонстрационные данные.

## Локальный запуск

Нужны Node.js 22.12+ и npm.

```sh
cd frontend
npm ci
npm run dev
```

Открыть http://localhost:5173. Проверка проекта: `npm run check` из `frontend`.

Подробности структуры, тестов и production-сборки — в [документации frontend](frontend/README.md).
