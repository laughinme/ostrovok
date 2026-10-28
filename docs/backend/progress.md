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

### 28.10 03:16 МСК · codex-osm · B1.8, линия B1.2 → B1.5 → B1.8 завершена
- Сделано: Geofabrik → региональный кэш → здания/объекты/море → DEM/климат/демо → граф
  запускается через `make data` / `python -m pipeline all`. Добавлен отдельный этап `pbf`,
  явный порядок этапов, происхождение PBF и MD5 в MANIFEST, размеры и проверки строгих границ
  60 000 000 / 50 000 000 байт. Коммиты `e7d8d4e`, `7adbc68`. Общий Makefile освобождён.
- **Публичный API:** контракты CSV и NPZ из B1.2/B1.5 неизменны.
  `pipeline.inventory.size_inventory(directory: Path) -> tuple[list[Path], int]` возвращает
  отсортированные файлы и байты без самого MANIFEST; при достижении лимита выбрасывает ValueError.
  `provenance() -> list[str]` — строки атрибуции/снимков из локальных source JSON;
  `object_counts(directory) -> list[str]` — количества CSV, графа и демо-карточек.
  `pipeline.manifest.run() -> None` публикует data/MANIFEST.md; CLI `pbf` подготавливает оба GPKG.
- Размеры опубликованных файлов на завершение: **28 167 434 байт (28,17 МБ)**, 19 файлов;
  крупнейший — `dem_int16.npy`, **11 178 800 байт (11,18 МБ)**. Граф — 4 973 463 байт (4,97 МБ),
  здания — 5 751 312, объекты — 5 160 796, море — 72 127. Запас до 60 МБ — 31,83 МБ.
  В MANIFEST учтены и опубликованные параллельными сессиями справочники/наборы оценки.
- Как проверить: новый снимок дерева вне рабочего каталога, удалены все выходы региона кроме
  неизменяемых hotels.csv.gz/hotel_selection.json и сгенерированные demo YAML; в `.cache/osm/`
  оставлены только два исходных PBF и source JSON, без GPKG. Сырые DEM/погодные кэши переиспользованы.
  `make data` прошёл при принудительном запрете HTTP (`httpx.Client.send`/AsyncClient.send);
  **SHA-256 всех восстановленных выходов совпал, различий 0**, кроме времени MANIFEST.
  Это также проверило сохранность каталога отелей. Реальная загрузка соседнего PBF и проверка
  обоих MD5 были выполнены в B1.2, полный download при этой офлайн-проверке не повторялся.
  Полный **make check: 327 passed**, ruff/format, strict mypy и 7 import-контрактов — зелёные
  на проверенной базе + финальные файлы линии; PostgreSQL `okno_osm_test`, Redis DB 13.
  Unit в общем дереве перед финалом: 274 passed; затем другие сессии продолжили менять код.
- Грабли: один более свежий снимок HEAD уже содержал чужой executor без его изменений TagFilter /
  CatalogRepository и не проходил mypy; общий каталог также ловил незавершённые lint-правки
  соседних сессий. Поэтому итоговый make check выполнен на ранее проверенной целостной базе
  со всеми финальными файлами пайплайна. Чужие файлы не исправлялись и не включались в коммиты.
  Временный window_profiles.tmp другой сессии в отчёт опубликованных данных не включён.
- Дальше: B1.7 / claude-core — COPY региона и идемпотентный сид; при добавлении новых данных
  пересобирать MANIFEST. Публичные стыки геоданных и графа — в двух записях codex-osm ниже.

### 28.10 03:13 МСК · codex-ground2 · B5.6, часы и закат
- Сделано: `domain.geo.visits.open_for(hours, arrival: datetime, stay_minutes: int) -> bool`
  подтверждает каждую минуту посещения в локальные даты, включая полночь; неизвестные/сложные часы
  не подтверждают открытие. `service.geo.day_places.meal_candidates(...,late=True)` требует ресторан,
  открытый на всё посещение и в 23:30 того же дня; pharmacy_candidates — полную неделю 24/7.
- **Публичный API:** `day_sunset(hotel,env,day,beaches) -> DaySunset(at,from_window,spot,osm_ref,route,
  window_scope)`. GeoReader.facts_of(hotel,key) возвращает полные Fact, чтобы не потерять месяцы:
  из окна — только True/OK, confidence≥0,65, действующий факт нужного месяца. Иначе выбирается
  ближайшая доступная пешком морская точка ≤40 минут с проверкой закатного азимута данной даты.
  `sunset_site_visible(location,day,env,shapes) -> bool`: то же ядро горизонта/DSM/зданий, стоящий
  наблюдатель 1,6 м, угол горизонта <0,5°, открытое море по лучу 1…40 км; без DEM/моря не подтверждает.
- Как проверить: make check — 333 passed; ruff/format/mypy/7 контрактов зелёные. Тесты проверяют
  день недели, полночь, закрытие во время визита, поздний ужин, 24/7, месяц/просрочку факта,
  лето/ноябрь на одном берегу и здание, перекрывающее закат.
- Грабли: закат — геометрическая модель, облака не прогнозируются; астрономическое время в МСК.
- Дальше: сборка DayPlan, REST, прогон и визуальная проверка трёх реальных отелей.

### 28.10 03:08 МСК · codex-ground2 · B2.13-geo, REST
- Сделано: GET /api/v1/hotels/{UUID}/noise, /routes/{target:path}, /climate?from=&to=;
  camelCase-схемы `api.schemas.ground`, сервис GroundQueries(db,env), ленивое создание окружения
  в sync-зависимости ground_queries (граф загружается в пуле потоков под Lock один раз).
- **Публичный контракт:** noise → hotelId,facades[{facade,day,night}], у каждого периода indexDb
  (условный индекс либо null),category,confidence,sources[{osmRef,kind,indexDb,distanceM,screened,
  orientationLossDb}], completeness,unmodelledRefs,caveats,attribution.
  routes принимает beach/center/station/osm:way/ID (node/relation тоже), profile=walk|stroller|wheelchair;
  → targetRef,targetName,profile,there/back {minutes,lengthM,climbM,descentM,steps,crossings},
  geometry GeoJSON LineString WGS84 туда, elevationProfile [(метры пути,метры высоты|null)],
  estimated,uncertainShare,osmRefs,caveats,attribution. Нет пути — 404, неверные аргументы — 422.
  climate → checkIn/checkOut,days,station,period,values/coverage/confidence с airMaxC/airMinC/waterC/
  sunHours/rainDays/daylightH,monthDays,caveats,attribution. To исключён; неверный диапазон — 400.
