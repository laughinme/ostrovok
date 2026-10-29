import pytest

from app.service.quality.claims import claimed_distance, distance_agrees


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("100 м", ("metres", 100)),
        ("около 250 м", ("metres", 250)),
        ("15–20 минут пешком", ("minutes", 17.5)),
        ("5 минут", ("minutes", 5)),
        ("да", None),
        (None, None),
    ],
)
def test_claimed_distance(value: str | None, expected: tuple[str, float] | None) -> None:
    assert claimed_distance({"value": value, "claim": ""}) == expected


def test_transfer_is_not_a_walk() -> None:
    claim = {"value": "40 минут", "claim": "Трансфер к морским пляжам курорта"}

    assert claimed_distance(claim) is None


def test_minutes_compare_with_the_route_and_metres_with_the_map() -> None:
    assert distance_agrees("minutes", 17.5, 18.3, None)
    assert not distance_agrees("minutes", 7, 12.8, 908)
    assert distance_agrees("metres", 300, 0, 198)
    assert not distance_agrees("metres", 100, 0, 381)
    assert not distance_agrees("metres", 100, 0, None)
