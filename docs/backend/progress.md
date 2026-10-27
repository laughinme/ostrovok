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

### 28.10 02:34 МСК · codex-view · B2.5a
- Сделано: адаптер `app.infra.geo.terrain.NpyTerrain`, DEM int16 с mmap, билинейная интерполяция,
  дальний горизонт с шагом 30–90 м (по умолчанию 60), LRU на 128 горизонтов; общее чистое ядро `earth.py`.
- Публичный API: `NpyTerrain(directory: Path, *, step_m=60, cache_size=128)` структурно реализует
  `TerrainModel`; `elevation(points: FloatArray) -> FloatArray`: `(n,2)` WGS84 lon/lat → `(n,)` высот
  в метрах над морем. За покрытием/при nodata — NaN; на внешней половине крайнего пикселя — его высота.
  `far_horizon(origin: LonLat, eye_height_m: float, azimuths: FloatArray, max_km=40)` → `(angles, distances)`
  той же 1D формы: максимум угла в градусах и дистанция в метрах; высота глаза **абсолютная**, не AGL.
  При неполном покрытии луча оба результата NaN. Возвращаются копии; ключ кэша — координата, высота,
  азимуты и дальность. Новый экземпляр после обновления DEM сбрасывает кэш.
  `earth.curvature_drop(distances_m)` / `elevation_angle(heights_m, distances_m, eye_m)` — numpy broadcasting,
  метры → градусы, k=0,13; `ray_coordinates(origin_xy, azimuths, distances)` → `(rays,samples,2)` метров.
- **Стык B1.3:** `dem.json`: `crs: "EPSG:4326"`, `transform: [a,b,c,d,e,f]` (порядок Affine/rasterio,
  координата угла пикселя, выборка по центрам), `nodata` int|null; `dem_int16.npy`: 2D int16, метры.
  Поворот/скос Affine поддержан. Файлы DEM ещё не появились; реальная проверка после B1.3.
- Как проверить: ruff/format, mypy strict и 108 unit-тестов зелёные. Наклонная плоскость, центры/края,
  nodata, косой Affine; плоский горизонт совпадает с аналитической касательной к Земле, кэш защищён от
  изменения выходного массива, неизвестное покрытие не превращается в свободное небо.
- Грабли: DSM может включать крыши и лес; для явного добавления зданий B2.5 нужна коррекция по B1.0.
- Дальше: B2.5 после завершения B1.0; интеграционная проверка на DEM пайплайна при его появлении.

### 28.10 02:31 МСК · codex-view · B2.6
- Сделано: `sun.py`, Astral 3.2, сутки в Europe/Moscow, сезонность заката по всем дням года,
  последнее исчезновение верхнего края солнца за препятствием после 12:00 (уточнение до 1 с).
- Публичный API: `sun_position(location: LonLat, at: datetime) -> SunPosition(at, azimuth_deg,
  elevation_deg)` — только aware datetime; азимут от севера по часовой стрелке, высота видимого центра
  с рефракцией. `sun_events(location, day: date, *, eye_elevation_m=0) -> SunEvents(sunrise, sunset)`;
  высота глаза абсолютная в метрах. `sun_path(location, day, *, step_minutes=10)` → tuple позиций
  за гражданские сутки, включая следующую полночь. Все выходные времена — Europe/Moscow.
  `horizon_at(azimuth_deg, azimuths, angles) -> float`: 1D массивы градусов в порядке сектора,
  переход через север поддержан, вне FOV — NaN. `disappearance(location, day, azimuths, angles,
  *, eye_elevation_m=0) -> SunPosition | None`: последнее видимое солнце во второй половине дня,
  None если не появлялось; радиус диска 0,2667°. `sunset_over_sea_months(location, year, azimuths,
  angles, sea_visible, *, eye_elevation_m=0) -> dict[int,float]`: доля дней месяца, когда луч заката
  имеет видимую воду и горизонт ниже 0,5°. Доля дней — сезонность, не уверенность Монте-Карло.
- Как проверить: полный ruff/format, mypy strict и 88 unit-тестов зелёные. Независимые эталоны NREL SPA
  рассчитаны одноразовым `uv run --with pvlib` (0.16.1), без изменения зависимостей и без сети в тестах.
  Сочи 43,5855 N / 39,7231 E, уровень моря: закат 20.03 18:33:09/270,8112°,
  21.06 20:05:59/304,2646°, 23.09 18:17:06/270,4527°, 21.12 16:47:13/237,6344° (2026, МСК).
  Расхождение Astral по закату ≤18 с и <0,06°; восходы также проверены с допуском 2 мин.
  API pvlib и Astral сверены через Context7; pvlib не нужен в рантайме/CI.
