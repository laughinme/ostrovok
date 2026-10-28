"""Attribution, provenance, object counts and enforced decimal-MB size budget."""

from datetime import UTC, datetime

from pipeline.inventory import FILE_LIMIT, TOTAL_LIMIT, object_counts, provenance, size_inventory
from pipeline.storage import DATA

ATTRIBUTION = [
    "| Источник | Лицензия / атрибуция |",
    "|---|---|",
    "| [OpenStreetMap](https://www.openstreetmap.org/copyright) | "
    "© OpenStreetMap contributors, ODbL 1.0; выгрузки Geofabrik |",
    "| [Copernicus DEM](https://registry.opendata.aws/copernicus-dem/) | "
    "Copernicus Digital Elevation Model, © DLR e.V. 2010–2014, "
    "© Airbus Defence and Space GmbH 2014–2018; provided under the Copernicus DEM licence |",
    "| [Open-Meteo](https://open-meteo.com/en/licence) | CC BY 4.0; "
    "weather data by Open-Meteo and its model providers |",
    "",
]


def run() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    paths, total = size_inventory(DATA)
    largest = max((p.stat().st_size for p in paths), default=0)
    lines = [
        "# Данные региона О!кно",
        "",
        f"Отчёт: {datetime.now(UTC).isoformat(timespec='seconds')}. Все геометрии EPSG:4326.",
        "CSV: UTF-8, gzip, WKB hex. Синтетические свойства помечены «демо».",
        "",
        "Получение: `make data` или "
        "`cd backend && uv run --group pipeline python -m pipeline all`.",
        "Порядок: скачать и проверить PBF → обрезать в GPKG → OSM → резерв отелей → "
        "DEM → климат → демо → граф → профили окна.",
        "Повторный запуск использует `.cache/osm/`, `.cache/pipeline/` и `.cache/spike/`.",
        "Сырые PBF/GPKG/GeoTIFF в git и в бюджет runtime-данных не входят.",
        "",
        *ATTRIBUTION,
        *provenance(),
        "## Объекты",
        "",
        *object_counts(DATA),
        "",
        "## Размеры",
        "",
        "| Файл | Байт |",
        "|---|---:|",
        *[f"| {p.relative_to(DATA)} | {p.stat().st_size:,} |" for p in paths],
        f"| **Всего без MANIFEST** | **{total:,}** |",
        "",
        f"Бюджет: <{TOTAL_LIMIT:,} байт вместе, <{FILE_LIMIT:,} байт каждый файл (десятичные МБ).",
        f"Всего {total / 1e6:.2f} МБ, крупнейший файл {largest / 1e6:.2f} МБ; "
        f"запас до общего лимита {(TOTAL_LIMIT - total) / 1e6:.2f} МБ.",
        "",
    ]
    (DATA / "MANIFEST.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"MANIFEST: {len(paths)} files, {total / 1e6:.2f} MB", flush=True)
