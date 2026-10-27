from typing import ClassVar

from app.domain.knowledge.characteristic import MethodKind
from app.domain.knowledge.observation import CLIMATE_ATTRIBUTION, Evidence, EvidenceKind
from app.domain.knowledge.scope import Scope
from app.domain.knowledge.sources import SourceKind
from app.service.recipes.executor import Environment, Finding, MethodCall, NoDataError

_FIELDS = {
    "air_max": "air_max_c",
    "air_min": "air_min_c",
    "water": "water_c",
    "sun_hours": "sun_hours",
    "rain_days": "rain_days",
    "daylight_h": "daylight_h",
}


class ClimateExecutor:
    """`climate`: monthly norms of the nearest sample point (Open-Meteo, 10 years)."""

    method: ClassVar[MethodKind] = MethodKind.CLIMATE

    async def collect(self, call: MethodCall, env: Environment) -> list[Finding]:
        if env.climate is None:
            raise NoDataError("climate norms are not loaded")
        station = env.climate.nearest(call.hotel.location)
        period = env.climate.period or "10 лет"
        findings = []
        for normal in station.normals:
            values = {k: _round(normal.values.get(v)) for k, v in _FIELDS.items()}
            findings.append(
                Finding(
                    scope=Scope(months=frozenset({normal.month})),
                    value=values,
                    confidence=0.9,
                    source=SourceKind.OPEN_DATA,
                    source_ref=f"open-meteo:{station.ref}",
                    method="климатические нормы Open-Meteo за 10 лет, ближайшая точка",
                    evidence=(
                        Evidence(
                            kind=EvidenceKind.CLIMATE_CHART,
                            summary=f"нормы точки «{station.ref}» за {period}",
                            attribution=CLIMATE_ATTRIBUTION,
                            params={"station": station.ref, "month": normal.month},
                        ),
                    ),
                )
            )
        await call.tracer.tool(
            "climate.normals",
            summary=f"нормы по 12 месяцам, точка «{station.ref}»",
            args={"hotel": call.hotel.osm_id},
        )
        return findings


def _round(value: float | None) -> float | None:
    return round(value, 1) if value is not None else None