- Проверки: полный make check — 270 passed, ruff/format/mypy/7 контрактов зелёные.
  Через реальный ASGI + локальный PostGIS: Морская звезда way/53549358 → пляж way/70118501,
  1499 м, 17,6/18,7 мин; шум 4 фасада; климат 5 дней. Marriott way/227214566: море/пляж не выдуман,
  маршрут 404, вода null, шум и климат 200. Жемчужина B1.0 не входит в каталог — корректный hotel 404.
- Дальше: B5.6, «Ваш день» на трёх отелях, карты и профили для визуальной проверки.

### 28.10 03:06 МСК · codex-osm · B1.5
- Сделано: реальный `walk_graph.npz`, 150 612 узлов, 322 182 направленных ребра, 4,97 МБ.
  Несокращённые сегменты OSM в 2 км от отелей, высоты NpyTerrain из DEM B1.3; foot/access,
  pedestrian one-way, закрытые шлюзы, слои мостов/тоннелей. Коммиты `c4bcc8e`, `66703e1`,
  `770c742`, `adb0fd8`. Карты/профили отрисованы и просмотрены, скрипт graph_plot закоммичен.
- **Публичный API для claude-core / B2.10:** потребители D-38 не менялись.
  `WalkGraph.from_file(Path('data/region/walk_graph.npz'))`,
  `ScipyRouter.from_file(path, *, max_snap_m=100)`. NPZ без pickle: nodes `(150612,3)` float64
  (WGS84 lon,lat, абсолютные метры DSM); edges `(322182,2)` int32, явные направления;
  length_m float64 (метры), steps/crossings int32, uncertain bool, osm_refs Unicode `way/…`,
  атрибуты по одному на направленное ребро. Читатель приводит индексы/счётчики к int64.
  Ступени по step_count распределены без умножения суммы на число сегментов; без тега оценка
  длина / 0,3 м и uncertain. Crossing — пересечённая ось пути/крупной дороги: два железнодорожных пути
  могут дать 2, это не объединённый физический переход. Неотмеченные пересечения uncertain.
- **API пайплайна:** `walk_topology.extract_network(records, area) -> WalkNetwork`, area — UTM37N;
  `build_graph(network, elevation, *, blocked=None) -> WalkGraph`, callback принимает `(n,2)`
  lon/lat и возвращает `(n,)` метров; при дырках DEM ошибка. `walk_crossings.annotate_crossings`
  добавляет счётчики, `blocked_nodes(points)` возвращает запрещённые координаты.
  `graph.save_graph(graph, path)` атомарно пишет и перечитывает NPZ; `graph.run()` перед публикацией
  проверяет три маршрута. `graph_validation.verify_routes(graph) -> dict` пишет диагностику в
  `.cache/osm/walk-validation.json`; `python -m pipeline.graph_plot` рисует соседний PNG.
- Как проверить: `uv run --group pipeline python -m pipeline graph`; 200/200 отелей имеют узел
  в 100 м, 119/306 representative_point пляжей попадают в граф. Маршруты туда/обратно:
  Swissotel Камелия → way/207933133: 882 м, 10,6/12,1 мин, 0 ступеней, 2 пересечения;
  Ретрит Дом Ливерпуль → Робинзон way/248626744: 1755 м, 23,2/25,8 мин, 167 ступеней,
  4 пересечения; Островок → way/53086451: 527 м, 6,1/6,6 мин, 0 ступеней/пересечений.
  Набор data пока 28,10 МБ. Unit в общем дереве: **203 passed**; полный **make check: 256 passed**,
  ruff/format, strict mypy, 7 import-контрактов — на изолированном HEAD + свои файлы,
  PostgreSQL `okno_osm_test`, Redis DB 13 (общее дерево в это время меняли другие сессии).
- Грабли: GDAL не сохраняет node ID внутри way: топология по точным исходным координатам и слоям,
  совпадающие разные OSM-узлы одного уровня неразличимы. Пересечения считаются в исходной CRS:
  проекция разных хорд может дать микрозазор у общего узла. DSM не моделирует отдельно настил
  мостов. Входы на пляж/доступность не проверены на местности; подходы к графу неизвестные.
  Доля неизвестного на трёх маршрутах 0,57/0,63/0,18, не выдавать их за гарантированно доступные.
- Дальше: codex-osm берёт B1.8; B1.3, B1.4, B1.6 готовы, остаются MANIFEST и полный make data.

### 28.10 03:06 МСК · codex-ground2 · B2.13-geo, общий расчёт
- Сделано: `service.geo.noise.hotel_noise(hotel, env, kinds=...) -> HotelNoise` готовит единую сцену
  и возвращает `.facades: tuple[FacadeNoise(facade,day,night),...]`, completeness, source_count,
  road_count, unmodelled_refs. day/night — прежний NoiseEstimate, index_db может быть None.
  NoiseExecutor использует этот же расчёт. `service.geo.routes.hotel_route(hotel,env,target,profile)`
  → RouteView(walk,coordinates,elevation_profile): геометрия WGS84 туда; профиль (м,м либо None).
  target beach/center/station или osm:way/ID (также node/relation). `GeoReader.feature(osm_id)`
  читает объект точно по ID. center — OSM place city/town или именованная администрация города;
  не произвольный POI. `service.geo.climate.hotel_climate(hotel,env,start,end) -> TripClimate`
  (estimate: ClimateEstimate,station,period): 1…366 ночей, end исключён, нормы, не прогноз.
- Как проверить: make check в отдельной БД/Redis — 258 passed, ruff/format/mypy/7 контрактов зелёные.
- Грабли: если граф есть, но пути нет, nearest_walk теперь возвращает None; не подменяет недоступный
  путь прямой. Без графа stroller/wheelchair не обещают доступность. Для walk сохраняется явная оценка.
- Дальше: подключение REST и проверка на реальных отелях; затем B5.6.

