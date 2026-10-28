import asyncio
from pathlib import Path
from typing import Any

import yaml


async def read_yaml(path: Path) -> Any:
    raw = await asyncio.to_thread(path.read_text, encoding="utf-8")
    return yaml.safe_load(raw)
