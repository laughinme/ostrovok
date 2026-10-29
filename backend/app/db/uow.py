from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.agents import AgentRepository
from app.db.repositories.catalog import CatalogRepository
from app.db.repositories.jobs import JobRepository
from app.db.repositories.knowledge import KnowledgeRepository
from app.db.repositories.sessions import SessionRepository
from app.db.repositories.users import UserRepository


class UnitOfWork:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.sessions = SessionRepository(session)
        self.jobs = JobRepository(session)
        self.agents = AgentRepository(session)
        self.knowledge = KnowledgeRepository(session)
        self.catalog = CatalogRepository(session)

    async def flush(self) -> None:
        await self.session.flush()
