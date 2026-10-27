from uuid import uuid4

from app.domain.users import CurrentUser, Permission, Role


def _actor(role: Role) -> CurrentUser:
    return CurrentUser(id=uuid4(), role=role, session_id=uuid4())


def test_operator_has_every_permission() -> None:
    assert all(_actor(Role.OPERATOR).can(permission) for permission in Permission)


def test_guest_and_hotelier_are_separated() -> None:
    assert _actor(Role.GUEST).can(Permission.TRIPS)
    assert not _actor(Role.GUEST).can(Permission.PARTNER_CABINET)
    assert _actor(Role.HOTELIER).can(Permission.PARTNER_CABINET)
    assert not _actor(Role.HOTELIER).can(Permission.CONSOLE_READ)
