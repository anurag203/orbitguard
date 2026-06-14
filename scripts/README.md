# Scripts

Automation helpers for repeatable local verification and release readiness.

## Available Scripts

- `release_check.sh`: runs backend tests, frontend tests/build/audit, backend demo replay, and Docker Compose smoke checks.

Scripts should be deterministic, safe to run locally, and should not require live internet for the OrbitGuard demo path after dependencies are installed.
