.PHONY: help install dev up down clean migrate logs backend worker frontend format lint setup-env wait-db check-tools docker-up docker-down docker-build docker-logs docker-migrate

CYAN := \033[36m
RESET := \033[0m

COMPOSE_FILES := -f compose.yaml -f compose.dev.yaml

help: ## Show this help message
	@echo "Artha AI Platform - Make Commands"
	@echo "---------------------------------"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'

setup-env: ## Copy .env.example to .env if it doesn't exist
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env 2>/dev/null || touch .env; \
	fi
	@cp .env backend/.env 2>/dev/null || true
	@cp .env frontend/.env 2>/dev/null || true

check-tools: ## Check if required tools (uv, bun) are installed
	@command -v uv >/dev/null 2>&1 || { echo >&2 "uv is required but it's not installed. Aborting."; exit 1; }
	@command -v bun >/dev/null 2>&1 || { echo >&2 "bun is required but it's not installed. Aborting."; exit 1; }

install: check-tools setup-env ## Install frontend and backend dependencies
	@echo "Installing backend dependencies..."
	cd backend && uv sync
	@echo "Installing frontend dependencies..."
	cd frontend && bun install

up: setup-env ## Start Docker infrastructure (Postgres, Redis, Langfuse, Minio, Qdrant)
	docker compose $(COMPOSE_FILES) up -d postgres redis langfuse-db langfuse minio qdrant

wait-db: up ## Wait for PostgreSQL to become healthy
	@echo "Waiting for PostgreSQL to be healthy..."
	@until docker inspect --format='{{.State.Health.Status}}' $$(docker compose $(COMPOSE_FILES) ps -q postgres 2>/dev/null) 2>/dev/null | grep -q healthy; do \
		echo -n "."; \
		sleep 2; \
	done
	@echo "\nPostgreSQL is healthy!"

migrate: wait-db ## Run backend database migrations
	@echo "Running migrations..."
	cd backend && uv run alembic upgrade head

down: ## Stop Docker infrastructure
	docker compose $(COMPOSE_FILES) down

clean: down ## Stop infrastructure and wipe data/node_modules/venvs
	docker compose $(COMPOSE_FILES) down -v
	rm -rf frontend/node_modules
	rm -rf backend/.venv

kill-dev: ## Forcefully kill dangling backend, celery, and frontend processes
	@echo "Killing dangling dev processes..."
	@pkill -f "uvicorn app.main:app" || true
	@pkill -f "celery -A app.utils.celery_app" || true
	@pkill -f "next dev" || true
	@pkill -f "bun run dev" || true
	@echo "Dangling processes killed."

logs: ## Tail docker logs
	docker compose $(COMPOSE_FILES) logs -f

backend: ## Run backend server
	cd backend && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

worker: ## Run background worker
	cd backend && uv run celery -A app.utils.celery_app worker --loglevel=info

frontend: ## Run frontend dev server
	cd frontend && bun run dev

format: ## Format codebase
	cd backend && uv run ruff format src/
	cd frontend && bun run prettier --write .

lint: ## Lint codebase
	cd backend && uv run ruff check src/
	cd frontend && bun run lint

dev: install migrate ## Run all local services concurrently (Frontend, Backend, Worker)
	@echo "Starting Artha AI Platform locally..."
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  Langfuse: http://localhost:3001"
	@echo "Press Ctrl+C to stop."
	$(MAKE) -j3 backend worker frontend

docker-build: ## Build Docker images without cache
	docker compose build --no-cache api worker frontend

docker-up: docker-build ## Build and start ALL services in Docker
	docker compose up -d
	@echo ""
	@echo "Artha running in Docker:"
	@echo "  App (nginx gateway): http://localhost:8080"
	@echo "  Backend API:         http://localhost:8000"
	@echo "  Langfuse:            http://localhost:3001"
	@echo ""
	@echo "Pull models inside the container:"
	@echo "  docker compose exec ollama ollama pull qwen2.5:7b"
	@echo "  docker compose exec ollama ollama pull bge-m3"
	@echo ""
	@echo "Run migrations:"
	@echo "  make docker-migrate"

docker-migrate: ## Run DB migrations inside the api container
	@echo "Running migrations..."
	docker compose exec api alembic upgrade head

docker-down: ## Stop all Docker services
	docker compose down

docker-logs: ## Tail logs from all Docker services
	docker compose logs -f
