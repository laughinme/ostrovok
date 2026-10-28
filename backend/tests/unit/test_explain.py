from app.domain.search.explain import faithful


def test_same_numbers_pass() -> None:
    assert faithful(
        "Закат видно только с 5-го этажа, просите повыше",
        ["⚠ закат над морем · ЮЗ-фасад, этаж 5 и выше"],
    )


def test_invented_number_is_rejected() -> None:
    assert not faithful("До пляжа всего 3 минуты!", ["✓ до пляжа 7 мин пешком, обратно 9 мин"])


def test_empty_or_long_is_rejected() -> None:
    assert not faithful("", ["x"])
    assert not faithful("а" * 300, ["а"])
