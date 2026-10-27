"""Attribution, provenance, object counts and enforced size budget."""

from collections import Counter
from datetime import UTC, datetime

from pipeline.storage import CACHE, DATA, read_csv


def run() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    paths = sorted(p for p in DATA.rglob("*") if p.is_file() and p.name != "MANIFEST.md")
    total = sum(p.stat().st_size for p in paths)
    if total >= 60_000_000 or any(p.stat().st_size >= 50_000_000 for p in paths):
        raise ValueError(f"Dataset budget exceeded: {total:,} bytes")
    stamps = [p.stat().st_mtime for p in CACHE.glob("*.request.json")]
    dates = (
        " — ".join(datetime.fromtimestamp(t, UTC).isoformat() for t in [min(stamps), max(stamps)])
        if stamps
        else "ещё нет выгрузок"
    )
    lines = [
        "# Данные региона О!кно",
        "",
        f"Отчёт: {datetime.now(UTC).isoformat(timespec='seconds')}. Все геометрии EPSG:4326.",
        "CSV: UTF-8, gzip, WKB hex. Синтетические свойства помечены «демо».",
        "",
        "Получение: `make data` или "
        "`cd backend && uv run --group pipeline python -m pipeline all`.",
        "Повторный запуск использует сырые ответы в `backend/.cache/pipeline/`.",
        "",
        "| Источник | Лицензия / атрибуция |",
        "|---|---|",
        "| [OpenStreetMap](https://www.openstreetmap.org/copyright) | "
        "© OpenStreetMap contributors, ODbL 1.0 |",
        "| [Copernicus DEM](https://registry.opendata.aws/copernicus-dem/) | "
        "Copernicus Digital Elevation Model, © DLR e.V. 2010–2014, "
        "© Airbus Defence and Space GmbH 2014–2018; "
        "provided under the Copernicus DEM licence |",
        "| [Open-Meteo](https://open-meteo.com/en/licence) | CC BY 4.0; "
        "weather data by Open-Meteo and its model providers |",
        "",
        "Дата получения сырых ответов (UTC): " + dates,
        "",
        "## Объекты",
        "",
    ]
    for name, field in [
        ("hotels.csv.gz", "district"),
        ("buildings.csv.gz", "height_source"),
        ("osm_features.csv.gz", "kind"),
    ]:
        if (DATA / "region" / name).exists():
            rows = read_csv(name)
            counts = dict(sorted(Counter(r[field] for r in rows).items()))
            lines.append(f"- {name}: {len(rows):,}; {counts}")
    lines += ["", "## Размеры", "", "| Файл | Байт |", "|---|---:|"]
    lines += [f"| {p.relative_to(DATA)} | {p.stat().st_size:,} |" for p in paths]
    lines += [
        f"| **Всего** | **{total:,}** |",
        "",
        "Бюджет: <60 МБ вместе, <50 МБ каждый файл.",
        "",
    ]
    (DATA / "MANIFEST.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"MANIFEST: {len(paths)} files, {total / 1e6:.2f} MB", flush=True)
