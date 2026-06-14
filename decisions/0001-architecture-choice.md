# ADR 0001: React Frontend and FastAPI Backend

## Status

Accepted.

## Context

OrbitGuard needs a polished mission-control UI and credible orbital computation. A browser-only build would reduce deployment complexity, but the user wants a large, serious final-round project that can grow beyond the Round 1 demo.

## Decision

Use:

- React + TypeScript for the frontend.
- FastAPI + Python for the backend.
- Python orbital/math modules inside one backend process for the first implementation.
- Logical services documented separately, but not deployed as separate microservices initially.

## Consequences

- The project looks and behaves like a serious engineering system.
- Python can use mature orbital and scientific libraries.
- The demo has more moving parts than a static-only app, so offline fixtures and Docker Compose become important.
- The architecture can later split into separate services if needed, but does not start there.
