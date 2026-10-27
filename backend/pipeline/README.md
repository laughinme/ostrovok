# Данные региона

Запуск из корня: `make data`. Отдельные этапы:
`cd backend && uv run --group pipeline python -m pipeline <osm|dem|climate|hotels|graph|manifest|all>`.
Сырые ответы кэшируются в `backend/.cache/pipeline/` по SHA-256 запроса. Удаление кэша означает
новый снимок источников. CSV.gz пишутся с фиксированным gzip mtime. API LLM не используется.

Проверки: `cd backend && uv run ruff check pipeline`; тесты пайплайна запускаются отдельно от приложения.
MANIFEST формируется из реально существующих файлов; превышение бюджета приводит к ошибке.
