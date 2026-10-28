# Бэкенд для фронта: как подключать

Для фронтендера команды (задачи F1–F8 в [tasks.md](tasks.md)). Источник правды по полям —
`frontend/openapi.json` (`make openapi`; живой — `http://localhost:8080/api/openapi.json`, Swagger — `/api/docs`).
Контракт 08 §9 v2 соблюдён; отличия — в конце.

## Подключение

- База: `NEXT_PUBLIC_API_BASE_URL=/api/v1` (в Docker так и собирается; фронт и API на одном origin за шлюзом
  на :8080). Локально: `make up-native` поднимает весь стек; или `make dev` + `make run` (API на :8000).
- Поля в JSON — camelCase. Ошибки — RFC 7807 (`application/problem+json`): `{status, detail, error_code,
  request_id, details?}`; ветвиться по `error_code`.
- Типы: `npx openapi-typescript frontend/openapi.json -o src/shared/api/schema.d.ts`, маппинг в модели FSD —
  в `entities/*/api`.

## Роли без регистрации

`GET /auth/personas` — список для переключателя ролей. `POST /auth/demo {"persona": "guest_anna"}` с заголовком
`X-Client: web` ставит refresh-cookie и возвращает `{access_token, expires_in}` (ручки `/auth/*` — в snake_case,
как принято в OAuth); access-токен класть в `Authorization: Bearer`. Обновление — `POST /auth/refresh` с заголовком `X-CSRF-Token` из cookie `csrf_token`.
`GET /me` — кто вошёл (`role`: guest | hotelier | operator, `persona`).
Гостевой поиск и страницы отелей работают без входа.

## Экраны → ручки (по 08 §3–§4)

| Экран | Ручки |
|---|---|
| 4.1 Вход, 4.2 холст намерений | `POST /intents?planner=rules {text}` на каждое изменение текста (правила, миллисекунды) и `POST /intents {text}` на паузе 700 мс или при отправке (LLM, 1–3 с; `planner` в ответе — кто разобрал) → чипы, поездка, подсказки; `GET /characteristics` — что умеем проверять; `GET /moods` — подборки со счётчиками |
| 4.3 Выдача | `POST /searches {text}` или `{chips, trip}` (отредактированный холст) → `SearchResult`; `GET /searches/{id}` — перечитать (после ответов агентов выдача меняется) |
| 4.4 Сравнение | `POST /compare` |
| 4.5 Отель «Как это будет» | `GET /hotels/{id}`; окно — `GET /hotels/{id}/window?facade=SW&floor=5&date=2026-11-12`; шум — `/noise`; дорога — `/routes/beach?profile=walk`; погода — `/climate?from=&to=`; «Ваш день» — `/day?date=`; «как этот, но…» — `POST /hotels/{id}/similar` |
| 4.6 «Почему мы так думаем» | `GET /facts/{factId}` — источники, история, доказательства (`evidence[].params` — чем перестроить картинку) |
| 4.7 Живое исследование | `POST /searches/{id}/wishes {text}` → `{runId, search}`; или кнопка «узнать вживую» у чипа с вердиктом `unknown` — `POST /searches/{id}/research {chipId}` → `{runId}`; затем SSE `GET /runs/{runId}/events`; по `search.updated` или `run.finished` — перечитать `GET /searches/{id}` |
| 4.8 Бронь, 4.9 поездка | `POST /bookings`, `GET /me/trips` (список заявок гостя, новые сверху, `?limit=` до 100), `GET /trips/{id}`, `POST /trips/{id}/feedback`, `GET /me/notifications` |
| 4.10 Профиль вкуса | `GET/PATCH/DELETE /me/taste` |
| 4.11 Кабинет отельера | `/partner/hotels/{id}` (+ `/questions`, `/facades`, `/requests`, `/demand`, `/notifications`), `/partner/questions/{id}/answers`, `/partner/facts/{id}/confirm|correct`, `/partner/requests/{id}/decision` |
| 4.12 Консоль | `/console/registry`, `POST /console/characteristics {description}` → `runId`, `POST /console/characteristics/{key}/publish`, `/console/runs`, `/console/conflicts`, `/console/changes`, `POST|DELETE /console/world/buildings`, `GET|PUT /console/settings` (`llmModel`, `llmModelStrong` — какая модель включена), `/console/quality` (`llm` — сравнение LLM с правилами), `POST /console/demo/reset`; журнал LLM — `GET /console/llm/calls?task=&limit=` (запрос, ответ, вызовы инструментов, токены, цена, время) и `GET /console/llm/usage` (расход за сегодня и всего по задачам и моделям) |
| 4.13 Для разработчиков | MCP на `/mcp`, OpenAPI на `/api/docs` |

## Подборки и новый отель

`GET /moods?month=11` возвращает восемь `{id,title,description,count,countLabel,month,chips}`.
Без month используется текущий месяц. Счётчик требует все чипы с вероятностью ≥0,7 у одного
совместимого варианта номера; неизвестные, просроченные и конфликтные факты не входят. Нулевой счётчик
честный: например, без ответов о шторах подборка «Тишина и сон» может быть пустой. Для перехода в поиск:
`POST /searches {chips: mood.chips, trip: {month: mood.month}, useProfile: false}`.

Консоль оператора: `GET /console/hotels/reserve` → `{osmId,name,district,location,floors}[]`.
`POST /console/hotels {osmId}` → 202 `{runId,hotelId}`; смотреть SSE запуска, после завершения перечитать
поиск. Неизвестный объект — 404, уже добавленный — 409. Обе ручки требуют CONSOLE_WRITE.
`POST /console/demo/reset` удаляет добавленный отель; он снова появляется в резерве.

## Живые события (SSE)

- Шаг трассы `tool: "llm.<задача>"` — вызов LLM: в `output` модель, токены, `costUsd`, `cached`; в запуске
  `usage` суммирует их (`costUsd`, `cachedTokens`).
- `GET /runs/{runId}/events` — сначала все уже записанные шаги, потом новые; события `run.step`
  (`{runId, step: AgentStep}`), в конце `run.finished` (`{runId, status}`), поток закрывается. Комментарии
  `: ping` раз в 15 с — держат соединение.
- `GET /events?hotels=<id>&hotels=<id>` — `fact.changed` для открытых отелей; `&search=<id>` — `search.updated`.
- `EventSource` с относительным URL работает через шлюз без настроек.

## Отличия от 08 §9

- `Trip`: плюс `month` (если назван только месяц) и `area` (`center|khosta|adler|sirius|krasnaya_polyana`).
- `IntentChip.params`: ключи `maxWalkMinutes`, `minFloor`, `dogWeightKg`, `noClimb`, `what` (у неизвестного желания).
- `SearchResult.research[].runId` появляется после старта исследования (сам поиск исследование не запускает).
- `Hotel.osmId` — дополнительное поле. `Hotel.nearby` (только в `GET /hotels/{id}`, в списке пусто) — ближайшее место каждого вида из OSM в порядке показа: `kind` (beach, food, grocery, pharmacy, park, playground, station), `title`, `name`, `distanceM`, `distanceText` («350 м по прямой»), `osmRef`, `location` [lon, lat]. Расстояние по прямой; пешее время с подъёмами — `GET /hotels/{id}/routes/{target}`.
- `Scope` приходит без пустых полей (пусто = «все»), как в контракте.
