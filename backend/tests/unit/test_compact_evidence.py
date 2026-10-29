from app.api.schemas.knowledge import EvidenceOut
from app.domain.knowledge.observation import Evidence, EvidenceKind

STREETS = Evidence(
    EvidenceKind.MAP_LAYER, "3 крутых участка", "© OSM", {"segments": [[39.7, 43.5]] * 500}
)
NOISE = Evidence(EvidenceKind.NOISE_FACADES, "индекс 20 дБ", "© OSM", {"indexDb": 20.0})


def test_compact_lists_leave_map_geometry_out() -> None:
    assert EvidenceOut.from_domain(STREETS, compact=True).params is None
    assert EvidenceOut.from_domain(NOISE, compact=True).params == {"indexDb": 20.0}


def test_full_evidence_keeps_the_geometry() -> None:
    params = EvidenceOut.from_domain(STREETS).params

    assert params is not None
    assert len(params["segments"]) == 500