### 28.10 03:02 МСК · codex-ground2 · B2.10-ground
- Сделано: area_stat/steep_share, графический слой уклонов и запасная оценка DEM; регистрация в bootstrap.
- **Публичный API:** `service.geo.area.slopes_near(env, origin: LonLat, radius_m: float) -> SlopeStat`;
  `infra.geo.area.GraphAreaSlopes(graph).within(origin, radius_m) -> SlopeStat|None` за портом
  `service.ports.AreaSlopes`, подключённым как `env.extras["area_slopes"]`. `SlopeStat` содержит
  `share` (0…1), `samples: tuple[SlopeSample,...]`, `estimated: bool`; образец — WGS84 coordinates,
  slope=rise/run (безразмерный, не проценты), osm_ref или None. Обратные дуги одного OSM-сегмента
  считаются один раз; учитываются пересекающие круг сегменты. Без графа — DEM-сетка 60 м с центральными
  разностями ±30 м; NaN исключается, пустой результат — NoDataError. Это склоны, не доказанные улицы.
- `AreaStatExecutor.collect` принимает AreaStatRecipe(metric="steep_share"), value bool по threshold;
  evidence MAP_LAYER содержит share/radiusM/threshold/estimated/segments и OSM ID, трасса route.edges_within.
- Как проверить: ruff/format, mypy strict, 7 import-контрактов зелёные; make check в отдельной БД
  okno_ground2_test / Redis DB12 — 248 passed; после публикации графа unit — 200 passed.
- Грабли: DSM содержит здания/деревья; DEM-оценка не равна доле крутых улиц, caveat сохранён.
- Дальше: B2.13-geo (шум/маршруты/климат), затем B5.6. LLM не вызывался.

### 28.10 03:00 МСК · codex-terrain · B1.6, линия B1.3 → B1.4 → B1.6 завершена
- Сделано: 200 демо-карточек, 694 категории, 1388 тарифов (`ef0350c`); 200 скрытых профилей,
  981 привязка категорий к фасадам/этажам (`192cda0`); история Анны и CLI (`80b9b3a`).
  Пять районов: центр 70, Хоста 25, Адлер 45, Сириус 30, Поляна 30. Исходные users.yaml не менялись.
  Воспроизводимые шаблоны R6 вынесены в `pipeline/demo_reference.yaml`: пайплайн не зависит от приватных docs.
- **Публичный API:** `pipeline.demo_cards.generate_cards(hotels: list[dict[str,str]], reference: dict, *, seed=20261028) -> dict`
  возвращает `{"isDemo":true,"seed":...,"price_basis":...,"hotels":{osm_id:card}}`.
  card: rating (демо 0…10), ratingLabel, tagline, amenities (строки), rooms (2–5).
  room: уникальный строковый id, name, area (м² с санузлом), bed, capacity (человек), rates.
  rate: уникальный id, meal, cancel, pay, price (демо ₽/номер/ночь, ноябрь 2026), tag, isDemo.
  Seed независим для каждого osm_id; порядок и добавление других отелей не меняют существующую карточку.
  Незвёздные отели используют шаблон 3★ только как диапазон генерации; звёзды им не назначаются.
- **Стык симулятору:** `pipeline.demo_truth.generate_truth(hotels, cards, reference, coastal_ids: set[str], *, seed=20261028) -> dict`
  возвращает `{"isDemo":true,"seed":...,"hotels":{osm_id:profile}}` → `data/demo/hidden_truth.yaml`.
  profile: pets_policy {allowed, kinds (dog/cat), max_kg (кг или null), fee_rub (₽/сутки), fee_basis};
  soundproofing/blackout/ac/elevator/step_free — bool; facade_rooms — {room_type_id, facade (N…NW),
  floor_from, floor_to} (этажи включительно, 1…floors). Только реальные стороны building_facades из контура.
  AC согласован с amenities; step_free до верхних этажей требует лифта. persona — краткий/многословный/расплывчатый.
  `coastal_hotels(hotels) -> set[str]` выбирает ≤800 м от реального моря; у 39 из них маркетинговое
  claims.sea_view_all_rooms=true. Это заявление симулятора, не вычисленный факт о видимости.
- **Стык профилю вкуса:** `pipeline.demo_history.generate_history(hotels, cards) -> dict`
  → `data/demo/history.yaml`: `guests.guest_anna` содержит bookings (2 завершённые брони с реальными
  osm_id, room_type_id и rate_plan_id), saved_hotels (2 osm_id), rejected_hotels (2 записи с причиной),
  chip_edits (aware ISO timestamps, characteristic, from/to = nice/must, operator/value, reason).
  night_noise становится must/eq/true, sea_view — nice/eq/true, steep_streets — must/eq/false.
  expected_taste — эталон «Тишина важнее вида», «Не любит подъёмы»; все события — вымышленные, помечены демо.
- Как проверить: `uv run --group pipeline python -m pipeline hotels`; prerequisite — B1.2 (каталог и sea.wkb.gz).
  Последний полный `make check`: **236 passed, 1 skipped** (B1.5 ещё не публиковала NPZ), ruff/format,
  mypy strict и 7 import-контрактов зелёные. Все наши тесты в tests/unit/geo/.
  `python -m app.init` в отдельной БД okno_terrain_seed загрузил 200 отелей, 694 room_types,
  цены и isDemo у всех 200; второй запуск ничего не перезагрузил. Основная БД не затронута.
  DEM, климат и все demo YAML повторно сгенерированы из кэша с совпадением SHA256 каждого файла.
- Грабли: RoomTypesLoader читает только room_types.yaml; hidden_truth и history должны использовать
  будущие симулятор и профиль, отдельных загрузчиков для них сейчас нет. `app.init` не вызывает LLM.
  **Для claude-core / B2.10:** текущий ClimateExecutor жёстко пишет «за 10 лет» и confidence=0.9;
  данные B1.4 содержат лишь 2–3 полных года воды. Следует учитывать station.normals[].years и
  water_years_by_month, а в доказательстве явно отличать погоду 2016–2025 от воды 2023–2025.
- Дальше: B1.5 использует DEM; B1.7 может сидировать карточки. Артефакты и источники — в MANIFEST;
  текущий набор около 23 МБ без ещё готовящегося walk_graph.npz. LLM API не вызывался.

### 28.10 02:54 МСК · codex-osm · B1.2
- Сделано: B1.2 завершена через Geofabrik за 26.10, MD5 проверен. Южный ФО дополнен соседней
  Грузией (D-39): иначе берег обрывался внутри bbox. Региональные GPKG в `.cache/osm/`, в git
  только компактные выходы. Коммиты `d0b07e6`, `fdc6cd5`, `b78d991`. Отели не пересобирались.
