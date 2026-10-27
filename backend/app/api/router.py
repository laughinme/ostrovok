from fastapi import APIRouter

from app.api import system
from app.api.v1 import auth, characteristics, hotels, me, runs

v1_router = APIRouter(prefix="/v1")
v1_router.include_router(auth.router)
v1_router.include_router(me.router)
v1_router.include_router(hotels.router)
v1_router.include_router(characteristics.router)
v1_router.include_router(runs.router)

api_router = APIRouter(prefix="/api")
api_router.include_router(system.health_router)
api_router.include_router(system.router)
api_router.include_router(v1_router)
