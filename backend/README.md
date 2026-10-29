# Бэкенд «О!кно»

Python 3.13, FastAPI, PostgreSQL 17 + PostGIS 3.5, Redis. API и воркер используют одну кодовую
базу. Устройство знаний, алгоритмы и ограничения описаны в [ARCHITECTURE.md](ARCHITECTURE.md).
Все команды make ниже выполняются **из корня репозитория**.

## Запуск всего приложения в Docker

Нужен Docker с Compose v2. Данные региона входят в репозиторий, ключ LLM необязателен.

```sh
cp .env.example .env
docker compose up --build
```

Приложение: <http://localhost:8080>, Swagger: <http://localhost:8080/api/docs>,
OpenAPI: <http://localhost:8080/api/openapi.json>.
MCP: http://localhost:8080/mcp, транспорт Streamable HTTP; инструменты поиска, знаний
отеля, объяснения факта, сравнения и реестра. Подключение рассчитано на localhost;
для другого домена настройте TRANSPORT_SECURITY в app/api/mcp.py.
GET /health возвращает {"status":"ok"}; /api/ready проверяет Postgres и Redis.
Одноразовый сервис init создаёт JWT-ключи, применяет миграции и загружает имеющиеся сиды.
После него стартуют API и воркер. Отсутствующие файлы сида пропускаются: без полного
data/seed/ каталог доступен, а знания нужно собрать отдельно.

```sh
make logs     # логи сервисов
make down     # остановка с сохранением volumes
```

Основной Compose использует linux/amd64. На Apple Silicon make up-native запускает весь
стек с образами родной архитектуры через compose.dev.yml. Чистый старт на amd64 и его время
нужно проверять отдельно; наличие Compose не подтверждает соблюдение бюджета сборки.

## Локальная разработка бэкенда

