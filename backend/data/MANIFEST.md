# Данные региона О!кно

Отчёт: 2026-10-28T06:46:16+00:00. Все геометрии EPSG:4326.
CSV: UTF-8, gzip, WKB hex. Синтетические свойства помечены «демо».

Получение: `make data` или `cd backend && uv run --group pipeline python -m pipeline all`.
Порядок: скачать и проверить PBF → обрезать в GPKG → OSM → резерв отелей → DEM → климат → демо → граф → профили окна.
Повторный запуск использует `.cache/osm/`, `.cache/pipeline/` и `.cache/spike/`.
Сырые PBF/GPKG/GeoTIFF в git и в бюджет runtime-данных не входят.

| Источник | Лицензия / атрибуция |
|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | © OpenStreetMap contributors, ODbL 1.0; выгрузки Geofabrik |
| [Copernicus DEM](https://registry.opendata.aws/copernicus-dem/) | Copernicus Digital Elevation Model, © DLR e.V. 2010–2014, © Airbus Defence and Space GmbH 2014–2018; provided under the Copernicus DEM licence |
| [Open-Meteo](https://open-meteo.com/en/licence) | CC BY 4.0; weather data by Open-Meteo and its model providers |

Дата получения источников (UTC): 2026-10-27T23:23:29.618355+00:00 — 2026-10-27T23:53:16.572812+00:00

- Geofabrik [georgia-261026.osm.pbf](https://download.geofabrik.de/europe/georgia-261026.osm.pbf): 102,505,236 байт в сыром PBF, MD5 `c09f042055855fd6d408a05def79936e` (проверен при загрузке).
- Geofabrik [south-fed-district-261026.osm.pbf](https://download.geofabrik.de/russia/south-fed-district-261026.osm.pbf): 316,654,474 байт в сыром PBF, MD5 `0d9fd34db68cf7f2e03b0df1e34008bd` (проверен при загрузке).

Исходный каталог hotels.csv.gz выбран через Overpass и сохранён в репозитории; геослои получены из снимков Geofabrik. Грузия дополняет берег и вершины у границы.
DEM и климат: точные URL, периоды и полнота — в dem.json и climate.json.

## Объекты

- hotels.csv.gz: 200; {'adler': 45, 'center': 70, 'khosta': 25, 'krasnaya_polyana': 30, 'sirius': 30}
- reserve_hotels.csv.gz: 17; {'adler': 4, 'center': 4, 'khosta': 1, 'krasnaya_polyana': 4, 'sirius': 4}
- buildings.csv.gz: 63,759; {'default': 38361, 'osm_height': 309, 'osm_levels': 25089}
- osm_features.csv.gz: 53,435; {'bar_club': 176, 'beach': 306, 'construction': 436, 'park': 161, 'peak': 6265, 'poi': 15405, 'railway': 885, 'road': 29733, 'runway': 8, 'station': 60}
- walk_graph.npz: 150,612 узлов, 322,182 направленных рёбер; высоты в метрах DSM, длины в метрах; D-38.
- Демо: 200 карточек, 694 категорий, 1388 тарифов; синтетические свойства помечены isDemo.

## Размеры

| Файл | Байт |
|---|---:|
| demo/hidden_truth.yaml | 165,510 |
| demo/history.yaml | 2,541 |
| demo/room_types.yaml | 622,879 |
| demo/users.yaml | 1,083 |
| eval/README.md | 6,733 |
| eval/curator.yaml | 15,251 |
| eval/gold.yaml | 1,151 |
| eval/hotelier_answers.yaml | 14,986 |
| eval/intents.yaml | 41,022 |
| eval/search_queries.yaml | 123,731 |
| region/buildings.csv.gz | 5,751,312 |
| region/climate.json | 14,281 |
| region/dem.json | 995 |
| region/dem_int16.npy | 11,178,800 |
| region/hotel_selection.json | 420 |
| region/hotels.csv.gz | 49,903 |
| region/osm_features.csv.gz | 5,160,796 |
| region/reserve_hotels.csv.gz | 2,996 |
| region/sea.wkb.gz | 72,127 |
| region/walk_graph.npz | 4,973,463 |
| region/window_profiles.zip | 3,888,928 |
| registry/characteristics.yaml | 13,171 |
| registry/moods.yaml | 3,146 |
| registry/osm_vocabulary.yaml | 41,266 |
| registry/synonyms.yaml | 43,971 |
| seed/agent_runs.jsonl.gz | 38,037 |
| seed/agent_steps.jsonl.gz | 362,486 |
| seed/conflicts.jsonl.gz | 13,092 |
| seed/fact_versions.jsonl.gz | 1,476,435 |
| seed/facts.jsonl.gz | 6,076,175 |
| seed/hotelier_questions.jsonl.gz | 9,461 |
| seed/observations.jsonl.gz | 10,923,555 |
| **Всего без MANIFEST** | **51,093,366** |

Бюджет: <60,000,000 байт вместе, <50,000,000 байт каждый файл (десятичные МБ).
Всего 51.09 МБ, крупнейший файл 11.18 МБ; запас до общего лимита 8.91 МБ.
