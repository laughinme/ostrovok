from collections.abc import Mapping
from typing import Any

EVALUATION_VERSION = 2


def _number(value: Any) -> str:
    return "нет данных" if value is None else f"{value:.4f}"


def _summary_rows(report: Mapping[str, Any]) -> list[tuple[str, str]]:
    rules = report["intents"]["rules"]
    curator = report["curator"]["rules"]
    answers = report["hotelierAnswers"]["rules"]
    return [
        (
            "Намерения: precision / recall / F1",
            " / ".join(_number(rules["micro"][k]) for k in ("precision", "recall", "f1")),
        ),
        ("Намерения: поля поездки", _number(rules["tripAccuracy"])),
        (
            "Ответы отеля: машинные поля",
            f"{answers['exact_fields']}/{answers['total_fields']} = "
            f"{_number(answers['fieldAccuracy'])}",
        ),
        (
            "Ответы отеля: переспросы",
            f"{answers['correct_clarifications']}/{answers['total_ambiguous']}",
        ),
        (
            "Куратор: метод / параметры",
            f"{_number(curator['methodAccuracy'])} / {_number(curator['parameterAccuracy'])}",
        ),
        (
            "Поиск: nDCG@10",
            f"{_number(report['ndcg10'])} "
            f"({report['search']['evaluated']}/{report['search']['n']} запросов)",
        ),
        ("Доля фактов с участием отеля", _number(report["hotelierShare"])),
        ("Эталон", report["gold"]["status"]),
        *_claims_rows(report.get("officialClaims") or {}),
        ("LLM", report["llmStatus"]),
    ]


def _claims_rows(claims: Mapping[str, Any]) -> list[tuple[str, str]]:
    if "views" not in claims:
        return []
    views, beach = claims["views"], claims["beach"]
    return [
        (
            "Сайты отелей: заявленный вид найден",
            f"{views['agree']}/{views['checked']} = {_number(views['agreement'])}",
        ),
        (
            "Сайты отелей: расстояние до пляжа",
            f"{beach['agree']}/{beach['checked']} = {_number(beach['agreement'])}; "
            f"по карте в {beach['medianStraightToClaimedMetres']} раза дальше заявленных метров",
        ),
    ]


def report_table(report: Mapping[str, Any]) -> str:
    lines = [f"Качество · {report['generatedAt']}", "Метрика | Значение", "--- | ---"]
    lines.extend(f"{name} | {value}" for name, value in _summary_rows(report))
    lines.extend(
        [
            "",
            "Характеристика | Факты | Покрытие | n эталона | Точность | ECE",
            "--- | --- | --- | --- | --- | ---",
        ]
    )
    lines.extend(
        f"{c['key']} | {c['factCount']} | {_number(c['coverage'])} | {c['n']} | "
        f"{_number(c['accuracy'])} | {_number(c['ece'])}"
        for c in report["perCharacteristic"]
    )
    if "llm" in report["intents"]:
        result = report["intents"]["llm"]
        lines.append(
            f"\nLLM намерений: {result['n']}/{result['requested']} ответов LLM; "
            f"F1 {_number(result['micro']['f1'])}. Откаты на правила исключены."
        )
    lines.append(
        "\nПоиск: рубрика по фактам расчёта, фиксированный пул; независимой разметкой не является."
    )
    return "\n".join(lines)


def _pair(metric: Any, rules: Any, llm: Any) -> str:
    return f"{_number(metric(rules))} → {_number(metric(llm))}"


def _set_rows(name: str, result: Mapping[str, Any]) -> list[str]:
    intents, answers, curator = result["intents"], result["answers"], result["curator"]
    return [
        f"{name}: намерения F1 | {_pair(lambda r: r['micro']['f1'], *intents.values())}",
        f"{name}: поля поездки | {_pair(lambda r: r['tripAccuracy'], *intents.values())}",
        f"{name}: ответы отеля, поля | {_pair(lambda r: r['fieldAccuracy'], *answers.values())}",
        f"{name}: ответы отеля, переспросы | "
        f"{_pair(lambda r: r['clarificationAccuracy'], *answers.values())}",
        f"{name}: Куратор, метод | {_pair(lambda r: r['methodAccuracy'], *curator.values())}",
        f"{name}: Куратор, параметры | "
        f"{_pair(lambda r: r['parameterAccuracy'], *curator.values())}",
    ]


