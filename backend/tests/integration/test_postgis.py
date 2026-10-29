from sqlalchemy import text

from app.db.database import Database


async def test_postgis_answers_distance_queries(db: Database) -> None:
    async with db.raw_session() as session:
        within = await session.scalar(
            text(
                "SELECT ST_DWithin("
                "ST_GeogFromText('POINT(39.7200 43.5800)'),"
                "ST_GeogFromText('POINT(39.7208 43.5803)'), :meters)"
            ),
            {"meters": 100},
        )
        too_far = await session.scalar(
            text(
                "SELECT ST_DWithin("
                "ST_GeogFromText('POINT(39.7200 43.5800)'),"
                "ST_GeogFromText('POINT(39.7208 43.5803)'), :meters)"
            ),
            {"meters": 50},
        )

    assert within is True
    assert too_far is False
