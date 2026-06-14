#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

section() {
  printf '\n==> %s\n' "$1"
}

section "Backend tests"
make test-backend

section "Frontend tests"
make test-frontend

section "Frontend build"
make build-frontend

section "Frontend audit"
(cd frontend && npm audit --omit=dev && npm audit)

section "Direct backend demo replay"
PYTHONPATH=backend .venv/bin/python - <<'PY'
from app.services.demo_service import DemoService

service = DemoService()
status = service.status()
replay = service.replay()
assert status.status == "ready", status.model_dump()
assert replay.status == "passed", replay.model_dump()
print("demo status:", status.status)
print("demo replay:", replay.status)
PY

section "Docker Compose smoke"
docker compose up -d --build
python3 - <<'PY'
import json
import time
import urllib.request


def fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


last_error = None
for _ in range(30):
    try:
        status = fetch_json("http://localhost:5173/api/demo/status")
        replay_request = urllib.request.Request(
            "http://localhost:5173/api/demo/replay/protect-isro-round1",
            data=b"",
            method="POST",
        )
        with urllib.request.urlopen(replay_request, timeout=20) as response:
            replay = json.loads(response.read().decode("utf-8"))
        assert status["status"] == "ready", status
        assert replay["status"] == "passed", replay
        print("compose demo status:", status["status"])
        print("compose demo replay:", replay["status"])
        break
    except Exception as exc:  # noqa: BLE001 - release script should show final startup failure.
        last_error = exc
        time.sleep(1)
else:
    raise SystemExit(f"Docker Compose smoke failed: {last_error}")
PY

section "Playwright E2E"
(cd frontend && npm run test:e2e)

section "Release check passed"
printf 'OrbitGuard is ready locally at http://localhost:5173\n'