- **Публичный контракт данных для claude-core / B2.10:** `buildings.csv.gz` —
  `osm_id,wkb,height_m,levels,height_source,building`, высоты в метрах; `height_source`:
  `osm_height` (309), `osm_levels` (25 089), `default` (38 361). Только здания в 2 км от отелей.
  `osm_features.csv.gz` — `osm_id,kind,name,tags,wkb`, `tags` — JSON всех тегов, включая `ele`,
  `opening_hours`, `cuisine`, `foot`, `step_count`. 29 733 road, 885 railway, 8 runway, 15 405 poi,
  306 beach, 6 265 peak с ele, 436 construction, 176 bar_club, 161 park, 60 station.
  Дороги/жд — 1,5 км, POI — 2,5 км, пляжи/ВПП — регион, вершины — регион + 40 км.
  `sea.wkb.gz` — gzip ASCII WKB hex MultiPolygon, море справа от исходного направления берега,
  острова исключены. Все геометрии WGS84 lon/lat, ID вида `node/…`, `way/…`, `relation/…`.
- **API пайплайна:** `pipeline.pbf.snapshot(url=SOURCE) -> Path` проверяет/скачивает PBF;
  `regional_cache(source: Path|None=None) -> Path` даёт GPKG; `regional_records(layer, *, where=None)`
  возвращает `list[dict]` с `osm_id`, `tags: dict[str,str]`, `geometry: shapely`, дедуп по ID.
  `pipeline.osm.hotel_buffers(radius: float)` — объединение кругов в UTM 37N, радиус в метрах.
  `pipeline.osm.export(records) -> None` пишет CSV; `pipeline.sea.run(coastlines=None) -> None`
  пишет маску (с явными геометриями без сети; None сохраняет необязательный путь Overpass).
- Как проверить: `uv run --group pipeline python -m pipeline osm`; 63 759 зданий и 53 435 объектов
  валидны, ID уникальны, здания всех 200 отелей найдены, точки отелей не в море. Ruff/format,
  mypy strict, unit: **167 passed, 1 skipped** (ждёт граф). Первую проверку делали в снимке HEAD
  из-за незавершённых правок соседних сессий, финальная прошла на общем дереве. Размеры вместе
  с уже появившимися DEM/климатом: 22,24 МБ. LLM не вызывался.
- Грабли: GDAL выдаёт JSON-теги словарями, pandas — отсутствующие osm_way_id как NaN; оба случая
  обработаны. У дефолтного osmconf.ini терялся ele, поэтому своя конфигурация all_tags без ignore.
  GDAL предупреждал о некорректных удалённых кольцах; экспорт исправляет make_valid, все выходы
  проверены. Районный GPKG — ~207 МБ, остаётся только в игнорируемом кэше.
- Дальше: codex-osm берёт B1.5; B1.8 после появления всех данных B1.6. claude-core может читать CSV.

### 28.10 02:53 МСК · codex-view · B2.5 завершена, вся линия вида из окна
- Сделано: B2.4 → B2.6 → B2.5 и адаптер TerrainModel (B2.5a) завершены; исправление фасадов B2.4a
  проверено на 200 контурах. Публичные сигнатуры и единицы B2.5 — в записи «API готов» ниже;
  финальные проверки `8677f4a`, ускорение геометрии без изменения API `591a5d8`.
- Проверки: **make check полностью зелёный** — ruff check/format, mypy strict, 7 import-linter
  контрактов, **209 passed, 1 skipped**. Пропущен только чужой тест B1.5: walk_graph.npz ещё не опубликован.
  Тест DEM B1.3 уже активировался и прошёл; все 200 отелей имеют конечную высоту, северный сектор
  Красной Поляны и Сочи — по 141 конечному лучу до 40 км. Формат dem.json полностью совместим.
- Скорость воспроизводится: `cd backend && uv run python -m tests.benchmarks.view_budget`.
  Синтетический отель 4 фасада × 10 этажей × 3 разные точки окна × 141 луч × 1334 отсчёта:
  подготовка 0,16 с, номинальные расчёты всех окон/этажей 0,33 с, МК16 для всех фасадов/этажей
  1,89 с; **с подготовкой 0,49 с без МК / 2,06 с с МК16**. Это конкретный воспроизводимый стенд,
  не обещание постоянного времени для произвольного числа стен и соседей.
- Реальные данные: повторно подготовлены три окна морского фасада Жемчужины / Морской звезды /
  Marriott на свежем DEM B1.3 и контурах B1.0; HTTP принудительно отключён. Подготовка оснований
  3473/2807/1137 зданий — 0,12/0,09/0,04 с; три окна — 0,24/0,36/0,16 с; номинально все
  17/12/8 этажей среднего окна — 0,04/0,03/0,02 с; МК16 всех этажей по трём окнам — 0,73/0,57/0,34 с.
  Море на 2/5/9(8)-м: Жемчужина 100/100/100%, Хоста 1,4/11,3/15,6%, Marriott 0/0/0%.
  У Хосты на 2-м этаже номинальный узкий просвет не подтвердился ни в одном из 16 прогонов.
- Грабли: эти реальные результаты отличаются от B1.0 из-за билинейного усреднённого DEM 2″ и
  трёх точек на фасаде; 30 м шага луча не восстанавливают исходные 30 м после ресэмплинга DEM.
  DSM-коррекция — эвристика, МК не калиброван на фотографиях. Положение окна дискретно выбирается
  среди подготовленных точек; при смене точки пересечения не переиспользуются.
- Дальше: claude-core может подключать инструменты/методы B2.10 по опубликованному API. Мои общие
  файлы не заняты; чужие изменения оставлены в дереве, LLM и платные API не вызывались.

### 28.10 02:53 МСК · codex-terrain · B1.4
- Сделано: `pipeline.climate` и `data/region/climate.json` по D-38, 4 точки × 12 месяцев × 6 метрик.
  Open-Meteo Archive ERA5 за 3653 дня 2016–2025; Marine SST best_match за 2023–2025. Коммит `44b283a`.
  Ноябрь: вода центр +17,08, Адлер +16,98, Сириус +16,96 °C, Поляна null. Атрибуция CC BY 4.0 в JSON/MANIFEST.
- **Публичный API:** `pipeline.climate.monthly_normals(weather: dict, marine: dict|None) -> dict[str,dict]`
  принимает daily/hourly секции API, возвращает ключи "1"…"12" с `air_max_c`, `air_min_c`, `water_c`
  (°C), `sun_hours`, `daylight_h` (ч/день), `rain_days` (дней с rain_sum ≥1 мм за месяц).
  Усреднение сначала внутри календарного года/месяца, затем равные веса лет. `water_normals(marine)`
  возвращает `(месячные °C, число полных лет для каждого месяца)`; месяцы с пропусками исключены целиком.
  `ClimateCatalog.from_file(Path("data/region/climate.json"))`, `.nearest(LonLat)` и `.estimate(location, check_in, check_out)`
  работают без изменения адаптера; checkout исключён, единицы сохраняются.
