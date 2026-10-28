from fastapi import APIRouter

from app.api import system
from app.api.v1 import (
    auth,
    bookings,
    characteristics,
    compare,
    console,
    ground,
    hotels,
    me,
    moods,
    onboarding,
    partner,
    photo_intent,
    quality,
    runs,
    search,
    taste,
)

v1_router = APIRouter(prefix="/v1")
v1_router.include_router(auth.router)
v1_router.include_router(me.router)
v1_router.include_router(partner.router)
v1_router.include_router(bookings.router)
v1_router.include_router(taste.router)
v1_router.include_router(hotels.router)
v1_router.include_router(ground.router)
v1_router.include_router(characteristics.router)
v1_router.include_router(runs.router)
v1_router.include_router(search.router)
v1_router.include_router(photo_intent.router)
v1_router.include_router(moods.router)
v1_router.include_router(compare.router)
v1_router.include_router(console.router)
v1_router.include_router(onboarding.router)
v1_router.include_router(quality.router)

api_router = APIRouter(prefix="/api")
api_router.include_router(system.health_router)
api_router.include_router(system.router)
api_router.include_router(v1_router)
