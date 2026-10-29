import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import yaml

from pipeline.storage import CACHE, ROOT, read_csv

TOTAL_LIMIT = 60_000_000
FILE_LIMIT = 50_000_000


def size_inventory(directory: Path) -> tuple[list[Path], int]:
    paths = sorted(p for p in directory.rglob("*") if p.is_file() and p.name != "MANIFEST.md")
    total = sum(p.stat().st_size for p in paths)
    oversized = [p for p in paths if p.stat().st_size >= FILE_LIMIT]
    if total >= TOTAL_LIMIT or oversized:
        raise ValueError(f"Dataset budget exceeded: {total:,} bytes; oversized files: {oversized}")
    return paths, total


def provenance() -> list[str]:
    sources = sorted((ROOT / ".cache" / "osm").glob("*.source.json"))
    requests = sorted(CACHE.glob("*.request.json"))
    stamps = [p.stat().st_mtime for p in [*sources, *requests]]
    dates = (
        " - ".join(datetime.fromtimestamp(t, UTC).isoformat() for t in [min(stamps), max(stamps)])
        if stamps
        else "нет локального кэша"
    )
    lines = ["Дата получения источников (UTC): " + dates, ""]
    for path in sources:
        source = json.loads(path.read_text())
        filename = source["url"].rsplit("/", 1)[-1]
        lines.append(
            f"- Geofabrik [{filename}]({source['url']}): {source['bytes']:,} байт "
            f"в сыром PBF, MD5 `{source['md5']}` (проверен при загрузке)."
        )
    lines += [
        "",
        "Исходный каталог hotels.csv.gz выбран через Overpass и сохранён в репозитории; "
        "геослои получены из снимков Geofabrik. Грузия дополняет берег и вершины у границы.",
        "DEM и климат: точные URL, периоды и полнота - в dem.json и climate.json.",
        "",
    ]
    return lines


def object_counts(directory: Path) -> list[str]:
    lines = []
    for name, field in [
        ("hotels.csv.gz", "district"),
        ("reserve_hotels.csv.gz", "district"),
        ("buildings.csv.gz", "height_source"),
        ("osm_features.csv.gz", "kind"),
    ]:
        if (directory / "region" / name).exists():
            rows = read_csv(name)
            counts = dict(sorted(Counter(r[field] for r in rows).items()))
            lines.append(f"- {name}: {len(rows):,}; {counts}")
    graph = directory / "region" / "walk_graph.npz"
    if graph.exists():
        with np.load(graph, allow_pickle=False) as data:
            lines.append(
                f"- walk_graph.npz: {len(data['nodes']):,} узлов, "
                f"{len(data['edges']):,} направленных рёбер; "
                "высоты в метрах DSM, длины в метрах; D-38."
            )
    cards = directory / "demo" / "room_types.yaml"
    if cards.exists():
        hotels = yaml.safe_load(cards.read_text())["hotels"]
        rooms = [room for h in hotels.values() for room in h["rooms"]]
        rates = sum(len(room["rates"]) for room in rooms)
        lines.append(
            f"- Демо: {len(hotels)} карточек, {len(rooms)} категорий, {rates} тарифов; "
            "синтетические свойства помечены isDemo."
        )
    return lines
