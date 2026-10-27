# Данные региона О!кно

Отчёт: 2026-10-27T23:51:53+00:00. Все геометрии EPSG:4326.
CSV: UTF-8, gzip, WKB hex. Синтетические свойства помечены «демо».

Получение: `make data` или `cd backend && uv run --group pipeline python -m pipeline all`.
Повторный запуск использует сырые ответы в `backend/.cache/pipeline/`.

| Источник | Лицензия / атрибуция |
|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | © OpenStreetMap contributors, ODbL 1.0 |
| [Copernicus DEM](https://registry.opendata.aws/copernicus-dem/) | Copernicus Digital Elevation Model, © DLR e.V. 2010–2014, © Airbus Defence and Space GmbH 2014–2018; provided under the Copernicus DEM licence |
| [Open-Meteo](https://open-meteo.com/en/licence) | CC BY 4.0; weather data by Open-Meteo and its model providers |

Дата получения сырых ответов (UTC): 2026-10-27T23:23:29.618355+00:00 — 2026-10-27T23:51:52.560608+00:00

## Объекты

- hotels.csv.gz: 200; {'adler': 45, 'center': 70, 'khosta': 25, 'krasnaya_polyana': 30, 'sirius': 30}
- buildings.csv.gz: 63,552; {'default': 38160, 'osm_height': 309, 'osm_levels': 25083}
- osm_features.csv.gz: 52,699; {'bar_club': 176, 'beach': 200, 'construction': 436, 'park': 161, 'peak': 5664, 'poi': 15383, 'railway': 885, 'road': 29730, 'runway': 4, 'station': 60}

## Размеры

| Файл | Байт |
|---|---:|
| demo/users.yaml | 1,083 |
| region/buildings.csv.gz | 5,737,017 |
| region/climate.json | 14,281 |
| region/dem.json | 995 |
| region/dem_int16.npy | 11,178,800 |
| region/hotel_selection.json | 420 |
| region/hotels.csv.gz | 49,903 |
| region/osm_features.csv.gz | 5,090,653 |
| registry/characteristics.yaml | 13,167 |
| **Всего** | **22,086,319** |

Бюджет: <60 МБ вместе, <50 МБ каждый файл.
