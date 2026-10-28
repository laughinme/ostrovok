# Данные региона О!кно

Отчёт: 2026-10-27T23:59:09+00:00. Все геометрии EPSG:4326.
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
- buildings.csv.gz: 63,759; {'default': 38361, 'osm_height': 309, 'osm_levels': 25089}
- osm_features.csv.gz: 53,435; {'bar_club': 176, 'beach': 306, 'construction': 436, 'park': 161, 'peak': 6265, 'poi': 15405, 'railway': 885, 'road': 29733, 'runway': 8, 'station': 60}

## Размеры

| Файл | Байт |
|---|---:|
| demo/hidden_truth.yaml | 165,510 |
| demo/history.yaml | 2,541 |
| demo/room_types.yaml | 626,542 |
| demo/users.yaml | 1,083 |
| region/buildings.csv.gz | 5,751,312 |
| region/climate.json | 14,281 |
| region/dem.json | 995 |
| region/dem_int16.npy | 11,178,800 |
| region/hotel_selection.json | 420 |
| region/hotels.csv.gz | 49,903 |
| region/osm_features.csv.gz | 5,160,796 |
| region/sea.wkb.gz | 72,127 |
| registry/characteristics.yaml | 13,167 |
| **Всего** | **23,037,477** |

Бюджет: <60 МБ вместе, <50 МБ каждый файл.
