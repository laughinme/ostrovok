import re

from app.domain.knowledge.scope import Facade

_NUMBERS = {
    "сто двадцать": 120,
    "тридцать пять": 35,
    "двадцати пяти": 25,
    "двадцать пять": 25,
    "тридцать": 30,
    "двадцать": 20,
    "сто": 100,
    "семьсот": 700,
    "пятьсот": 500,
    "шестьдесят": 60,
    "первого": 1,
    "первый": 1,
    "третьего": 3,
    "третьем": 3,
    "четвертого": 4,
    "четвертом": 4,
    "пятого": 5,
    "восьмой": 8,
    "девятого": 9,
    "десятый": 10,
}
_DIRECTIONS = (
    (r"юго[ -]?запад\w*|юз|sw", Facade.SW),
    (r"северо[ -]?восточ\w*|св|ne", Facade.NE),
    (r"юго[ -]?восточ\w*|юв|se", Facade.SE),
    (r"северо[ -]?запад\w*|сз|nw", Facade.NW),
    (r"север\w*|n", Facade.N),
    (r"южн\w*|юг|s", Facade.S),
    (r"восточ\w*|восток|e", Facade.E),
    (r"запад\w*|w", Facade.W),
)


def normalize(text: str) -> str:
    text = text.casefold().replace("ё", "е")
    for word, number in _NUMBERS.items():
        text = re.sub(rf"\b{word}\b", str(number), text)
    return text


def direction(text: str) -> Facade | None:
    for pattern, facade in _DIRECTIONS:
        if re.search(rf"\b(?:{pattern})\b", text):
            return facade
    return None


def room_names(text: str, known: tuple[str, ...] = ()) -> list[str]:
    quoted = re.findall(r"[«\"]([^»\"]+)[»\"]", text)
    if quoted:
        return [
            next((name for name in known if normalize(name) == q), q.capitalize())
            for q in dict.fromkeys(quoted)
        ]
    names = known or ("Стандарт", "Комфорт", "Люкс", "Делюкс", "Бизнес", "Панорама")
    return [name for name in names if re.search(rf"\b{re.escape(normalize(name))}\w*", text)]


def floor_range(text: str) -> tuple[int | None, int | None]:
    low = re.search(r"\bс\s+(\d+)(?:-?го)?(?:\s+этажа)?", text)
    high = re.search(r"\b(?:по|до)\s+(\d+)", text)
    return (int(low[1]) if low else None, int(high[1]) if high else None)


def _step_free(text: str) -> bool | None:
    if re.search(r"пандус\w* (?:к сожалению )?нет|без.*ступен\w* не предусмотрен", text):
        return False
    if re.search(r"пандус|ни одной ступен|без (?:подъема по )?ступен", text):
        return True
    return None


def boolean(text: str, key: str) -> bool | None:
    if key == "step_free":
        return _step_free(text)
    if key == "soundproofing":
        if re.search(r"шумоизоляц\w*.{0,12}нет|без.*шумоизоляц", text):
            return False
        if re.search(r"шумоизоляц\w*.{0,8}есть|шумозащит|звуконепроницаем", text):
            return True
    if re.match(r"(?:да|конечно)\b", text):
        return True
    if re.search(r"\bнет\b|^неа\b|отсутствует|не установлен", text):
        return False
    positive = re.search(r"\bесть\b|установлен|блэкаут|работают|принимаем|разрешен", text)
    return True if positive else None


def ambiguous(text: str) -> bool:
    return bool(
        re.search(
            r"вроде|кажется|не помню|не могу|не подскажу|надо смотреть|нужно согласовать|"
            r"все индивидуально|по-разному|лучше уточнить|зависит от",
            text,
        )
    )
