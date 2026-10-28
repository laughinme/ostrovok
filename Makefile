.DEFAULT_GOAL := help
.PHONY: help install env keys run worker migrate migration openapi lint fmt typecheck arch test-unit \
	test-deps test test-down check up up-native down dev logs data collect export-seed jury-secrets eval eval-llm eval-compare frontend-dev frontend-check smoke-llm

BACKEND := backend
# Public age key of the hackathon organizers: secrets for the jury are encrypted to it.
ORGANIZERS_AGE_KEY := age1932fu7f70rwyfhaxflyfszz4gf6avxwc95wc0yjwm6zns9tspycqpgdnc0
UV := cd $(BACKEND) && uv run
TEST_COMPOSE := docker compose -p okno-test -f docker-compose.test.yml
DEV_COMPOSE := docker compose -f docker-compose.yml -f compose.dev.yml

help: ## Show this help
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# --- setup -------------------------------------------------------------------------

install: ## Install backend and frontend dependencies, create env files and JWT keys if missing
	cd $(BACKEND) && uv sync
	npm --prefix frontend ci
	@$(MAKE) --no-print-directory env keys

env: ## Create .env and backend/.env from the examples (never overwrites)
	@test -f .env || (cp .env.example .env && echo "created .env")
	@test -f $(BACKEND)/.env || (cp $(BACKEND)/.env.example $(BACKEND)/.env && echo "created backend/.env")

keys: ## Generate the RS256 key pair for local runs into backend/secrets (never overwrites)
	@mkdir -p $(BACKEND)/secrets
	@test -f $(BACKEND)/secrets/jwt_private_key.pem || ( \
		openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $(BACKEND)/secrets/jwt_private_key.pem && \
		openssl rsa -in $(BACKEND)/secrets/jwt_private_key.pem -pubout -out $(BACKEND)/secrets/jwt_public_key.pem && \
		echo "generated backend/secrets/jwt_*.pem")

# --- local development -------------------------------------------------------------

run: ## API with reload on :8000 (needs `make dev` for PostGIS and Redis)
	$(UV) uvicorn app.main:create_app --factory --reload --port 8000

worker: ## Background worker (agents, job queue)
	$(UV) python -m app.worker

migrate: ## Apply migrations to the database from .env
	$(UV) alembic upgrade head

migration: ## New migration from model changes: make migration m="add facts"
	@test -n "$(m)" || (echo 'usage: make migration m="what changed"' && exit 1)
	$(UV) alembic revision --autogenerate -m "$(m)"

openapi: ## Export the OpenAPI schema for the frontend into frontend/openapi.json
	$(UV) python -m app.cli openapi > $(CURDIR)/frontend/openapi.json.tmp
	mv frontend/openapi.json.tmp frontend/openapi.json

# --- data and knowledge ------------------------------------------------------------

data: ## Rebuild data: pinned Geofabrik → regional cache → OSM, DEM, climate, demo, walk graph
	$(UV) --group pipeline python -m pipeline all

collect: ## Agents research every hotel in 6 processes (needs `make dev`; keeps the Mac awake)
	cd $(BACKEND) && awake=$$(command -v caffeinate >/dev/null && echo "caffeinate -i"); \
	for i in 0 1 2 3 4 5; do $$awake uv run python -m app.cli collect --shard $$i/6 & done; wait

export-seed: ## Dump collected knowledge and agent traces into backend/data/seed
	$(UV) python -m app.cli export-seed

eval: ## Quality metrics on the gold set (needs `make dev`)
	$(UV) python -m app.cli eval

LLM_MODELS ?=
LLM_EVAL_ARGS ?=
eval-llm: ## LLM vs rules per model, reports in backend/data/eval/llm (spends credits, cached): make eval-llm LLM_MODELS="a b"
	cd $(BACKEND) && if [ -z "$(strip $(LLM_MODELS))" ]; then \
		uv run python -m app.cli eval --llm $(LLM_EVAL_ARGS); \
	else \
		for m in $(LLM_MODELS); do \
			uv run python -m app.cli eval --llm --model $$m --strong-model $$m $(LLM_EVAL_ARGS) || exit $$?; \
		done; \
	fi
	$(MAKE) eval-compare

eval-compare: ## Table of the saved LLM runs: quality on dev and hold-out sets, latency, price
	$(UV) python -m app.cli eval-compare

SMOKE_URL ?= http://localhost:8080
smoke-llm: ## Live LLM acceptance on a disposable running stack (spends credits, changes demo data)
	$(UV) python -u tests/smoke_llm.py $(SMOKE_URL)

jury-secrets: ## Encrypt .env.jury for the organizers into secrets.env.age (needs `age`)
	@test -f .env.jury || (echo "create .env.jury with the jury LLM key first" && exit 1)
	age -r $(ORGANIZERS_AGE_KEY) -o secrets.env.age .env.jury
	@echo "secrets.env.age updated; commit it, never .env.jury"

# --- quality -----------------------------------------------------------------------

lint: ## Ruff lint and format check
	$(UV) ruff check .
	$(UV) ruff format --check .

fmt: ## Format and autofix
	$(UV) ruff format .
	$(UV) ruff check --fix .

typecheck: ## mypy --strict
	$(UV) mypy

arch: ## Architecture contracts (layers, pure domain, contexts)
	$(UV) lint-imports

test-unit: ## Unit tests only: no Docker needed
	$(UV) pytest tests/unit -q

test-deps: ## Start throwaway PostGIS and Redis for integration tests (kept running between runs)
	$(TEST_COMPOSE) up -d --wait

test: test-deps ## All backend tests (starts test containers if needed)
	$(UV) pytest -q

test-down: ## Stop and remove the test containers
	$(TEST_COMPOSE) down -v

check: lint typecheck arch test ## Every backend check: lint, types, architecture, tests

frontend-dev: ## TanStack Start with hot reload
	npm --prefix frontend run dev

frontend-check: ## Frontend lint, types, FSD architecture and build
	npm --prefix frontend run check

# --- full stack in docker ----------------------------------------------------------

up: env ## Build and start the whole stack: http://localhost:8080
	docker compose up -d --build

down: ## Stop the stack (data volumes are kept)
	docker compose down --remove-orphans

up-native: env ## The whole stack with native images (Apple Silicon): http://localhost:8080
	$(DEV_COMPOSE) up -d --build

dev: env ## PostGIS and Redis on localhost (5432, 6379) for `make run` and `make worker`
	$(DEV_COMPOSE) up -d --wait db redis

logs: ## Follow logs of the stack
	docker compose logs -f --tail=200
