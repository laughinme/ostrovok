from datetime import date
from typing import Any

from app.domain.knowledge.characteristic import Checkable
from app.domain.search.intent import Chip, Importance, Intent
from app.domain.search.trip import TripDraft


def intent_to_json(intent: Intent) -> dict[str, Any]:
    trip = intent.trip
    return {
        "text": intent.text,
        "planner": intent.planner,
        "hints": list(intent.hints),
        "chips": [
            {
                "id": c.id,
                "characteristic": c.characteristic,
                "label": c.label,
                "importance": c.importance.value,
                "checkable": c.checkable.value,
                "params": dict(c.params),
                "fromProfile": c.from_profile,
            }
            for c in intent.chips
        ],
        "trip": {
            "from": trip.check_in.isoformat() if trip.check_in else None,
            "to": trip.check_out.isoformat() if trip.check_out else None,
            "month": trip.month,
            "adults": trip.adults,
            "children": trip.children,
            "budgetPerNight": trip.budget_per_night,
            "area": trip.area,
        },
    }


def intent_from_json(data: dict[str, Any]) -> Intent:
    trip = data.get("trip") or {}
    return Intent(
        text=data.get("text"),
        planner=data.get("planner", "rules"),
        hints=tuple(data.get("hints", ())),
        chips=tuple(
            Chip(
                id=c["id"],
                label=c["label"],
                importance=Importance(c.get("importance", "important")),
                checkable=Checkable(c.get("checkable", "compute")),
                characteristic=c.get("characteristic"),
                params=c.get("params") or {},
                from_profile=bool(c.get("fromProfile", False)),
            )
            for c in data.get("chips", [])
        ),
        trip=TripDraft(
            check_in=date.fromisoformat(trip["from"]) if trip.get("from") else None,
            check_out=date.fromisoformat(trip["to"]) if trip.get("to") else None,
            month=trip.get("month"),
            adults=trip.get("adults"),
            children=trip.get("children"),
            budget_per_night=trip.get("budgetPerNight"),
            area=trip.get("area"),
        ),
    )
