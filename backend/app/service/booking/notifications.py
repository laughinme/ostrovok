from uuid import UUID

from sqlalchemy import select

from app.db.models import NotificationRow
from app.db.uow import UnitOfWork
from app.service.booking.models import Notification


async def guest_notifications(uow: UnitOfWork, user_id: UUID) -> list[Notification]:
    rows = (
        await uow.session.scalars(
            select(NotificationRow)
            .where(
                NotificationRow.user_id == user_id,
                NotificationRow.audience == "guest",
            )
            .order_by(NotificationRow.created_at.desc(), NotificationRow.id)
            .limit(100)
        )
    ).all()
    return [
        Notification(
            id=r.id,
            audience=r.audience,
            kind=r.kind,
            title=r.title,
            body=r.body,
            at=r.created_at,
            read=r.read_at is not None,
            link=r.link,
        )
        for r in rows
    ]