- Как проверить: `uv run --group pipeline python -m pipeline climate`; сырые запросы в SHA256-кэше,
  URL и координаты фактических ячеек сохранены в JSON. Полный `make check` в отдельной БД/Redis:
  209 passed, 1 skipped (пока нет графа), ruff/format, mypy strict и import-linter зелёные.
  Unit-тесты проверяют високосные годы, секунды→часы, порог дождя, пропуски и реальный адаптер.
- Грабли: ERA5-Ocean принимает SST за 2016–2025, но возвращает только null. Marine best_match имеет
  SST с конца ноября 2022 и пропуски в январе/феврале 2025. Поэтому для воды используем только полные
  месяцы 2023–2025: 2 года для января/февраля и 3 для остальных; не называем их десятилетней нормой.
  `weather_years=10`, `water_years_by_month` и `water_period` явные; `years=2` у моря — консервативный
  минимум для существующего ClimateCatalog, чтобы его уверенность не приписала воде 10 лет.
- Дальше: B2.10 может читать готовый климат; отдельное повышение точности воды требует более длинного ряда.
  codex-terrain делает B1.6 по реальным 200 osm_id и R6.

### 28.10 02:51 МСК · codex-terrain · B1.3
- Сделано: `pipeline.dem` → `dem_int16.npy` (1852×3018, 11 178 800 байт) и `dem.json`,
  EPSG:4326, шаг 2″ (~45×62 м), среднее исходных пикселей с округлением до метра. Коммит `f9adea6`.
  К трём тайлам B1.0 добавлен N44E039: без него северные лучи из центра имели пробелы.
  Границы 39.1461/43.0211/40.8228/44.05 покрывают круг 40 км вокруг каждого из 200 отелей.
- **Публичный API:** `pipeline.dem.buffered_bounds(hotels: list[dict[str,str]]) -> tuple[float,float,float,float]`
  принимает lon/lat в градусах, возвращает west/south/east/north; `build_dem(paths: list[Path], bounds, output: Path) -> None`
  пишет файлы контракта `NpyTerrain`. В рантайме использовать существующий `NpyTerrain(Path("data/region"))`:
  `.elevation(points: ndarray[n,2]) -> ndarray[n]` — метры над EGM2008; неизвестное = NaN.
  `.far_horizon(origin, eye_height_m, azimuths, max_km=40)` — прежний контракт B0.5, высота абсолютная.
- Как проверить: `uv run --group pipeline python -m pipeline dem`; повтор использует кэш.
  Полный `make check` с отдельной БД `okno_terrain_test` и Redis DB13: 204 passed, 2 skipped,
  ruff/format, mypy strict и 7 import-контрактов зелёные. Тест проверяет 200 отелей × 36 направлений
  на 0/1/40 км и nodata синтетической мозаики. Ахун (39.8436,43.5505) 663,9 м,
  район Роза Пик (40.311,43.625) 2316,1 м, море (39.70,43.55) 0 м.
- Грабли: это DSM, а не DTM: крыши/деревья остаются в высотах. Ничего не подменяется нулём при отсутствии
  покрытия; nodata=-32768. Буфер 40,2 км оставляет соседние пиксели для билинейного чтения конца луча.
- Дальше: codex-osm может брать высоты для B1.5; codex-view — проверить конечные лучи на готовом DEM.
  codex-terrain продолжает B1.4 → B1.6; пользователей из users.yaml не меняет.

### 28.10 02:49 МСК · codex-view · B2.5 · API готов, финальные проверки в работе
- Сделано: `7fa98b8`, `d814ea7`, `ffeb0de`, `7949a2f`, `580bef5`: ядро горизонта, море, МК,
  подготовка сцен через TerrainModel, DSM-коррекция, видимые вершины и горный силуэт.
- **Публичный стык B2.10:** все координаты геометрий в локальных метрах одной `LocalProjection`.
  `scene.Building(ref, footprint: Polygon, base_elevation_m, height_m, height_source)`;
  height_source строго `osm_height | osm_levels | default` (так у регионального пайплайна).
  `ViewSceneBuilder(terrain: TerrainModel, projection: LocalProjection, *, step_m=30, max_km=40)`
  из `app.infra.geo.view_scene`: `.buildings_with_bases(buildings) -> tuple[Building,...]` оценивает
  основание по DSM (32 пробы, буфер 35 м, 20-й перцентиль). Высоту глаза отеля считать **от той же базы**.
  `.prepare(origin_xy, normal_deg, buildings, sea: BaseGeometry) -> Scene` делает 141 луч ±70°,
  выборку рельефа до 40 км, маску моря и точные интервалы крыш до 2 км; собственное здание сохранять.
  Подготовить отдельно четверть/середину/три четверти каждого Wall, затем держать Scene в кэше.
  `horizon.evaluate_horizon(scene, eye_m) -> Horizon` (1D массивы),
  `horizon.batch_horizon(scene, eyes_m, *, roofs_m=None, terrain_bias_m=None)` (runs,rays):
  angle_deg, kind, building_deg, terrain_deg, sea_low_deg, sea_high_deg, sea_visible; `.sea_fraction`.
  `scene.Obstacle`: BUILDING=0, TERRAIN=1, SEA=2, SKY=3, UNKNOWN=4; неизвестный рельеф не свободное небо.
  `sea.minimum_floor(scenes, base_elevation_m, floors, *, min_fraction=.01) -> int|None` — первый
  доступный этаж с долей моря хотя бы в одном окне. Доля — по азимутам, не площадь изображения.
  `montecarlo.monte_carlo(scenes, eye_m, *, runs=16, min_fraction=.01, seed=0, target="sea")`
  → `VisibilityProbability(probability, fractions, window_indices)`; target также `mountains`.
  Сцены должны иметь одинаковый порядок buildings; шум высот ±1,5 м / ±1 этаж / ±2 этажа,
  DEM ±2 м как общий вертикальный сдвиг, окно — случайный выбор среди подготовленных точек.
  `peaks.Peak(ref, name|None, xy, elevation_m)` и `visible_peaks(scene, eye_m, peaks)`
  → tuple `VisiblePeak(ref,name,distance_m,azimuth_deg,elevation_deg)`; препятствия только перед вершиной.
  `peaks.mountain_visibility(scene, eyes_m, batch_profiles, *, terrain_bias_m=None)` → bool (runs,rays):
  силуэт рельефа выше 500 м. Среднее по rays — доля горного силуэта.
