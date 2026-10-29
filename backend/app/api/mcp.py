from collections.abc import Callable

from mcp.server import MCPServer
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import ToolAnnotations

from app.api.mcp_tools import KnowledgeTools
from app.core.config import Settings
from app.db.database import Database
from app.service.ports import Clock

READ_ONLY = ToolAnnotations(
    readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False
)
LOCAL_HOSTS = ["localhost", "localhost:*", "127.0.0.1", "127.0.0.1:*", "[::1]", "[::1]:*"]
LOCAL_ORIGINS = ["http://localhost:8080", "http://localhost:3000", "http://127.0.0.1:8080"]
CONNECTOR_ORIGINS = ["https://claude.ai", "https://chatgpt.com"]


def transport_security(settings: Settings) -> TransportSecuritySettings:
    public = settings.mcp_hosts
    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=[*LOCAL_HOSTS, *public],
        allowed_origins=[
            *LOCAL_ORIGINS,
            *(f"https://{host}" for host in public),
            *(CONNECTOR_ORIGINS if public else []),
        ],
    )


def build_mcp(
    database: Callable[[], Database], settings: Settings, clock: Clock
) -> MCPServer[None]:
    server: MCPServer[None] = MCPServer(
        "О!кно Hotel Knowledge",
        version="1.0.0",
        instructions="Открытые знания об отелях Сочи. Учитывайте область факта, даты, "
        "уверенность и источники. "
        "Цены и категории номеров помечены как демо. Инструменты только читают данные.",
    )

    tools = KnowledgeTools(database, settings, clock)
    for tool in (
        tools.search_hotels,
        tools.get_hotel_knowledge,
        tools.explain_fact,
        tools.compare_hotels,
        tools.list_characteristics,
    ):
        server.add_tool(tool, annotations=READ_ONLY)
    return server
