import pytest
from pydantic import TypeAdapter, ValidationError

from app.service.recipes.models import PoiNearbyRecipe, Recipe, WalkToRecipe

RECIPE = TypeAdapter(Recipe)


def test_curator_draft_for_khinkali_validates() -> None:
    recipe = RECIPE.validate_python(
        {"kind": "poi_nearby", "poi": {"tags": {"cuisine": ["georgian"]}}, "within_minutes": 10}
    )

    assert isinstance(recipe, PoiNearbyRecipe)
    assert recipe.open == "any"


def test_walk_to_tag_target() -> None:
    recipe = RECIPE.validate_python(
        {"kind": "walk_to", "target": "beach", "profile": "stroller", "no_steps": True}
    )

    assert isinstance(recipe, WalkToRecipe)
    assert recipe.target == "beach"


@pytest.mark.parametrize(
    "raw",
    [
        {"kind": "teleport"},
        {"kind": "poi_nearby", "poi": {"tags": {"amenity": ["pharmacy"]}}},
        {"kind": "view", "target": "sea", "min_share": 3},
        {"kind": "view", "target": "sea", "sql": "DROP TABLE facts"},
    ],
)
def test_bad_recipes_are_refused(raw: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        RECIPE.validate_python(raw)
