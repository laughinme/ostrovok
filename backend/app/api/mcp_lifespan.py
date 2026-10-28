import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from mcp.server import MCPServer


@asynccontextmanager
async def mcp_lifespan(server: MCPServer[None]) -> AsyncIterator[None]:
    ready: asyncio.Future[None] = asyncio.get_running_loop().create_future()
    stop = asyncio.Event()

    async def serve() -> None:
        try:
            async with server.session_manager.run():
                ready.set_result(None)
                await stop.wait()
        except BaseException as exc:
            if not ready.done():
                ready.set_exception(exc)
            raise

    # AnyIO cancellation scopes must enter and exit in the same task, including in test hosts.
    task = asyncio.create_task(serve(), name="mcp-session-manager")
    try:
        await ready
        yield
    finally:
        stop.set()
        await task