Нужны Python 3.13, [uv](https://docs.astral.sh/uv/), Docker Compose и OpenSSL.
uv sync устанавливает также группу dev; дополнительные группы подключаются через
--group ([документация uv](https://docs.astral.sh/uv/concepts/projects/sync/)).

```sh
make env keys
(cd backend && uv sync --frozen)
make dev
(cd backend && JWT_PRIVATE_KEY_PATH=./secrets/jwt_private_key.pem \
  JWT_PUBLIC_KEY_PATH=./secrets/jwt_public_key.pem uv run python -m app.init)
make run
```

make dev поднимает только PostGIS на localhost:5432 и Redis на localhost:6379.
make run запускает API с reload на <http://localhost:8000>; в другом терминале запустите
make worker для фоновых исследований, публикаций и симулятора.
Пути JWT в команде app.init переданы явно: этот entrypoint берёт их из окружения процесса.
Для последующих запусков API пути уже заданы в backend/.env.

make install - более широкий вариант: устанавливает зависимости бэкенда и фронта,
создаёт env-файлы и ключи. Для него дополнительно нужен npm.
Существующие .env и JWT-ключи команды make env keys не перезаписывают.
Если 5432 или 6379 заняты, согласуйте опубликованные порты Compose и адреса в backend/.env.

## Демо-вход и API

GET /api/v1/auth/personas возвращает доступные персоны. В начальном наборе:
guest_anna, guest_mark, hotelier_salut, hotelier_marriott, hotelier_imeretinsky, operator.
Пароль для демо-входа не нужен:

```sh
curl -s http://localhost:8000/api/v1/auth/demo \
  -H 'Content-Type: application/json' -d '{"persona":"operator"}'
curl -s http://localhost:8000/api/v1/intents \
  -H 'Content-Type: application/json' -d '{"text":"Хочу тихий номер с видом на море в ноябре"}'
```

Защищённые ручки принимают Authorization: Bearer <access_token> из ответа входа.
Токены возвращаются в snake_case; большинство продуктовых схем - в camelCase.
Кабинет проверяет доступ отельера к конкретному отелю, консоль требует роль оператора.
Демо-персоны и тарифы предназначены для демонстрационного стенда.

## Окружение и LLM

Примеры - [корневой .env.example](../.env.example) и [backend/.env.example](.env.example),
полный источник настроек - [app/core/config.py](app/core/config.py).
Локальное приложение читает сначала корневой .env, затем backend/.env; переменные
процесса имеют приоритет. Compose читает корневой .env и задаёт контейнерные адреса БД/Redis
и пути JWT отдельно. Настройки приложения читаются при старте.

Без ключа либо без имени модели работают правила. Для LLM задайте в локальном .env
LLM_API_KEY, LLM_MODEL и при необходимости LLM_BASE_URL OpenAI-совместимого провайдера,
затем перезапустите API и воркер. Пустой LLM_BASE_URL использует стандартный endpoint OpenAI.
В корневом примере выбран провайдер жюри Polza.ai и openai/gpt-5.6-luna, но ключ пустой:
после обычного cp .env.example .env приложение работает на правилах. Для запуска LLM
жюри расшифровывает корневой secrets.env.age в .env перед docker compose up --build.
LLM улучшает разбор намерений, план Куратора и формулировки компромиссов при создании поиска;
георасчёты от неё не зависят. Проверка формулировок ограничивает длину и новые числа,
но не заменяет смысловую проверку текста.
Разбор свободных ответов отельера и демо-ответы тоже используют LLM; структурированные
формы и отказ провайдера обслуживаются правилами. Рассуждения - low, у Куратора medium.

LLM_MODE=off принудительно отключает LLM. Переключатель auto/off в консоли тоже может
её отключить, но не создаёт провайдера, если приложение стартовало без ключа.
При ошибке провайдера, тайм-ауте или лимите LLM-сценарии переходят на правила.
Кэш результатов хранится в БД. Ключи остаются только в локальном окружении.

Опциональный профиль Compose local-llm добавляет Ollama и по умолчанию выключен.
Модель нужно загрузить отдельно; контейнерный endpoint для приложения -
http://ollama:11434/v1. Этот профиль не входит в обязательный запуск без ключа.

| Переменные | По умолчанию / назначение |
|---|---|
| LLM_BASE_URL, LLM_API_KEY, LLM_MODEL | Пустые; endpoint, ключ и имя модели |
| LLM_MODEL_STRONG | Пусто; поле есть, отдельная сильная модель сейчас не подключена |
| LLM_MODE, LLM_TIMEOUT_SEC | auto, 15 секунд |
| LLM_DAILY_CALL_LIMIT | 300 обращений к адаптеру в сутки UTC; один запуск адаптера может сделать несколько запросов модели |
| HOTELIER_SIMULATOR, SIMULATOR_DELAY_SEC | on, 5-30 секунд; симулятор ответов отеля |
| POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB | okno в демо-примере; переменные Compose для PostgreSQL |
| DATABASE_URL, REDIS_URL | Обязательны для приложения; локальные адреса заданы в backend/.env.example |
| DB_POOL_SIZE, DB_MAX_OVERFLOW | 10, 10 |
| JWT_PRIVATE_KEY_PATH, JWT_PUBLIC_KEY_PATH | Локально ./secrets/jwt_*.pem, в Compose /keys/jwt_*.pem |
| JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, JWT_ALGO | Можно передать PEM напрямую вместо файлов; алгоритм RS256 |
| ACCESS_TTL, REFRESH_TTL | 43200, 2592000 секунд |
| CSRF_HMAC_KEY | В Settings change-me, в демо-примере отдельное значение; для prod нужно заменить |
| COOKIE_SECURE, COOKIE_SAMESITE, COOKIE_DOMAIN | false, lax, пусто |
| APP_STAGE, DEBUG | dev, false; локальный пример включает debug; при prod debug запрещён |
| LOG_LEVEL, LOG_JSON, SQL_ECHO | INFO, false, false |
| API_DOCS_ENABLED, CORS_ALLOW_ORIGINS | true, пусто; локальный пример разрешает http://localhost:5175; список origins через запятую |
| RATE_LIMIT_ENABLED, AUTH_RATE_LIMIT_PER_MINUTE | true, 10; текущие HTTP-лимиты используют этот порог |
| LLM_RATE_LIMIT_PER_MINUTE | 30; отдельный порог объявлен, но сейчас не используется |
| DATA_DIR | Каталог backend/data; относительный путь разрешается от backend/ |
| JOBS_BATCH_SIZE, JOBS_POLL_INTERVAL_SEC | 4, 0.5 секунды |
| JOBS_LEASE_SEC, JOBS_MAX_ATTEMPTS | 120 секунд, 5 попыток |
| GEO_WORKERS | 2; поле зарезервировано, пул процессов по нему сейчас не создаётся |

## Команды и данные

| Команда | Что делает сейчас |
|---|---|
| make dev | Только зависимости локального API: PostGIS и Redis |
| make test | Поднимает тестовые контейнеры и запускает весь pytest |
| make check | Ruff, форматирование, mypy strict, семь import-контрактов и весь pytest |
| make data | Пересобирает регион: закреплённые PBF Geofabrik → OSM → DEM → климат → демо → граф → профили окна → MANIFEST; нужна сеть при пустом кэше и группа pipeline |
| make collect | Исследователь по всем отелям в шести процессах (--shard); пишет в БД, на macOS удерживает систему от сна через caffeinate, экспорт отдельно |
| make export-seed | Выгружает знания и трассы из БД в backend/data/seed |
| make eval | Метрики парсеров, Куратора, покрытия и поиска; отчёт в БД и терминале, без LLM |
| make eval-llm | Цель пока вызывает отсутствующую подкоманду eval-llm; доступен CLI eval --llm для настроенной модели намерений |
| make openapi | Перезаписывает frontend/openapi.json схемой приложения; нужны настройки и JWT-ключи, работающая БД для экспорта не требуется |

После инициализации БД можно собрать один отель, весь регион и экспортировать результат:

```sh
(cd backend && uv run python -m app.cli collect --hotel way/227214566 --keys sea_view)
make collect
make export-seed
```

collect не использует LLM. Для параллельного CPU-сбора запускайте отдельные процессы
с --shard 0/4 … --shard 3/4; каждый получает свою четверть отелей.
--concurrency регулирует конкурентные задачи внутри процесса, не заменяет процессное разделение.
claims в CLI добавляет явно демонстрационные заявления отельеров из скрытых профилей.

data/region/ - реальные открытые геоданные. data/demo/ - синтетические категории номеров,
цены, правила, персоны и история. data/seed/ при наличии содержит наблюдения, факты,
конфликты, вопросы и трассы. Загрузчик знаний ждёт все семь JSONL.gz из
service/seed_export.py. Изменение входов сида может перезагрузить зависимые таблицы:
это не механизм сохранения рабочих изменений БД.

Источники и лицензии: © OpenStreetMap contributors (ODbL 1.0), Copernicus DEM (лицензия
Copernicus DEM; © DLR e.V. 2010–2014, © Airbus Defence and Space GmbH 2014–2018),
Open-Meteo и поставщики моделей (CC BY 4.0).
Ссылки, даты, размеры и состав - в [data/MANIFEST.md](data/MANIFEST.md),
воспроизведение - в [pipeline/README.md](pipeline/README.md).
Климат - нормы, шум - условная модель, маршруты - оценка по OSM/DSM; демо-свойства
не являются сведениями, подтверждёнными реальными отелями.

## Добавить характеристику

В [data/registry/characteristics.yaml](data/registry/characteristics.yaml) добавьте элемент
списка characteristics. Пример использует существующий метод и не требует нового кода:

```yaml
- key: pharmacy_nearby_10m
  title: Аптека в десяти минутах пешком
  synonyms: [аптека рядом, аптека в десяти минутах]
  level: hotel
  value_type: probability
  recipe:
    kind: poi_nearby
    poi: {tags: {amenity: [pharmacy]}}
    within_minutes: 10
  ttl_days: 90
  authority: freshest
  statement:
    "yes": Аптека в десяти минутах пешком
    "no": Аптека в десяти минутах пешком не найдена
```

Для новой записи версия по умолчанию 1, статус published; при изменении определения
существующего ключа увеличьте version. Схемы рецептов - в service/recipes/models.py,
парсер и загрузчик - в service/knowledge/registry.py.
Для poi_nearby нужно ровно одно из within_minutes и within_m.
YAML-ключи "yes", "no" и значение "24_7" берите в кавычки.
Повторите локальную команду app.init из раздела запуска, затем выполните
collect --keys pharmacy_nearby_10m и проверьте факты и трассы.

Альтернатива - Куратор без редактирования YAML. Войдите оператором, вызовите
POST /api/v1/console/characteristics с {"description":"Аптека в десяти минутах пешком"}.
Ответ 202 содержит runId. При запущенном воркере прочитайте /runs/{runId} или его
/events, проверьте рецепт и пробный прогон, затем вызовите
POST /api/v1/console/characteristics/{key}/publish. Черновик из консоли до публикации
не участвует в обычном реестре поиска. Правила Куратора покрывают ограниченный словарь;
с LLM можно предложить рецепт по более свободному описанию, с той же валидацией.

## Добавить метод

1. Добавьте значение в MethodKind (domain/knowledge/characteristic.py), схему параметров
   с уникальным kind и включите её в объединение Recipe (service/recipes/models.py).
2. Поместите чистый расчёт в отдельный модуль domain/geo/, файловый адаптер при необходимости -
   в infra/geo/. Домен не импортирует FastAPI, Pydantic, SQLAlchemy или слои приложения.
3. Реализуйте MethodExecutor в service/recipes/methods/<method>.py по примеру
   [poi_nearby.py](app/service/recipes/methods/poi_nearby.py) или [view.py](app/service/recipes/methods/view.py):
   method: ClassVar[MethodKind], async collect(call: MethodCall, env: Environment) -> list[Finding].
   Рецепт берите через call.recipe_of(YourRecipe), шаги пишите через call.tracer.
4. Finding возвращает scope, value, confidence, source_ref, описание метода,
   доказательства и оговорки. Для вероятностного значения используйте bool и уверенность
   именно в нём; отсутствие данных выражайте NoDataError. Исполнитель не пишет факты:
   наблюдения и TTL добавляет Исследователь, сверку выполняет KnowledgeStore.
5. Зарегистрируйте исполнитель в bootstrap.default_executors(). Если он зависит от изменения
   зданий, добавьте правило радиуса влияния в domain/knowledge/influence.py.
6. Добавьте тест ядра и исполнителя в tests/unit/geo/test_<method>.py: сцена с известным
   ответом, отсутствие данных, границы Scope, единицы, источник и корректное направление
   вероятности для отрицательного ответа. При новых запросах БД добавьте интеграционный тест.
   Проверьте рецепт в tests/unit/test_recipes.py, затем выполните make check.

## Проверки

Unit-тесты не требуют БД и не обращаются к LLM. Интеграционные тесты используют настоящий
PostGIS и Redis и пересоздают свою схему. При параллельной работе задавайте отдельную БД
и отдельный номер Redis для каждой сессии. После make test-deps создайте БД, например:

```sh
make test-deps
docker compose -p okno-test -f docker-compose.test.yml exec -T postgis-test \
  createdb -U okno okno_docs_test
export TEST_DATABASE_URL=postgresql+asyncpg://okno:okno@localhost:5439/okno_docs_test
export TEST_REDIS_URL=redis://localhost:6380/14
make test-unit
make check
```

createdb нужен один раз. Адреса TEST_* читаются фикстурами pytest, а не Settings приложения.
Тесты LLM используют фейковые модели. Сетевые источники данных воспроизводятся пайплайном,
не в unit-тестах. Для отдельных проверок доступны make lint, make typecheck, make arch;
пайплайн проверяется через cd backend && uv run --group pipeline pytest tests/pipeline -q.
make eval сохраняет отчёт для GET /api/v1/console/quality (нужна роль оператора).
Независимый эталон data/eval/gold.yaml пока пуст: accuracy и ECE характеристик без меток
не вычисляются. nDCG использует фиксированный набор оценок по расчётным фактам; он проверяет
согласованность ранжирования, не точность картины мира. CLI eval --llm дополнительно
оценивает настроенную LLM на намерениях и расходует API-кредиты; этот режим запускайте отдельно.

Прогон качества 28.10.2026, 09:27 МСК: F1 намерений - 0,8721, точность полей поездки - 0,8958;
ответы отельера - 72/72 машинных поля и 6/6 переспросов; Куратор - 0,5714 по методу
и 0,4545 по параметрам; nDCG@10 - 0,9176 на 20 запросах внутри фиксированных пулов.
Это оценки по фактам расчёта; независимый gold пока не размечен. Методология и ограничения:
[data/eval/README.md](data/eval/README.md).