- Проверка: все 18 этаж/фасад сцен B1.0 совпадают по доле моря до округления отчёта (<0,005 п.п.),
  P95 номинального расчёта ~2,8 мс. Полный make check прошёл: 197 passed, 3 skipped, 7 arch-контрактов.
  Синтетический отель 4 фасада × 10 этажей × 3 окна: подготовка 0,50 с, все номинальные окна 0,29 с,
  МК16 для всех этажей/фасадов 1,58 с; с подготовкой 0,79/2,08 с. Скрипт замера ещё в финальном коммите.
- Грабли: DSM — эвристика, не DTM; сдвиг окна требует своей Scene. МК по трём точкам — дискретная
  модель положения окна, не непрерывный сдвиг с повторным использованием неверных пересечений.
- Дальше: завершить коммит проверок, проверить готовый DEM B1.3 при публикации, закрыть B2.5.

### 28.10 02:44 МСК · codex-ground · B2.8, линия B2.7 → B2.9 → B2.8 завершена
- Сделано: scipy Router поверх направленного CSR, KDTree, три профиля, независимые маршруты туда
  и обратно (включая разные пути), ступени/переходы/подъём, высотный профиль, выбор ближайшего
  пешком и достижимость за бюджет. Коммиты `231dd45`, `7161c64`, `071530d`; доменные веса `walking.py`
  вошли в `cb80e28` при гонке индекса. Подробные контракты шума, часов, климата и NPZ — в записях ниже.
- **Публичный API для claude-core / B2.10:** `app/infra/geo/router.py`:
  `ScipyRouter(graph: WalkGraph, *, max_snap_m=100)` или `.from_file(path: Path, *, max_snap_m=100)`.
  Все три профиля и KDTree строятся при инициализации; переиспользовать экземпляр в bootstrap.
  `.snap(point: LonLat) -> Snap|None` (node — индекс графа, distance_m — метры; None за пределом).
  `.route(origin: LonLat, target: LonLat, profile: WalkProfile) -> Route|None` — контракт B0.5;
  None, если точка далеко от графа либо хотя бы одно направление недоступно. RouteLeg содержит
  минуты, метры, climb/descent в метрах, число ступеней и переходов. Route.coordinates — только
  путь туда (WGS84 lon/lat), elevation_profile — пары (накопленные метры, высота DEM в метрах).
  osm_refs включает оба направления; uncertain_share — доля неизвестной длины в сумме обоих путей.
  Подходы от точек к узлам входят в время/длину и считаются неизвестными, без заявленной доступности.
- `.nearest_of(origin, targets: Sequence[LonLat], profile) -> tuple[int,Route]|None` выбирает
  по минутам туда среди целей с доступным обратным путём, возвращает исходный индекс цели.
  `.reachable(origin, candidates: Sequence[tuple[str,str|None,LonLat]], minutes: float, profile)
  -> list[Reachable]` — достижимость ТУДА, включая подходы к графу; сортировка по времени и ref.
  Несуществующий/закрытый обратный путь не отменяет одностороннюю достижимость. Бюджет ≥0.
- Как проверить: полный make check на снимке HEAD + файлы линии, отдельные PostGIS DB
  `okno_ground_test` и Redis DB 14: **188 passed, 2 skipped**; ruff/format, mypy strict,
  7 import-контрактов зелёные. В общем дереве `pytest tests/unit/geo -q`: 80 passed, 2 skipped.
  Воспроизводимый замер: `cd backend && uv run python -m tests.unit.geo.router_benchmark`.
  NPZ 100489 узлов, 400688 дуг, 25 маршрутов по 126 м: старт 2.458 с, p50 11.4 мс,
  p95 12.104 мс, max 12.697 мс. Первый отдельный прогон дал p95 17.685 мс, max 41.755 мс.
- Грабли: CSR суммирует дубли, поэтому ProfileGraph выбирает самое быстрое параллельное ребро
  до сборки матрицы. Нельзя использовать directed=False: уклоны делают веса асимметричными.
  Весь граф в памяти; задержка инициализации не входит в время запроса. Привязка и подходы
  приближённые; неизвестные участки снижают качество доказательства, профиль не гарантирует доступ.
- Дальше: **codex-pipeline** должен выдать NPZ по контракту записи «стык графа» и climate.json по
  контракту B2.9. Сейчас этих файлов нет (в region только каталог отелей). Два smoke-теста
  `tests/unit/geo/test_region_inputs.py` автоматически включатся после публикации и проверят чтение
  реальных файлов. **claude-core** подключает функции и адаптеры в инструменты/исполнители B2.10.
  Полноту дорог и unmodelled_refs обязательно учитывать в шуме; индекс — модель, не замер.

### 28.10 02:39 МСК · codex-horizon · B1.0
- Сделано: самостоятельный `backend/pipeline/spikes/horizon_spike.py` с PEP 723 зависимостями;
  загрузка/геометрия/NumPy-ядро/рисование разделены. Реальные контуры OSM: Жемчужина
  way/51847429 (17 этажей), Морская звезда в Хосте way/53549358 (12), Marriott в Эстосадке
  way/227214566 (8). Два настоящих фасада, по 141 лучу ±70°, точные интервалы крыш до 2 км,
  DSM до 40 км с шагом 30 м, кривизна и рефракция 0,13; шесть PNG по три этажа, карты и NPZ-сцены.
  Код — коммиты e9b46ff, 682c23a, 817b4d6, b702f83, e93c4fe, fc1bebc.
- Как проверить: `uv run backend/pipeline/spikes/horizon_spike.py`; кэш уже заполнен, HTTP не нужен.
  Подробные команды Ruff, mypy и pytest — в `backend/pipeline/spikes/README.md`. Девять тестов
  без сети, Ruff check/format и mypy по четырём модулям проходят. Полный запуск дополнительно
  прошёл с принудительным запретом `httpx.Client.request/stream`. `git check-ignore -v
  backend/.cache/spike/summary.json` подтверждает правило `.cache`. Общий `make check` был запущен
  через `uv run --frozen` и остановился на чужом `pipeline/catalog.py:28`, PLR0912; файл не менялся.
- Результат (доля азимутов с видимой водой, не площадь картинки и не вероятность):

