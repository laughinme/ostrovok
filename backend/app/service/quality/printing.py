from collections.abc import Mapping
from typing import Any


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
        ("LLM", report["llmStatus"]),
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
