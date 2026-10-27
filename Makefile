.PHONY: data

data:
	cd backend && uv run --group pipeline python -m pipeline manifest