| Отель | Этаж 2 | Этаж 5 | Этаж 9 / 8 | Мин. этаж к морю | От моря |
|---|---:|---:|---:|---:|---|
| Жемчужина, нормаль 225,35° | 95,7% | 100% | 100% | 1 | моря нет до 17-го |
| Морская звезда, нормаль 205,52° | 0% | 7,8% | 14,9% | 3 | моря нет до 12-го |
| Marriott, нормаль 201,89° | 0% | 0% | 0% | нет до 8-го | моря нет |

- Визуально проверены все шесть панорам и карты. У первой линии открытый морской горизонт;
  у Хосты узкие просветы между застройкой; у Эстосадка горный силуэт с обеих сторон (обычно
  10–22° над горизонтом), справа на северном фасаде виден соседний корпус самого Marriott.
  В Хосте отель в 1077 м от моря, геометрический отрезок к ближайшему берегу пересекает OSM-ж/д;
  это видно на `morskaya_zvezda_context.png`. Сверка с географией города и картой OSM,
  без скачивания чужих фотографий; натурной/фотографической валидации точности пока нет.
- Выводы для B2.5 — скорость: последний прогон 30 м дал 2,3–2,8 мс на фасад при готовой сцене
  (в других прогонах были выбросы до 5,4 мс). Подготовка сцены 82–378 мс, без сети, включая
  пространственные запросы, чтение тайлов при первом обращении и пересечения. Геометрию надо
  кэшировать отдельно от высот: смена этажа дешёвая, смена точки окна требует новых пересечений.
  Оценка 50 прогонов с фиксированной геометрией — порядка 0,15 с по номинальному ядру;
  полноценный Монте-Карло со сдвигом окна здесь не реализован и отдельно не измерялся.
- Выводы для B2.5 — точность: разрежение готовых сцен с 30 до 60/90 м меняло долю моря до
  2,13 п.п.; худший p95 изменения угла 1,38°, отдельные лучи до 2,99°/3,23°. Сравнение лежит
  в `sampling_comparison.json`; по умолчанию оставлен шаг 30 м. DSM содержит крыши/деревья:
  высота основания — 20-й перцентиль 32 проб в кольце 35 м, DSM под контурами и ореолом 20 м
  понижается до этой оценки перед добавлением OSM-высот. Это эвристика против двойного учёта
  крыш, а не DTM; на склонах и в плотной застройке есть систематическая ошибка. Минимальные
  этажи номинальные: нужны возмущения оснований/высот/окон, несколько окон на фасад и эталон.
- Высоты и объём OSM (здания после точного отбора в 2 км; теги height/levels могут пересекаться):

| Отель | Зданий | С height | С building:levels | Высота по умолчанию | Сырая выгрузка |
|---|---:|---:|---:|---:|---:|
| Жемчужина | 3473 | 16 (0,5%) | 1984 (57,1%) | 1485 (42,8%) | 3,72 МБ |
| Морская звезда | 2807 | 4 (0,1%) | 1303 (46,4%) | 1503 (53,5%) | 9,06 МБ |
| Marriott | 1137 | 2 (0,2%) | 370 (32,5%) | 767 (67,5%) | 1,05 МБ |

- Всего 7417 зданий; `height` используется у 22, этажность × 3 м — у 3640, дефолт 9 м —
  у 3755 (50,6%). Для неизвестных высот в B2.5 нужен широкий разброс минимум ±2 этажа.
  Хоста использует уже загруженный соседней сессией региональный bbox (сырой ответ и запрос
  скопированы в `.cache/spike/`); отбор по 2 км тот же, поэтому её ответ больше минимального bbox.
  Береговая линия 0,45 МБ; реально использованы N43E039, N43E040 и **N44E040** (северные лучи
  Поляны), всего 90,56 МБ GeoTIFF. Это игнорируемое сырьё, в данные рантайма его переносить нельзя:
  для B1.3 нужна обрезка в int16 и покрытие севернее 44°. N44E039 был предзагружен лишним и удалён.
- Грабли: Overpass Mail.ru часто отдаёт 504, в том числе `Dispatcher_Client::request_read_and_idx::timeout`;
  повторные запросы с паузами и кэш обязательны. Другие зеркала в этой сессии были недоступны;
  итоговый код использует Mail.ru. Слой ж/д необязательный (`--railways`), готовый кэш читается всегда.
  `polygonize` без привязки к сетке объединял сушу и море из-за микрозазоров после проекции:
  исправлено `union_all(..., grid_size=0.01)` и проверками суши/моря. Просто проверить число
  полигонов недостаточно. Нельзя отбрасывать короткие торцы длинных зданий: так был потерян
  настоящий морской фасад Жемчужины. Нельзя исключать весь собственный контур отеля: другие
  крылья перекрывают обзор. Море перед дальней горой может быть видно при горном верхнем силуэте.
- Артефакты: `backend/.cache/spike/{zhemchuzhina,morskaya_zvezda,marriott_polyana}_{sea,inland}.png`,
  `*_context.png`, `*_scene.npz`, `summary.json`, `sampling_comparison.json`; всё вне git.
- Дальше: B2.5 может брать чистое ядро и интервалы из `horizon_geometry.py`, сохранив ограничения
  DSM и высот в оценке уверенности. Перенос в рантайм — без rasterio/Matplotlib/HTTP.

### 28.10 02:38 МСК · codex-ground · B2.8 · стык графа, задача ещё в работе
- Сделано: `walking.py` (попал в параллельный коммит `cb80e28` при гонке общего git index),
  `walk_graph.py`, тесты (`231dd45`). Для последующих коммитов использую `git commit --only <свои пути>`.
- **Стык codex-pipeline / B1.5:** `walk_graph.npz` читается без pickle. Обязательные массивы:
  `nodes` float `(n,3)` = lon°, lat°, elevation_m; `edges` int `(m,2)` = направленные индексы узлов;
  `length_m` float `(m,)` >0; `steps` int `(m,)` = число ступеней (0 если нет);
  `crossings` int `(m,)` = число переходов на ребре; `uncertain` bool `(m,)`;
  `osm_refs` Unicode `(m,)` = `way/123`, НЕ object dtype. Обратная дуга обязательна отдельно,
  если путь доступен в обе стороны. Нужен несокращённый граф с промежуточными OSM-узлами,
  чтобы линия маршрута и высотный профиль соответствовали реальной дороге.
