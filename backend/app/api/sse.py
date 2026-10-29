import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi.responses import StreamingResponse

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"}


def sse_response(events: AsyncIterator[dict[str, Any] | None]) -> StreamingResponse:

    async def body() -> AsyncIterator[str]:
        yield "retry: 2000\n\n"
        async for event in events:
            if event is None:
                yield ": ping\n\n"
                continue
            data = json.dumps(event, ensure_ascii=False, default=str)
            yield f"event: {event.get('type', 'message')}\ndata: {data}\n\n"

    return StreamingResponse(body(), media_type="text/event-stream", headers=SSE_HEADERS)
