"""Fictional Anna history with explicit evidence for quietness and gentle walks."""

from typing import Any


def _booking(hotel: dict[str, str], card: dict[str, Any], index: int) -> dict[str, Any]:
    room = card["rooms"][0]
    return {
        "id": f"demo-anna-stay-{index + 1}",
        "isDemo": True,
        "osm_id": hotel["osm_id"],
        "room_type_id": room["id"],
        "rate_plan_id": room["rates"][0]["id"],
        "check_in": ["2026-06-10", "2026-09-12"][index],
        "check_out": ["2026-06-17", "2026-09-19"][index],
        "status": "completed",
        "adults": 2,
        "children": 0,
        "price_demo": room["rates"][0]["price"] * 7,
        "request": "Тихий номер, пожалуйста, подальше от лифта",
        "feedback": [
            "Вид понравился, но сон важнее: в следующий раз выберу тихую сторону",
            "Тихий номер без панорамы понравился больше. Подъём с пляжа утомлял",
        ][index],
    }


def _edits() -> list[dict[str, Any]]:
    edits = [
        ("night_noise", "nice", "must", "Тишина важнее красивого вида"),
        ("sea_view", "must", "nice", "Готова отказаться от вида ради спокойного сна"),
        ("steep_streets", "nice", "must", "Не люблю подъёмы на обратном пути с пляжа"),
    ]
    return [
        {
            "at": f"2026-10-20T14:{20 + i:02d}:00+03:00",
            "characteristic": key,
            "from": before,
            "to": after,
            "operator": "eq",
            "value": key != "steep_streets",
            "reason": reason,
        }
        for i, (key, before, after, reason) in enumerate(edits)
    ]


def _rejections(hotels: list[dict[str, str]]) -> list[dict[str, Any]]:
    return [
        {
            "osm_id": hotels[0]["osm_id"],
            "at": "2026-10-20T14:10:00+03:00",
            "characteristic": "night_noise",
            "reason": "Не хочу рисковать с ночным шумом",
        },
        {
            "osm_id": hotels[1]["osm_id"],
            "at": "2026-10-20T14:15:00+03:00",
            "characteristic": "steep_streets",
            "reason": "Не хочу подниматься в гору после пляжа",
        },
    ]


def generate_history(hotels: list[dict[str, str]], cards: dict[str, Any]) -> dict[str, Any]:
    """Stable real hotel/room references; preferences are fictional guest actions."""
    ordered = sorted(hotels, key=lambda row: row["osm_id"])
    by_district = {
        d: [h for h in ordered if h["district"] == d] for d in {h["district"] for h in ordered}
    }
    stays = [by_district["center"][0], by_district["khosta"][0]]
    rejected = [by_district["center"][1], by_district["khosta"][1]]
    return {
        "isDemo": True,
        "guests": {
            "guest_anna": {
                "isDemo": True,
                "bookings": [
                    _booking(h, cards["hotels"][h["osm_id"]], i) for i, h in enumerate(stays)
                ],
                "saved_hotels": [h["osm_id"] for h in by_district["adler"][:2]],
                "rejected_hotels": _rejections(rejected),
                "chip_edits": _edits(),
                "expected_taste": ["Тишина важнее вида", "Не любит подъёмы"],
                "note": "Демо-история вымышленного гостя; не отзывы и не факты о реальных отелях",
            }
        },
    }