- Публичный API: `WalkGraph.from_file(Path) -> WalkGraph`; `graph.edge(i) -> WalkEdge`;
  `ProfileGraph.build(graph, profile)` выбирает самую быструю из параллельных дуг перед CSR.
  `tobler_speed_kmh(slope)` (уклон rise/length со знаком),
  `edge_minutes(length_m, rise_m, profile, *, steps=0) -> float` (inf = запрещено),
  `route_leg(edges: Sequence[WalkEdge], profile) -> RouteLeg|None`,
  `elevation_profile(edges, initial_elevation_m) -> tuple[(distance_m,elevation_m), ...]`.
- Как проверить: полный make check в изолированном снимке и отдельной тестовой БД: 165 passed,
  mypy strict, ruff/format и import-linter зелёные.
- Грабли: время на ступенях ограничено 2 км/ч; коляска 4 км/ч, кресло 3 км/ч; штраф свыше |8%|
  = `1 + k*(|s|-0.08)` (k=10 для коляски, 20 для кресла). Это параметры модели, не подтверждение
  доступности. Любые ступени запрещены обоим профилям. Подъём вычисляется из DEM-высот узлов.
- Дальше: ScipyRouter, туда/обратно, достижимость, замеры; реальный NPZ пока отсутствует.

### 28.10 02:37 МСК · codex-view · B2.5a, проверка на Copernicus
- Сделано: адаптер проверен на реальном тайле N43E039 из локального кэша B1.0, без новых загрузок.
  Во временной папке создан int16 DEM по согласованному формату, после проверки удалён.
- Как проверить: `uv run --group pipeline python` с rasterio читает тайл, `np.rint(read(1)).astype(int16)`
  и первые 6 коэффициентов `dataset.transform` передаются NpyTerrain; 6 центров пикселей дали точное
  совпадение (0 м), сектор 200…340° от 39,7231/43,5855 на высоте 30 м: 141 конечный луч, 40 км.
  Холодный дальний горизонт ~10 мс, повтор из кэша ~0,009 мс на этой машине.
- Грабли: это проверка адаптера по исходному тайлу, ещё не интеграция с готовыми артефактами B1.3.
- Дальше: B2.5 ждёт завершения B1.0.

### 28.10 02:36 МСК · codex-view · B2.4a
- Сделано: после появления `hotels.csv.gz` проверены все 200 реальных контуров; исправлена склейка
  изогнутых стен, которая могла переместить окно внутрь здания. Склейка сохраняет исходную ломаную.
- Публичный API: у `Wall` добавлено необязательное `path: tuple[XY,...]` и свойство `vertices`;
  `point(fraction)` теперь интерполирует по длине исходной ломаной, `length_m` — её длина.
  Существующий конструктор с четырьмя аргументами работает; сигнатуры extract/window_points прежние.
- Как проверить: полный ruff/format, mypy strict, 110 unit-тестов зелёные. На 200 отелях проверены
  точки окон всех фасадов и этажей: расстояние до исходного контура <1e-8 м. Регрессионные сцены
  с изгибом стены внутрь и наружу покрыты unit-тестами без внешних файлов.
- Грабли: почти коллинеарные стены нельзя заменять хордой при размещении окон.
- Дальше: ждём B1.0 для B2.5; реальные данные DEM — B1.3.

### 28.10 02:35 МСК · codex-ground · B2.9
- Сделано: часы `24/7`, дни/диапазоны дней, несколько интервалов через запятую, отдельные правила
  по дням через `;`, `off/closed`, перехлёст полуночи и недели. Шум заведений использует этот разбор.
  Климат взвешен по календарным дням; пропуски и длина истории видны в уверенности. Коммиты
  `ff75eea`, `e2dd4dc`. Доменная часть по заданию владельца выполнена до B1.2/B1.4 на синтетике;
  сервисные инструменты `osm.find`, `osm.tag_stats`, `hours.check`, `climate.normals` собирает B2.10.
- Публичный API `app/domain/geo/hours.py`: `parse_hours(value: str|None) -> OpeningHours`;
  `.is_open(moment: datetime, *, timezone="Europe/Moscow") -> bool|None` принимает aware datetime.
  `.at_night` — есть открытие хотя бы в один день типичной недели между 23:00 и 06:00;
  `.in_morning` — между 06:00 и 11:00; `.always_open` — покрыта вся неделя; всё bool|None.
  Конец интервала исключён. `.confidence` — уверенность разбора, не свежесть OSM; сложные/непонятные
  правила (включая перекрывающиеся overrides) дают None и 0.2, отсутствующие часы — None и 0.
- Публичный API `climate.py`: `MonthlyNormal(month: int, values: Mapping[str,float|None], years=10)`;
  `trip_normals(normals, check_in: date, check_out: date) -> ClimateEstimate`: check_out исключён.
  Поля values, coverage, confidence — словари по метрикам; month_days — веса месяцев, days — дни
  поездки. Единицы сохраняются (°C, ч/день, дождливые дни/месяц и т.д.), месячная норма не становится
  суммой за поездку. Частичные значения усредняются по известным дням с явным coverage 0…1;
  отсутствующая вода остаётся None. Уверенность — индикатор полноты и длины ряда, максимум 0.9.
- **Стык codex-pipeline / B1.4:** `app/infra/geo/climate.py`: `ClimateCatalog.from_file(Path)`
  читает JSON `{"source":"…","period":"2016-2025","stations":[{"id":"center","lon":39.7,
  "lat":43.6,"years":10,"months":{"1":{"air_max_c":12.0,"water_c":null}}}]}`.
  months — ключи 1…12, произвольные числовые метрики, null разрешён, years по умолчанию 10.
  `.nearest(location: LonLat) -> ClimateStation`, `.estimate(location, check_in, check_out)`
  выбирает ближайшую станцию; source/period сохраняются для атрибуции. Когда появится реальный файл,
  сверить схему и прогнать smoke; сейчас файла нет.
- Как проверить: полный `make check` на HEAD + своих файлах, отдельная БД `okno_ground_test` и Redis
  DB 14 (общая тестовая БД уже получила незакоммиченную миграцию другой сессии): 148 passed,
  ruff/format, mypy strict и 7 import-контрактов зелёные. LLM и внешние источники не вызывались.
- Грабли: часы не покрывают праздники/сезоны/неявные overrides; при неизвестном расписании не заявлять
  «закрыто». Дата выезда исключена из климатических весов. Реальные данные ещё ожидаются.
- Дальше: B2.8 — доменные веса и scipy Router, синтетический граф до B1.5.

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
