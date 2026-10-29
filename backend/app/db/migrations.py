from geoalchemy2 import alembic_helpers


def include_object(
    obj: object, name: str | None, type_: str, reflected: bool, compare_to: object | None
) -> bool:
    if type_ == "table" and reflected and compare_to is None:
        return False
    return bool(
        alembic_helpers.include_object(obj, name, type_, reflected, compare_to)  # type: ignore[no-untyped-call]
    )
