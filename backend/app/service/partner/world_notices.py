from uuid import UUID

from app.db.database import Database
from app.db.models import NotificationRow


class HotelNotices:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def __call__(self, hotel_id: UUID, title: str, body: str) -> None:
        async with self._db.unit_of_work() as uow:
            uow.session.add(
                NotificationRow(
                    audience="hotel",
                    hotel_id=hotel_id,
                    kind="world_change",
                    title=title,
                    body=body,
                    link=f"/partner/hotels/{hotel_id}",
                )
            )
