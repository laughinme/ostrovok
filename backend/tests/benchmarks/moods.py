import asyncio
import json
import sys
from time import perf_counter

import numpy as np
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.db.database import Database
from app.main import create_app


async def measure() -> dict[str, object]:
    settings = get_settings().model_copy(update={"log_level": "WARNING", "llm_mode": "off"})
    db = Database(settings)
    app = create_app(settings)
    app.state.db = db
    times = []
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            for _ in range(21):
                started = perf_counter()
                response = await client.get("/api/v1/moods")
                response.raise_for_status()
                times.append((perf_counter() - started) * 1000)
        return {
            "coldMs": round(times[0], 1),
            "warmP95Ms": round(float(np.percentile(times[1:], 95)), 1),
            "warmMaxMs": round(max(times[1:]), 1),
            "month": response.json()[0]["month"],
            "counts": {row["id"]: row["count"] for row in response.json()},
        }
    finally:
        await db.dispose()


if __name__ == "__main__":
    sys.stdout.write(json.dumps(asyncio.run(measure()), ensure_ascii=False, indent=2) + "\n")
