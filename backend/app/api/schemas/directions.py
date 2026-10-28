from app.api.schemas.base import ApiModel


class PlaceOut(ApiModel):
    ref: str
    name: str
    address: str
    location: tuple[float, float]
    attribution: str = "© OpenStreetMap contributors (ODbL) · Nominatim"
