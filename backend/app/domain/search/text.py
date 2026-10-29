import re

_PUNCT = re.compile(r"[^\w\s₽%°\-–—/.]+", re.UNICODE)
_DECIMAL = re.compile(r"(\d)[.,](\d)")
_SPACES = re.compile(r"\s+")

MONTHS_GENITIVE = {
    "января": 1, "февраля": 2, "марта": 3, "апреля": 4, "мая": 5, "июня": 6, "июля": 7,
    "августа": 8, "сентября": 9, "октября": 10, "ноября": 11, "декабря": 12,
}  # fmt: skip
MONTHS_PREPOSITIONAL = {
    "январе": 1, "феврале": 2, "марте": 3, "апреле": 4, "мае": 5, "июне": 6, "июле": 7,
    "августе": 8, "сентябре": 9, "октябре": 10, "ноябре": 11, "декабре": 12,
}  # fmt: skip
NUMBER_WORDS = {
    "один": 1, "одна": 1, "одного": 1, "два": 2, "две": 2, "двух": 2, "двое": 2, "три": 3,
    "трое": 3, "трёх": 3, "трех": 3, "четыре": 4, "четверо": 4, "пять": 5, "пятеро": 5,
    "шесть": 6, "семь": 7, "восемь": 8, "девять": 9, "десять": 10, "пятнадцать": 15,
    "двадцать": 20, "тридцать": 30, "первого": 1, "второго": 2, "третьего": 3,
    "четвёртого": 4, "четвертого": 4, "пятого": 5, "шестого": 6, "седьмого": 7,
    "восьмого": 8, "девятого": 9, "десятого": 10,
}  # fmt: skip


def normalize(text: str) -> str:
    text = text.lower().replace("ё", "е")
    text = _DECIMAL.sub(r"\1.\2", text)
    text = _PUNCT.sub(" ", text).replace(". ", " ").rstrip(".")
    return _SPACES.sub(" ", text).strip()


def sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"[.!?\n;]+", text) if s.strip()]


def to_number(token: str) -> float | None:
    token = token.replace(",", ".").replace("ё", "е")
    try:
        return float(token)
    except ValueError:
        return NUMBER_WORDS.get(token)
