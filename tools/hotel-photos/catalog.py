"""Build the bundled hotel galleries from reviewed Commons files and AI fallbacks."""

import argparse
import csv
import gzip
import hashlib
import html
import json
import re
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend/public/hotel-photos"
CATALOG = ROOT / "frontend/src/entities/hotel/api/photo-catalog.json"
CACHE = ROOT / ".cache/hotel-photos"
API = "https://commons.wikimedia.org/w/api.php"
UA = "OknoHotelPhotos/1.0 (Ostrovok hackathon prototype; attribution included)"
LICENSE = re.compile(r"^(CC BY(?:-SA)? [1-4]\.0|CC0|Public domain)$")


def read(path):
    return json.loads(path.read_text())


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def get(url):
    for attempt in range(5):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(request, timeout=40) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 502, 503, 504) or attempt == 4:
                raise
            delay = max(int(error.headers.get("Retry-After", "15")), 15 * (attempt + 1))
            print(f"HTTP {error.code}; retry in {delay}s", flush=True)
            time.sleep(delay)
    raise RuntimeError("Download retries exhausted")


def plain(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", value))).strip()


def commons(selection):
    titles = list(dict.fromkeys(title for item in selection.values() for title in item["titles"]))
    snapshot = CACHE / "selected-metadata.json"
    if snapshot.exists() and set(titles) <= set(read(snapshot)):
        pages = read(snapshot)
    else:
        params = dict(action="query", titles="|".join(titles), prop="imageinfo",
                      iiprop="url|extmetadata|size", iiurlwidth=1280, format="json")
        response = json.loads(get(API + "?" + urllib.parse.urlencode(params)))
        if "error" in response:
            raise ValueError(response["error"])
        pages = {page["title"]: page for page in response["query"]["pages"].values()}
        write(snapshot, pages)
    assets = {}
    for title in titles:
        info = pages[title].get("imageinfo", [{}])[0]
        metadata = info.get("extmetadata", {})
        field = lambda name: plain(metadata.get(name, {}).get("value", ""))
        license_name, author = field("LicenseShortName"), field("Artist")
        if not LICENSE.fullmatch(license_name) or not author or info.get("width", 0) < 800:
            raise ValueError(f"Missing author, unsuitable license or resolution: {title}")
        if field("Restrictions"):
            raise ValueError(f"Additional restrictions require review: {title}")
        key = "commons-" + digest(title.encode())[:12]
        extension = ".png" if title.lower().endswith(".png") else ".jpg"
        dest = OUT / f"{key}{extension}"
        url = info.get("thumburl", info["url"])
        if not dest.exists():
            dest.write_bytes(get(url))
            time.sleep(2)
        data = dest.read_bytes()
        if not data.startswith((b"\xff\xd8", b"\x89PNG\r\n\x1a\n")):
            raise ValueError(f"Expected JPEG or PNG: {title}")
        complex_photo = any(item.get("match") == "complex" and title in item["titles"] for item in selection.values())
        assets[key] = dict(src=f"/hotel-photos/{dest.name}", kind="photo", title=title,
                           alt=title.removeprefix("File:").rsplit(".", 1)[0], author=author,
                           label="Фото комплекса" if complex_photo else "Фото отеля",
                           license=license_name, licenseUrl=field("LicenseUrl"),
                           page=info["descriptionurl"], original=info["url"],
                           capturedAt=field("DateTimeOriginal") or field("DateTime"),
                           width=info.get("thumbwidth", info["width"]),
                           height=info.get("thumbheight", info["height"]),
                           sha256=digest(data), bytes=len(data),
                           changes="Уменьшено до 1280 px; кадрирование в интерфейсе")
    return assets, {title: key for key, item in assets.items() for title in [item["title"]]}


def synthetic():
    manifest = read(ROOT / "assets/hotel-images/manifest.json")
    assets, sets = {}, {}
    for group in manifest["sets"]:
        sets[group["id"]] = []
        for relative in group["gallery"]:
            source = ROOT / "assets/hotel-images" / relative
            key = "ai-" + relative.replace("/", "-").removesuffix(".jpg")
            dest = OUT / f"{key}.jpg"
            shutil.copyfile(source, dest)
            data = dest.read_bytes()
            assets[key] = dict(src=f"/hotel-photos/{dest.name}", kind="ai", title=group["name"], label="AI-иллюстрация",
                               alt="AI-иллюстрация: " + {"exterior": "фасад", "room": "интерьер номера"}.get(source.stem, "территория"),
                               author="image_gen", license=None, licenseUrl="", page="/hotel-photos/credits.html",
                               original="", capturedAt=manifest["createdAt"], width=1536, height=1024,
                               sha256=digest(data), bytes=len(data), changes="Без изменений",
                               note="Вымышленная сцена. Не фотография этого отеля, номера или вида из окна.")
            sets[group["id"]].append(key)
    return assets, sets


def fallback(hotel):
    name = hotel["name"].lower()
    if any(word in name for word in ("санатор", "оздоров", "корпус")):
        return "kiparisovaya-alleya"
    if hotel["district"] == "krasnaya_polyana":
        return "gornyi-priyut"
    if hotel["tourism"] == "guest_house":
        return "dom-na-holme"
    if hotel["tourism"] == "apartment" or float(hotel["levels"] or 0) <= 4:
        return "atelier-sochi"
    return "zakatny-bereg" if hotel["district"] in ("center", "sirius") else "palmovyi-sad"


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    reviewed = read(Path(__file__).with_name("selection.json"))
    assets, titles = commons(reviewed)
    ai, sets = synthetic()
    assets.update(ai)
    with gzip.open(ROOT / "backend/data/region/hotels.csv.gz", "rt") as stream:
        hotels = list(csv.DictReader(stream))
    mappings = {}
    for hotel in hotels:
        selected = reviewed.get(hotel["osm_id"])
        real = [titles[title] for title in selected["titles"]] if selected else []
        generated = sets[fallback(hotel)]
        gallery = real + (generated[1:] if real else generated)[:max(0, 3 - len(real))]
        mappings[hotel["osm_id"]] = dict(name=hotel["name"], gallery=gallery,
                                        room=generated[1],
                                        verified=bool(real), match=selected.get("match", "") if selected else "",
                                        matchNote=selected.get("note", "") if selected else "")
    data = dict(version=1, assets=assets, hotels=mappings, demo=sets)
    used = {Path(item["src"]).name for item in assets.values()}
    for path in OUT.iterdir():
        if path.suffix in (".jpg", ".png") and path.name not in used:
            path.unlink()
    write(CATALOG, data)
    write(OUT / "manifest.json", data)
    credits(data)
    verify(data)


def credits(data):
    cards = []
    for key, item in data["assets"].items():
        esc = html.escape
        source = (f'<a href="{esc(item["page"])}">{esc(item["author"])}</a> · '
                  f'<a href="{esc(item["licenseUrl"])}">{esc(item["license"] or "")}</a>') if item["kind"] == "photo" else "AI-иллюстрация · image_gen · демо"
        cards.append(f'<article id="{key}"><img src="{esc(item["src"])}" alt="{esc(item["alt"])}" loading="lazy"><h2>{esc(item["title"])}</h2><p>{source}</p><p>{esc(item.get("note", item["changes"]))}</p></article>')
    body = "".join(cards)
    page = f'''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Фотографии и источники — О!кно</title><style>body{{margin:0;padding:32px;font:16px/1.5 system-ui;color:#10265c;background:#f4f7ff}}main{{max-width:1200px;margin:auto}}a{{color:#1b4de4}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:24px}}article{{background:white;padding:16px;border-radius:16px;overflow-wrap:anywhere}}img{{width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:10px}}h1{{font-size:36px}}h2{{font-size:18px}}p{{max-width:75ch}}</style><main><a href="/">← В приложение</a><h1>Фотографии и источники</h1><p>Настоящие фотографии — Wikimedia Commons, с авторством и лицензией каждого файла. Кадры показывают состояние объекта на дату съёмки. Лицензия переработанной фотографии сохраняется.</p><p>Если настоящего снимка нет или галерея неполная, добавлены общие AI-иллюстрации шести типов размещения. Они повторяются в разных карточках, не изображают конкретный отель и не подтверждают его интерьер, удобства или вид из окна. На каждом таком кадре есть пометка «AI-иллюстрация».</p><div class="grid">{body}</div></main></html>'''
    (OUT / "credits.html").write_text(page)


def verify(data):
    for key, item in data["assets"].items():
        path = ROOT / "frontend/public" / item["src"].lstrip("/")
        if digest(path.read_bytes()) != item["sha256"]:
            raise ValueError(f"Checksum mismatch: {key}")
        if item["kind"] == "photo" and (not LICENSE.fullmatch(item["license"]) or not item["author"] or not item["licenseUrl"]):
            raise ValueError(f"Attribution missing: {key}")
    for item in data["hotels"].values():
        if len(item["gallery"]) < 3 or any(key not in data["assets"] for key in item["gallery"]):
            raise ValueError(f"Incomplete gallery: {item['name']}")
    real = sum(item["verified"] for item in data["hotels"].values())
    print(f"Verified: {len(data['hotels'])} hotels, {real} with real photos, {len(data['assets'])} assets")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="Verify bundled files offline")
    args = parser.parse_args()
    verify(read(CATALOG)) if args.verify else build()
