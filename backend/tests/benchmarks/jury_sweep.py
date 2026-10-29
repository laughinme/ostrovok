"""Explicit HTTP QA: 100 local queries or 30 public queries, always sequential."""

import argparse
import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

QUERIES = Path(__file__).resolve().parents[2] / "data/eval/jury_queries.json"


def post(base: str, path: str, body: dict[str, Any]) -> dict[str, Any]:
    if not base.startswith(("https://", "http://")):
        raise ValueError("Use an HTTP(S) API URL")
    started = time.monotonic()
    request = urllib.request.Request(  # noqa: S310
        base + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=35) as response:  # noqa: S310
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as exc:
        status, raw = exc.code, exc.read()
    except (OSError, TimeoutError) as exc:
        return {"status": 0, "ms": round((time.monotonic() - started) * 1000), "error": str(exc)}
    try:
        data = json.loads(raw)
    except ValueError:
        data = {"error": raw.decode(errors="replace")[:200]}
    return {"status": status, "ms": round((time.monotonic() - started) * 1000), "data": data}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8104")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--public", action="store_true", help="30 cases, 7 s pause, 3 auto parses")
    args = parser.parse_args()
    if not args.public and not args.url.startswith(("http://127.0.0.1:", "http://localhost:")):
        parser.error("A remote server requires --public (30 cases with pauses)")
    queries = json.loads(QUERIES.read_text())
    rows = []
    for index, query in enumerate(queries[:30] if args.public else queries, 1):
        planner = "auto" if args.public and index in (1, 2, 9) else "rules"
        intent = post(args.url, "/api/v1/intents?planner=" + planner, {"text": query})
        search = None
        if intent["status"] == 200:
            data = intent["data"]
            trip = dict(data["trip"])
            if args.public:
                time.sleep(0.5)
            search = post(
                args.url,
                "/api/v1/searches",
                {
                    "text": query,
                    "chips": data["chips"],
                    "trip": trip,
                    "useProfile": False,
                },
            )
        rows.append(
            {
                "id": index,
                "query": query,
                "plannerRequested": planner,
                "intent": intent,
                "search": search,
            }
        )
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")
        print(index, intent["status"], search["status"] if search else "-", flush=True)  # noqa: T201
        time.sleep(7 if args.public else 0.1)


if __name__ == "__main__":
    main()
