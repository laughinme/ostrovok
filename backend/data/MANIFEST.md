# Данные региона О!кно

Отчёт: 2026-10-27T23:31:56+00:00. Все геометрии EPSG:4326.
CSV: UTF-8, gzip, WKB hex. Синтетические свойства помечены «демо».

Получение: `make data` или `cd backend && uv run --group pipeline python -m pipeline all`.
Повторный запуск использует сырые ответы в `backend/.cache/pipeline/`.

| Источник | Лицензия / атрибуция |
|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | © OpenStreetMap contributors, ODbL 1.0 |
| [Copernicus DEM](https://registry.opendata.aws/copernicus-dem/) | Copernicus Digital Elevation Model, © DLR e.V. 2010–2014, © Airbus Defence and Space GmbH 2014–2018; provided under the Copernicus DEM licence |
| [Open-Meteo](https://open-meteo.com/en/licence) | CC BY 4.0; weather data by Open-Meteo and its model providers |

Дата получения сырых ответов (UTC): 2026-10-27T23:23:29.618355+00:00 — 2026-10-27T23:30:38.056441+00:00

## Объекты

- hotels.csv.gz: 200; {'adler': 45, 'center': 70, 'khosta': 25, 'krasnaya_polyana': 30, 'sirius': 30}

## Размеры

| Файл | Байт |
|---|---:|
| region/hotel_selection.json | 420 |
| region/hotels.csv.gz | 49,920 |
| **Всего** | **50,340** |

Бюджет: <60 МБ вместе, <50 МБ каждый файл.
