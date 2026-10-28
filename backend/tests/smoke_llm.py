"""Live LLM acceptance on a disposable stack; spends credits and changes demo data.

Run explicitly: `make smoke-llm`. Never collected by pytest; no keys are passed to this script.
"""

# ruff: noqa: T201 - CLI progress, never credentials

import argparse
import json
import time
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx


def request(http: httpx.Client, method: str, path: str, **kwargs: Any) -> Any:
    response = http.request(method, path, **kwargs)
    response.raise_for_status()
    return response.json()


def login(http: httpx.Client, persona: str) -> dict[str, str]:
    result = request(
        http, "POST", "/api/v1/auth/demo", json={"persona": persona}, headers={"X-Client": "mobile"}
    )
    return {"Authorization": f"Bearer {result['access_token']}"}


def wait_run(http: httpx.Client, run_id: str) -> dict[str, Any]:
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        run = request(http, "GET", f"/api/v1/runs/{run_id}")
        if run["status"] in ("done", "failed"):
            assert run["status"] == "done", run["steps"][-3:]
            return run
        time.sleep(1)
    raise TimeoutError("Curator job did not finish within 120 seconds")


def verify_intent(http: httpx.Client, auth: dict[str, str]) -> dict[str, Any]:
    # A varying valid budget avoids falsely passing on an old response from the LLM cache.
    budget = 9000 + uuid4().int % 10000
    query = (
        "Нужна тишина ночью и вид на море в центре Сочи, двое взрослых, "
        f"12–15 ноября 2026, до {budget} рублей за ночь"
    )
    rules = request(http, "POST", "/api/v1/intents?planner=rules", json={"text": query})
    assert rules["planner"] == "rules"
    started = time.monotonic()
    intent = request(http, "POST", "/api/v1/intents", json={"text": query})
    intent_ms = round((time.monotonic() - started) * 1000)
    assert intent["planner"] == "llm", intent
    assert {"sea_view", "night_noise"} <= {c["characteristic"] for c in intent["chips"]}
    assert intent["trip"]["from"] == "2026-11-12"
    assert intent["trip"]["to"] == "2026-11-15"
    assert intent["trip"]["budgetPerNight"] == budget
    assert intent["trip"]["adults"] == 2
    assert intent["trip"]["area"] == "center"
    started = time.monotonic()
    assert request(http, "POST", "/api/v1/intents", json={"text": query}) == intent
    cache_ms = round((time.monotonic() - started) * 1000)
    calls = request(http, "GET", "/api/v1/console/llm/calls?task=intent&limit=2", headers=auth)
    assert [c["status"] for c in calls] == ["cached", "ok"], calls
    print(f"ok intent, trip fields and exact cache repeat: {intent_ms}/{cache_ms} ms")

    return {"intentMs": intent_ms, "cacheMs": cache_ms, "exactCacheRepeat": True}


def verify(http: httpx.Client, model: str) -> dict[str, Any]:
    assert request(http, "GET", "/health") == {"status": "ok"}
    auth = login(http, "operator")
    settings = request(http, "GET", "/api/v1/console/settings", headers=auth)
    assert settings["llmAvailable"], settings
    assert settings["llmMode"] == "auto", settings
    assert settings["llmModel"] == settings["llmModelStrong"] == model, settings

    intent_metrics = verify_intent(http, auth)

    radius = 500 + uuid4().int % 1000
    started = request(
        http,
        "POST",
        "/api/v1/console/characteristics",
        headers=auth,
        json={
            "description": f"Хинкальная или грузинский ресторан в радиусе {radius} метров по прямой"
        },
    )
    run = wait_run(http, started["runId"])
    tools = [s["tool"] for s in run["steps"] if s["tool"]]
    assert run["planner"] == "llm", run
    assert {"llm.curator", "recipe.validate", "recipe.dry_run"} <= set(tools), tools
    calls = request(http, "GET", "/api/v1/console/llm/calls?task=curator&limit=1", headers=auth)
    assert calls[0]["status"] == "ok", calls
    assert calls[0]["model"] == model, calls
    assert calls[0]["toolCalls"]
    assert all(c["result"] is not None for c in calls[0]["toolCalls"])
    print("ok Curator: queue, worker, model tools, recipe validation and dry-run")

    partner = login(http, "hotelier_salut")
    hotels = request(http, "GET", "/api/v1/hotels")
    hotel = next(h for h in hotels if h["name"] == "Санаторий Салют")
    questions = request(
        http, "GET", f"/api/v1/partner/hotels/{hotel['id']}/questions", headers=partner
    )
    question = next(q for q in questions if q["characteristic"] == "soundproofing")
    answer = request(
        http,
        "POST",
        f"/api/v1/partner/questions/{question['id']}/answers",
        headers=partner,
        json={"text": "Да, в номерах хорошая шумоизоляция, двойные стеклопакеты, улицу не слышно."},
    )
    assert answer["parser"] == "llm", answer
    assert answer["parsed"]["soundproof"] is True, answer
    print("ok Liaison: free-text hotelier answer parsed by the configured model")

    deadline = time.monotonic() + 70
    while time.monotonic() < deadline:
        calls = request(
            http, "GET", "/api/v1/console/llm/calls?task=hotelier&limit=20", headers=auth
        )
        if any(c["status"] == "ok" and c["model"] == model for c in calls):
            break
        time.sleep(1)
    else:
        raise TimeoutError("No successful demo-hotelier LLM call within 70 seconds")
    print("ok demo hotelier: a background answer used the configured model")
    usage = request(http, "GET", "/api/v1/console/llm/usage", headers=auth)
    return {
        "model": model,
        **intent_metrics,
        "curatorPlanner": run["planner"],
        "curatorTools": tools,
        "answerParser": answer["parser"],
        "demoHotelierLlm": True,
        "journalAndUsageReadable": True,
        "estimatedSessionCostUsd": usage["todayCostUsd"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url", nargs="?", default="http://localhost:8080")
    parser.add_argument("--model", default="openai/gpt-5.6-luna")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    started = time.monotonic()
    with httpx.Client(base_url=args.base_url, timeout=90, trust_env=False) as http:
        report = verify(http, args.model)
    report["elapsedSeconds"] = round(time.monotonic() - started, 2)
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"LLM smoke passed in {report['elapsedSeconds']} s")


if __name__ == "__main__":
    main()
