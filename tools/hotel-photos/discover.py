"""Search the current hotel catalog for Commons candidates; never auto-publish a match."""

import csv
import gzip
import hashlib
import json
import time
import urllib.parse

from catalog import API, CACHE, ROOT, get, read, write


def discover():
    with gzip.open(ROOT / "backend/data/region/hotels.csv.gz", "rt") as stream:
        hotels = list(csv.DictReader(stream))
    names = list(dict.fromkeys(hotel["name"] for hotel in hotels))
    results = {}
    for index, name in enumerate(names):
        query = '"' + name.replace('"', '') + '" filetype:bitmap'
        key = hashlib.sha256(query.encode()).hexdigest()[:16]
        cache = CACHE / f"candidate-{key}.json"
        if cache.exists():
            data = read(cache)
        else:
            params = dict(action="query", generator="search", gsrsearch=query,
                          gsrnamespace=6, gsrlimit=10, prop="imageinfo",
                          iiprop="url|extmetadata|size", iiurlwidth=1280, format="json")
            data = json.loads(get(API + "?" + urllib.parse.urlencode(params)))
            if "error" not in data:
                write(cache, data)
            time.sleep(4)
        results[name] = data
        pages = data.get("query", {}).get("pages", {}).values()
        print(f"{index + 1}/{len(names)} {name}: " + " | ".join(page["title"] for page in pages), flush=True)
        write(CACHE / "discovery.json", results)
    print("Candidates saved. Review identity, location, date, author, license and image before selection.json.")


if __name__ == "__main__":
    discover()