def llm_table(report: Mapping[str, Any]) -> str:
    lines = [
        f"LLM {report['model']} ({report['thinking']}), Куратор {report['strongModel']} "
        f"({report['thinkingStrong']})",
        "Метрика | правила → LLM",
        "--- | ---",
    ]
    for name, result in report["sets"].items():
        lines.extend(_set_rows(name, result))
    explained = report["explain"]
    lines.append(
        f"Объяснения: прошли проверку чисел | {explained['accepted']}/{explained['attempted']}"
    )
    lines.extend(
        [
            "",
            "Задача | вызовы | из кэша | сбои | p50, мс | p95, мс | токены вход/кэш/выход | $",
            "--- | --- | --- | --- | --- | --- | --- | ---",
        ]
    )
    for tier in report["usage"].values():
        for task, t in tier["tasks"].items():
            lines.append(
                f"{task} | {t['calls']} | {t['cached']} | {t['failed']} | {t['p50Ms']} | "
                f"{t['p95Ms']} | {t['inputTokens']}/{t['cachedTokens']}/{t['outputTokens']} | "
                f"{t['costUsd']}"
            )
    lines.append(f"\nВсего за прогон: ${report['costUsd']}")
    return "\n".join(lines)


def _metric(run: Mapping[str, Any], name: str, path: tuple[str, ...]) -> str:
    value: Any = run["sets"].get(name)
    for key in path:
        value = value.get(key) if isinstance(value, Mapping) else None
    return "—" if value is None else f"{value:.2f}"


def comparison_table(runs: list[Mapping[str, Any]]) -> str:
    header = (
        "Модель (рассуждения) | F1 намерений dev/hold | ответы dev/hold | переспросы hold | "
        "Куратор метод dev/hold | объяснения | p50 намерений, с | p50 Куратора, с | "
        "$ за 1000 разборов | $ прогон | LLM hold: запросы/ответы/Куратор"
    )
    lines = [header, " | ".join(["---"] * 11)]
    for run in runs:
        fast = run["usage"]["fast"]["tasks"].get("intent", {})
        strong = run["usage"]["strong"]["tasks"].get("curator", {})
        per_call = fast.get("costPerCallUsd")
        name = f"{run['model']} ({run['thinking']})"
        if run.get("evaluationVersion") != EVALUATION_VERSION:
            name += " [архив v1]"
        if run["strongModel"] != run["model"] or run["thinkingStrong"] != run["thinking"]:
            name += f" + {run['strongModel']} ({run['thinkingStrong']})"
        lines.append(
            " | ".join(
                [
                    name,
                    "/".join(
                        _metric(run, s, ("intents", "llm", "micro", "f1"))
                        for s in ("main", "holdout")
                    ),
                    "/".join(
                        _metric(run, s, ("answers", "llm", "fieldAccuracy"))
                        for s in ("main", "holdout")
                    ),
                    _metric(run, "holdout", ("answers", "llm", "clarificationAccuracy")),
                    "/".join(
                        _metric(run, s, ("curator", "llm", "methodAccuracy"))
                        for s in ("main", "holdout")
                    ),
                    f"{run['explain']['accepted']}/{run['explain']['attempted']}",
                    f"{fast['p50Ms'] / 1000:.1f}" if fast.get("p50Ms") else "—",
                    f"{strong['p50Ms'] / 1000:.1f}" if strong.get("p50Ms") else "—",
                    f"{per_call * 1000:.2f}" if per_call else "—",
                    str(run["costUsd"]),
                    _coverage(run),
                ]
            )
        )
    return "\n".join(lines)


def _coverage(run: Mapping[str, Any]) -> str:
    hold = run["sets"].get("holdout", {})
    parts = []
    for task, count in (("intents", "n"), ("answers", "evaluated"), ("curator", "n")):
        metric = hold.get(task, {}).get("llm", {})
        parts.append(f"{metric.get(count, '?')}/{metric.get('requested', '?')}")
    return "; ".join(parts)
