# Журнал сессий бэкенда

Новые записи пишем сверху. Шаблон:

```text
### дд.мм чч:мм МСК · <сессия> · <задачи>
- Сделано: …
- Как проверить: …
- Грабли: …
- Дальше: …
```

---

### 28.10 04:05 МСК · claude-core · B0.1, B0.2, B0.4, B0.5
- Сделано: каркас из шаблона без S3/админки/аватаров; роли гость/отельер/оператор; PostGIS и первая
  миграция; очередь `jobs` с арендой вместо outbox; стык доменных типов и портов.
- **Стык для других сессий (B0.5):**
  - `app/domain/knowledge/scope.py`: `Facade` (8 румбов, `azimuth`, `from_azimuth`), `Scope` (поля `None` =
    «все», `key` вида `f=SW,W|fl=4-*|m=3,11|rt=*`, `contains`, `cells(grid)`), `Grid(facades, floors)` →
    ячейки фасад × этаж × месяц, `compress(values_by_cell, grid)` → точные области. Категории номеров в сетку
    не входят: их связывает разметка фасадов.
  - `values.py`: `ValueType` (probability / number / category / record). Для `probability` наблюдение
    `value=True|False` + `confidence` = P(утверждение верно); `probability_of_yes` переводит в P(да).
  - `confidence.py`: подписи 08 §7, `pool` (лог-шансы с надёжностью), `decay`, `beta_update`.
  - `sources.py`: `SourceKind`, `Authority`, таблица надёжности источников по правилу.
  - `observation.py` (`Observation`, `Evidence`, атрибуции), `fact.py` (`Fact`, `FactChange`),
    `characteristic.py` (`Characteristic`, `Level`, `MethodKind`, `Checkable`).
  - `app/domain/geo/types.py`: `LonLat`, `WalkProfile`, `Route`, `RouteLeg`, `Reachable`.
  - `app/service/recipes/models.py`: размеченное объединение `Recipe` по `kind` (9 методов из 09 §5.2).
  - `app/service/tools/base.py`: протокол `Tool` (name, description, args_model, `__call__(args, ctx)`),
    `ToolContext`, `StepSink`.
  - `app/service/ports.py`: `Clock`, `LanguageModel` (`structured`, `run_tools`, `available`),
    `LlmUnavailableError`, `Budget`, `TerrainModel`, `Router`, `EventBus`, `RecordingEventBus`.
  - `app/service/knowledge/store.py`: `KnowledgeWriter.record(observations, reason)`, `KnowledgeReader`.
- Правила для гео-кода: `app/domain/geo/*` — чистые функции над numpy/shapely, без pydantic, SQLAlchemy,
  FastAPI, `app.db`, `app.infra`, `app.service`. Координаты в данных — WGS84; метрика — локальная
  равнопромежуточная проекция вокруг точки отеля.
- Как проверить: `make test-deps`, затем `cd backend && uv run pytest -q` — 70+ тестов, включая
  интеграционные на PostGIS.
- Грабли: образы PostGIS ставят в базу таблицы tiger/topology — `app/db/migrations.include_object`
  исключает чужие таблицы из autogenerate. Официальный образ PostGIS только amd64 (D-34).
- Дальше: B0.6 (import-linter), B0.3 (Compose), B0.7 (демо-вход), B0.10 (скелет API для фронта).

### 28.10 02:20 МСК · codex-pipeline · B1.1
- Сделано: CLI, кэш по SHA-256, детерминированный CSV.gz и MANIFEST; make data и ruff проходят
- Как проверить: `cd backend && uv run --group pipeline ruff check pipeline`; команды и проверки в `backend/pipeline/README.md`.
- Грабли: сырые данные кэшируются, в git только компактные артефакты; чужие файлы не менялись.
- Дальше: следующая задача линии данных по согласованному порядку.

### 28.10 01:40 МСК · claude-design · проектирование, без кода
- Сделано: собрали контекст (кейс, правила, концепция, фронт, шаблон). Через Context7 сверили PydanticAI
  2.0, MCP SDK 2.3 и OpenAI-совместимый endpoint Gemini. Написали 09; владелец согласовал архитектуру
  28.10 около 01:00. Завели `docs/backend/`: порядок работы, журнал решений D-01…D-33, доску задач,
  этот журнал, задания для ChatGPT. Обновили контракт 08 §9 до v2, планы 06 и 05 §9, `CLAUDE.md`,
  `AGENTS.md`. Ключ OpenAI для разработки положили в локальный `.env` (права 600, в `.gitignore`) и
  проверили бесплатным запросом списка моделей: ключ валиден, баланс не пополнен (D-25).
- Как проверить: `git status` показывает новые файлы в `docs/`; `git check-ignore .env` печатает `.env`.
- Грабли: `docker compose up` сам подхватывает `docker-compose.override.yml`, поэтому настройки разработки
  держим в `compose.dev.yml` (D-18). Публичный ключ age организаторов записан в 01 §8а. Документы ещё не
  закоммичены: ждём «да» владельца.
- Дальше: параллельно B0.1 (каркас), B1.0 (спайк горизонта), B0.9 (пробный перенос). Владельцу — O1, O6 и
  задания R5, R6 из `research-tasks.md`.
