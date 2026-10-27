import numpy as np
import pytest

from pipeline.walkways import directions, grade, step_counts, uncertain_way, walkable


@pytest.mark.parametrize(
    "tags",
    [
        {"highway": "residential", "oneway": "yes"},
        {"highway": "footway", "access": "private", "foot": "yes"},
        {"highway": "steps"},
        {"highway": "path"},
        {"highway": "pedestrian"},
    ],
)
def test_public_and_explicitly_permitted_foot_access(tags):
    assert walkable(tags)


@pytest.mark.parametrize(
    "tags",
    [
        {"highway": "residential", "foot": "no"},
        {"highway": "footway", "access": "private"},
        {"highway": "motorway"},
        {"highway": "construction"},
    ],
)
def test_forbidden_and_unbuilt_roads_are_excluded(tags):
    assert not walkable(tags)


def test_only_pedestrian_oneway_affects_directions():
    assert directions({"oneway": "yes"}) == (True, True)
    assert directions({"oneway:foot": "yes"}) == (True, False)
    assert directions({"oneway:foot": "-1"}) == (False, True)


def test_steps_are_conserved_on_intermediate_segments():
    counts = step_counts({"highway": "steps", "step_count": "17"}, np.array([1.0, 2.0, 3.0]))
    assert counts.tolist() == [3, 6, 8]
    assert counts.sum() == 17
    estimated = step_counts({"highway": "steps"}, np.array([3.0, 6.0]))
    assert estimated.sum() == 30
    assert uncertain_way({"highway": "steps", "surface": "concrete"})
    assert not uncertain_way({"highway": "steps", "surface": "concrete", "step_count": "17"})


def test_grade_separates_interior_bridge_and_tunnel_vertices():
    assert grade({}) == "0"
    assert grade({"bridge": "yes"}) == "1"
    assert grade({"tunnel": "yes"}) == "-1"
    assert grade({"bridge": "yes", "layer": "2"}) == "2"
