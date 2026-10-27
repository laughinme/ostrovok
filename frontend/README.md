# frontend — «О!кно»

Next.js App Router, React, TypeScript (`strict`), TanStack Query, Motion и MapLibre GL.
Интерфейс следует [`DESIGN.md`](../DESIGN.md). Код организован по Feature-Sliced Design:
слои, границы модулей, состояние и API описаны в [`ARCHITECTURE.md`](ARCHITECTURE.md).

Нужны Node.js 22.12+ и npm. Бэкенд и API-ключи для демо не нужны.

```sh
npm ci
npm run dev        # http://localhost:5175
npm run check      # типы, линтер, границы FSD, production build
npm run start      # production server после сборки, порт 5175
```

Сборка находится в `.next/`; для запуска нужен сервер Next.js. Vercel использует preset `nextjs`;
старый SPA rewrite на `index.html` удалён.

## Маршруты

| Маршрут | Экран |
|---|---|
| `/`, `/search` | Желание, подборки, выдача по совпадению, карта |
| `/hotels/:id` | Отель, факты и доказательства, фасады, этажи, номера и тарифы |
| `/compare` | Сравнение по желаниям |
| `/book/:id?room=...&rate=...` | Демо-бронирование выбранного номера и тарифа |
| `/trips/:id` | Подтверждение и обратная связь после поездки |
| `/me` | Профиль вкуса |
| `/partner`, `/console` | Кабинет отельера и консоль знаний |
| `/developers`, `/credits` | Демо API/MCP и атрибуция |

Демо-каталог отдаётся через `/api/hotels` и `/api/hotels/:id`, данные кэширует TanStack Query.
Для подключения внешнего API см. `.env.example` и раздел в [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Проверка в браузере

```sh
npx playwright install chromium  # один раз
npm run build
npm run test:e2e                  # сам поднимает production server, если он не запущен
```

Тесты проверяют переход от желания до поездки, загрузку по прямым ссылкам и перезагрузку,
кэш между страницами, ошибку API и повтор, неизвестные ID, номер/тариф из URL,
варианты лендинга и адаптив на 1440, 1366 и 390 px. Скриншоты сохраняются в `test-results/`.
В тестах недоступность внешнего сервиса карт воспроизводится намеренно.

## Демо-фото

`public/demo/photos/` — иллюстрации Wikimedia Commons под свободными лицензиями, атрибуция в
`src/shared/lib/photos/photos.json` и на `/credits`. Они не изображают отели из прототипа.
Скрипт получения: `node scripts/fetch-demo-photos.mjs`; `--candidates` скачивает варианты для ручного отбора.
