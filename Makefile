.PHONY: help setup-backend setup-frontend test-backend test-frontend test-e2e build-frontend run-backend run-frontend docker-build-backend docker-build docker-run-backend docker-run docker-stop release-check

help:
	@echo "OrbitGuard commands"
	@echo "  make setup-backend  Create .venv and install backend dev dependencies"
	@echo "  make setup-frontend Install frontend dependencies"
	@echo "  make test-backend   Run backend pytest suite"
	@echo "  make test-frontend  Run frontend tests"
	@echo "  make test-e2e       Run committed Playwright E2E suite against localhost:5173"
	@echo "  make build-frontend Build frontend production bundle"
	@echo "  make run-backend    Start FastAPI backend on localhost:8000"
	@echo "  make run-frontend   Start Vite frontend on localhost:5173"
	@echo "  make docker-build-backend  Build backend Docker image"
	@echo "  make docker-build          Build backend and frontend Docker images"
	@echo "  make docker-run-backend    Run backend through Docker Compose"
	@echo "  make docker-run            Run backend and frontend through Docker Compose"
	@echo "  make docker-stop           Stop Docker Compose services"
	@echo "  make release-check         Run the full local release gate"

setup-backend:
	python3 -m venv .venv
	.venv/bin/python -m pip install -r backend/requirements-dev.txt

setup-frontend:
	cd frontend && npm install

test-backend:
	PYTHONPATH=backend .venv/bin/pytest backend/tests -q

test-frontend:
	cd frontend && npm test

test-e2e:
	cd frontend && npm run test:e2e

build-frontend:
	cd frontend && npm run build

run-backend:
	.venv/bin/uvicorn app.main:app --app-dir backend --reload

run-frontend:
	cd frontend && npm run dev -- --port 5173

docker-build-backend:
	docker compose build backend

docker-build:
	docker compose build

docker-run-backend:
	docker compose up backend

docker-run:
	docker compose up

docker-stop:
	docker compose down

release-check:
	./scripts/release_check.sh