- Грабли: ориентир 303° в исследовании приблизителен; фактический летний закат около 304,2°.
  Узкие просветы между минутными отсчётами исчезновения могут потребовать более частой сетки.
- Дальше: B2.5 после `done` B1.0; отдельно адаптер TerrainModel.

### 28.10 02:31 МСК · codex-ground · B2.7
- Сделано: энергетическая сумма, затухание 20 log10(d), экран −10, задняя сторона фасада −5…−15;
  дороги, ж/д, поздние бары/клубы, стройки; неизвестные мощности и часы остаются пробелами данных.
  Коммиты `25b1157`, `7668ca4`.
- Публичный API (`app/domain/geo/noise.py`):
  `NoiseSource(osm_ref, kind, geometry, day_db, night_db, activity_share=1)` — геометрия в локальных
  метрах, условная мощность на 1 м, None = источник неактивен в этот период; activity_share — доля
  времени 0…1. `facade_noise(receiver: Point, facade_azimuth: float, sources, period: "day"|"night",
  *, buildings=(), road_completeness=0.5, source_completeness=1, top_n=5) -> NoiseEstimate`.
  Азимут в градусах от севера по часовой стрелке; результат: index_db, category (тихо/умеренно/шумно),
  confidence, margin_db до ближайшего порога, sources с OSM id, расстоянием и потерями.
  Пустые/неактивные источники → index_db/category=None, confidence=0. Считать два периода отдельно.
  `energy_sum(levels_db) -> float|None`, `orientation_loss(facade_azimuth, source_bearing) -> float`.
- Публичный API (`noise_sources.py`): `NoiseFeature(osm_ref, geometry, tags, late_open=None)`;
  `noise_sources(features, *, aircraft_power_db=None, rail_activity_share=1) -> NoiseSources`
  с sources, unmodelled_refs, completeness. Передавать completeness в facade_noise и отдельно
  оценивать полноту дорог. late_open подаётся из проверки часов (B2.9).
- Как проверить: `make check` на временном снимке HEAD + только файлы этой линии: ruff/format,
  mypy strict, 7 import-контрактов, 119 тестов включая PostGIS. В общем дереве в это время менялись
  pipeline/catalog.py и sun.py; чужие промежуточные правки не исправлялись и не коммитились.
- Грабли: это модельный индекс, не LAeq. Некалиброванные пороги 30/45 — для условной мощности на 1 м;
  confidence ограничена 0.75 и уменьшается при пробелах. R5 не даёт мощность авиации: OSM ВПП/аэропорт
  без явно заданного параметра попадает в unmodelled_refs. Ж/д по умолчанию — индекс при проходе поезда,
  для среднего требуется известная доля времени; актуальную частоту из исторических данных не выводим.
- Дальше: B2.9 (часы и климат), затем B2.8; реальные данные ещё не появились.

### 28.10 02:29 МСК · codex-view · B2.4
- Сделано: равнопромежуточная проекция без pyproj; фасады по внешнему контуру, склейка соседних почти
  коллинеарных рёбер, внешние нормали независимо от порядка вершин, окна на четвертях и середине.
- Публичный API: `LocalProjection(origin: LonLat).forward(points: FloatArray) -> FloatArray`,
  `.inverse(points) -> FloatArray`: массивы `(..., 2)`, WGS84 lon/lat в градусах ↔ x восток/y север в метрах.
  `extract_facades(footprint: Polygon, *, tolerance_deg=5) -> tuple[Wall, ...]`: Polygon в локальных
  метрах, только внешний контур; `Wall(start, end, azimuth_deg, facade)` имеет `length_m`, `point(fraction)`.
  Азимут в градусах по часовой стрелке от севера; отдельные стены одного румба остаются отдельными.
  `window_points(walls, floors, base_elevation_m, *, fractions=(.25,.5,.75), floor_height_m=3)`
  возвращает `tuple[Window, ...]`; `Window` содержит wall, floor (с 1), fraction, xy (метры), elevation_m
  (абсолютная высота над уровнем моря). Точки на стене, собственное здание надо учитывать явно при расчёте.
- Как проверить: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy &&
  uv run pytest tests/unit -q` — зелёные, 76 unit-тестов. Прямоугольник, 45°, Г-контур, обратный порядок,
  склейка через начало кольца, двор, окна и roundtrip проекции.
- Грабли: внутренние дворы не дают внешних фасадов; соседние стены одного румба не объединяем через угол.
- Дальше: B2.6; B2.5 после `done` B1.0.

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
