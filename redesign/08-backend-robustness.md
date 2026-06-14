# 08 — Backend Robustness

> Owner: Agent E. Obeys docs 01–04 (the constitution). This doc covers **only** the
> `backend/` FastAPI service. It is a refactor plan — no behavior is removed, the science is
> unchanged, and **all 74 existing tests stay green at every phase**.
>
> Verified baseline (2026-06-14): `pytest` → **74 passed**; zero `logging` usage anywhere in
> `backend/` (confirmed by search); seven of eight route modules each construct their own service
> instances at import time.

---

## 1. Goals

The current backend *works* but reads like a single-scenario demo under the hood. The judges who
open the network tab or ask "does this work for the other scenarios?" must see a service that is:

1. **Robust** — every error path returns a typed, predictable response; no unhandled exception leaks
   a stack trace or an inconsistent body.
2. **Credible / honest** — when we fall back to a fixture or skip real SGP4, the response *says so*
   (doc 01 §7 "Be honest about the science"; doc 01 §7 anti-goal "No fake precision").
3. **Consistent** — one error envelope, one set of services, one ID convention across the request
   graph.
4. **Still deterministic + offline for Protect ISRO** — the hero demo (doc 01 §1, README §"Non-negotiable
   principles" #6) never breaks. Determinism is a feature, not an accident.
5. **General across scenarios** — Protect ISRO, 2009 Replay, and Kessler Sandbox all run
   plan → apply → report end-to-end (README §"What success looks like").
6. **NOT over-engineered** — this is a hackathon. No database, no auth, no message queue, no
   distributed tracing. See §13.

Non-goal: rewriting the orbital math. The engines (`propagation_engine`, `conjunction_engine`,
`collision_probability_engine`, `maneuver_planner_engine`, `secondary_risk_engine`) are sound and
stay as-is except for one narrowed `except` (§10).

---

## 2. Target architecture: one shared service graph via dependency injection

### 2.1 The problem (verified)

Each route module instantiates its **own** service tree at import time:

- `backend/app/api/routes/catalogs.py:16` → `service = CatalogService()`
- `backend/app/api/routes/conjunctions.py:9` → `service = ConjunctionService()`
- `backend/app/api/routes/maneuvers.py:9` → `service = ManeuverService()`
- `backend/app/api/routes/reports.py:9` → `service = ReportService()`
- `backend/app/api/routes/scenarios.py:9`, `propagation.py:9`, `demo.py:9` → same pattern.

Because each service constructor defaults its dependencies (e.g.
`ConjunctionService.__init__` at `backend/app/services/conjunction_service.py:127-137` builds a fresh
`CatalogService`, `PropagationService`, `ScenarioService`), the app ends up with **many independent
copies** of every service. Two concrete bugs result:

- **Live catalog cache is not shared.** `CatalogService._live_snapshots`
  (`backend/app/services/catalog_service.py:41`) is per-instance. A `POST /catalogs/live/refresh`
  populates the cache on the `catalogs.py` instance, but a later `GET /catalogs/full?source=live`
  served by a *different* `CatalogService` (the one inside `ConjunctionService`) sees an empty cache.
- **Report store is not shared.** `ReportService._reports`
  (`backend/app/services/report_service.py:26`) is per-instance. A report created through one path is
  invisible to another instance.

The constructors are *already* DI-ready (every service takes optional injected collaborators), so the
fix is purely about wiring a single graph.

### 2.2 The fix: a `ServiceContainer` built once in the lifespan, exposed via `Depends`

Add `backend/app/dependencies.py`:

```python
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request

from app.services.catalog_service import CatalogService
from app.services.conjunction_service import ConjunctionService
from app.services.demo_service import DemoService
from app.services.maneuver_service import ManeuverService
from app.services.propagation_service import PropagationService
from app.services.report_service import ReportService
from app.services.scenario_service import ScenarioService
from app.services.secondary_risk_service import SecondaryRiskService


@dataclass(frozen=True)
class ServiceContainer:
    """Single shared instance of every service for the app's lifetime."""

    catalog: CatalogService
    propagation: PropagationService
    scenario: ScenarioService
    conjunction: ConjunctionService
    secondary_risk: SecondaryRiskService
    maneuver: ManeuverService
    report: ReportService
    demo: DemoService


def build_container() -> ServiceContainer:
    # Build leaves first, then wire collaborators so every service shares the SAME
    # CatalogService (live cache), ConjunctionService (screening cache) and
    # ManeuverService (plan registry) / ReportService (report store).
    catalog = CatalogService()
    propagation = PropagationService(catalog_service=catalog)
    scenario = ScenarioService(catalog_service=catalog)
    conjunction = ConjunctionService(
        catalog_service=catalog,
        propagation_service=propagation,
        scenario_service=scenario,
    )
    secondary_risk = SecondaryRiskService()
    maneuver = ManeuverService(
        conjunction_service=conjunction,
        secondary_risk_service=secondary_risk,
    )
    report = ReportService(
        conjunction_service=conjunction,
        maneuver_service=maneuver,
        secondary_risk_service=secondary_risk,
    )
    demo = DemoService(
        scenario_service=scenario,
        conjunction_service=conjunction,
        maneuver_service=maneuver,
        report_service=report,
    )
    return ServiceContainer(
        catalog=catalog,
        propagation=propagation,
        scenario=scenario,
        conjunction=conjunction,
        secondary_risk=secondary_risk,
        maneuver=maneuver,
        report=report,
        demo=demo,
    )


def get_container(request: Request) -> ServiceContainer:
    return request.app.state.container


def get_catalog_service(request: Request) -> CatalogService:
    return get_container(request).catalog


def get_conjunction_service(request: Request) -> ConjunctionService:
    return get_container(request).conjunction


def get_maneuver_service(request: Request) -> ManeuverService:
    return get_container(request).maneuver


def get_report_service(request: Request) -> ReportService:
    return get_container(request).report


def get_scenario_service(request: Request) -> ScenarioService:
    return get_container(request).scenario


def get_propagation_service(request: Request) -> PropagationService:
    return get_container(request).propagation


def get_demo_service(request: Request) -> DemoService:
    return get_container(request).demo
```

Build it once in the app lifespan (`backend/app/main.py`, currently `create_app` at
`backend/app/main.py:12-30`):

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.logging_config import configure_logging
from app.dependencies import build_container


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(level=settings.log_level, json_logs=settings.json_logs)
    app.state.container = build_container()
    logging.getLogger("orbitguard").info(
        "startup.complete environment=%s version=%s", settings.environment, settings.version
    )
    yield
    logging.getLogger("orbitguard").info("shutdown.complete")


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.version, lifespan=lifespan, ...)
    ...
```

Routes drop their module-level singletons and take a `Depends` instead. Example — the whole of
`backend/app/api/routes/conjunctions.py` becomes:

```python
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_conjunction_service
from app.models.conjunction import ConjunctionDetail, ScreeningRequest, ScreeningResponse
from app.services.conjunction_service import ConjunctionService

router = APIRouter()


@router.post("/conjunctions/screen", response_model=ScreeningResponse)
def screen_conjunctions(
    request: ScreeningRequest,
    service: ConjunctionService = Depends(get_conjunction_service),
) -> ScreeningResponse:
    return service.screen(request)


@router.get("/conjunctions/{conjunction_id}", response_model=ConjunctionDetail)
def get_conjunction(
    conjunction_id: str,
    service: ConjunctionService = Depends(get_conjunction_service),
) -> ConjunctionDetail:
    return service.get_detail(conjunction_id)
```

The same one-line-per-route change applies to `catalogs.py`, `maneuvers.py`, `reports.py`,
`scenarios.py`, `propagation.py`, and `demo.py`.

### 2.3 Why this fixes the fragmented caches

With one `ServiceContainer`, there is exactly one `CatalogService` (so `_live_snapshots` at
`catalog_service.py:41` is shared by everyone) and exactly one `ReportService` (so `_reports` at
`report_service.py:26` is shared). It also gives ManeuverService a stable place to keep a **plan
registry** (§6) and ConjunctionService a **screening cache** (§8) that survive across requests for the
life of the process.

### 2.4 The one existing test that must be updated (still "green at each step")

`backend/tests/test_catalogs_conjunctions.py:68-82` reaches into the module global
`catalogs_route.service` to inject a failing CelesTrak fetcher. After DI there is no module global, so
this test is rewritten to patch the shared instance through the app (no behavior change):

```python
def test_live_catalog_refresh_endpoint_returns_live_or_fallback_contract(client, monkeypatch) -> None:
    def failing_fetcher(_url: str, _timeout: float) -> str:
        raise TimeoutError("offline in unit test")

    catalog = client.app.state.container.catalog
    catalog._live_snapshots.clear()
    monkeypatch.setattr(catalog, "_celestrak_fetcher", failing_fetcher)

    response = client.post("/api/catalogs/live/refresh", json={"group": "active", "limit": 5})
    assert response.json()["mode"] == "offline-fallback"
```

This is the only existing test that touches the wiring; all others go through the public HTTP API and
are unaffected.

---

## 3. Consistent error handling: one envelope for every failure

### 3.1 The problem (verified)

`backend/app/main.py:27-28` registers handlers for exactly two exception types:

```python
# backend/app/main.py:27-28
app.add_exception_handler(OrbitGuardError, orbitguard_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
```

`OrbitGuardError` (`backend/app/core/errors.py:32-36`) and validation errors
(`errors.py:39-49`) return the structured `{"error": {"code", "message", "details"}}` envelope. **Any
other exception** — a `KeyError`, an `IndexError`, a third-party library raising — bypasses these and
falls through to Starlette's default `500 {"detail": "Internal Server Error"}`. The frontend (doc 04)
parses `error.code`; a `detail`-shaped body is an inconsistent contract that breaks error handling and
leaks shape information.

### 3.2 The fix: a global `Exception` handler that reuses `ApiError`

Add to `backend/app/core/errors.py`:

```python
import logging

logger = logging.getLogger("orbitguard.errors")


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    # Log the REAL exception (with traceback) server-side; never leak it to the client.
    logger.exception(
        "unhandled_exception method=%s path=%s request_id=%s",
        request.method,
        request.url.path,
        request_id,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": ApiError(
                code="internal_error",
                message="An unexpected internal error occurred.",
                details={"request_id": request_id} if request_id else None,
            ).model_dump()
        },
    )
```

Register it in `main.py` alongside the existing two (keep both):

```python
app.add_exception_handler(OrbitGuardError, orbitguard_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)  # NEW: catch-all, same envelope
```

Now every response — 4xx, 422, and 500 — has the identical `{"error": {...}}` shape. The generic
message protects internals (codeguard logging rule: redact internals, log the real error server-side);
`request_id` lets a judge correlate the friendly error with the server log line.

> **Test note (see §11):** Starlette's `TestClient` re-raises server exceptions by default, so the
> 500-envelope test must use `TestClient(app, raise_server_exceptions=False)` (or trigger the handler
> through a dependency override that raises). Documented in the test section.

---

## 4. Structured logging & a request-id middleware

### 4.1 The problem (verified)

A repository-wide search for `logging`, `getLogger`, `logger.` in `backend/` returns **zero matches**.
There is no way to see what the service did during a demo, no record of CelesTrak fallbacks, no SGP4
warning counts, no audit of plan/apply/report. For a "credibility" beat (doc 01 §6) this is a gap.

### 4.2 Logging config (stdlib `logging`, JSON optional)

Add `backend/app/core/logging_config.py`:

```python
from __future__ import annotations

import json
import logging
import sys


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def configure_logging(level: str = "INFO", json_logs: bool = False) -> None:
    handler = logging.StreamHandler(sys.stdout)
    if json_logs:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )
    root = logging.getLogger("orbitguard")
    root.handlers = [handler]
    root.setLevel(level.upper())
    root.propagate = False
```

Plain text by default (easy to read live on stage); `ORBITGUARD_JSON_LOGS=true` flips to JSON for any
log-shipping. Sanitization: we log **IDs, counts, and status strings only** — never TLE payloads,
never raw exceptions to the client (codeguard logging rule).

### 4.3 Request-id middleware

Add `backend/app/core/middleware.py`:

```python
from __future__ import annotations

import logging
import time
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("orbitguard.request")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("x-request-id") or uuid4().hex
        request.state.request_id = request_id
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
        logger.info(
            "request method=%s path=%s status=%s ms=%s request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            request_id,
        )
        response.headers["x-request-id"] = request_id
        return response
```

Register in `create_app()` (before the router include). `request.state.request_id` is what the global
exception handler (§3) echoes back.

### 4.4 Service-boundary log lines (exact spots)

Add one `logger.info`/`logger.warning` at each boundary; representative example for
`ConjunctionService.screen` (around `backend/app/services/conjunction_service.py:185-199`):

```python
logger = logging.getLogger("orbitguard.conjunction")

# inside screen(), after computing `details`:
if not details and context.expected_top_conjunction_id:
    fixture = FINAL_ROUND_CONJUNCTION_FIXTURES.get(context.expected_top_conjunction_id)
    if fixture and fixture.risk.miss_distance_m <= request.coarse_threshold_m:
        details = [fixture]
        computation_mode = "fixture-fallback"
        logger.warning(
            "screen.fixture_fallback scenario=%s conjunction=%s reason=no_sgp4_candidate",
            context.scenario_id,
            context.expected_top_conjunction_id,
        )
logger.info(
    "screen.complete scenario=%s catalog=%s candidates=%s mode=%s",
    context.scenario_id, context.catalog_id, len(details), computation_mode,
)
```

The full set of boundary logs to add:

| Boundary | File:line anchor | Log |
|---|---|---|
| Fixture catalog/scenario load | `catalog_service.py:208-217`, `scenario_service.py:89-98` | count of fixtures loaded |
| CelesTrak fetch success | `catalog_service.py:71-86` | group, returned count |
| CelesTrak fallback | `catalog_service.py:87-104` | `warning`: exception type, group |
| SGP4 warnings | `propagation_engine.py:92-100` (per series) | object_id, warning count |
| Screening | `conjunction_service.py:185-199` | candidate count + `computation_mode` |
| Plan | `maneuver_service.py:27-51` | conjunction_id, plan_id, recommended? |
| Apply | `maneuver_service.py:53-80` | plan_id, candidate_id, secondary_status |
| Report | `report_service.py:31-60` | report_id, conjunction_id |
| Demo replay | `demo_service.py:68-110` | flow_id, pass/fail |

---

## 5. Environment-driven settings (`pydantic-settings`)

### 5.1 The problem (verified)

`backend/app/core/config.py:6-19` is a frozen `dataclass` with literal defaults and no env reading:

```python
# backend/app/core/config.py:6-19
@dataclass(frozen=True)
class Settings:
    app_name: str = "OrbitGuard API"
    version: str = "0.1.0"
    environment: str = "development"
    cors_origins: list[str] = field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )


settings = Settings()
```

CORS origins, environment, the project root (read ad-hoc via `os.getenv("ORBITGUARD_PROJECT_ROOT")`
at `backend/app/core/paths.py:8`), and the CelesTrak timeout (hardcoded `8.0` at
`catalog_service.py:71`) cannot be configured for a deployed/preview environment.

### 5.2 The fix: `BaseSettings`, same defaults

```python
from __future__ import annotations

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "OrbitGuard API"
    version: str = "0.1.0"
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "ORBITGUARD_ENVIRONMENT"),
    )
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"],
        validation_alias=AliasChoices("ORBITGUARD_CORS_ORIGINS", "CORS_ORIGINS"),
    )
    project_root: str | None = Field(
        default=None, validation_alias="ORBITGUARD_PROJECT_ROOT"
    )
    celestrak_timeout_s: float = Field(
        default=8.0, validation_alias="ORBITGUARD_CELESTRAK_TIMEOUT_S"
    )
    log_level: str = Field(default="INFO", validation_alias="ORBITGUARD_LOG_LEVEL")
    json_logs: bool = Field(default=False, validation_alias="ORBITGUARD_JSON_LOGS")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        # Accept "a,b,c" in addition to a JSON array, so ops can set a simple env string.
        if isinstance(value, str) and not value.strip().startswith("["):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


settings = Settings()
```

Defaults are **identical** to today, so behavior is unchanged with no env set (tests stay green).
`ORBITGUARD_PROJECT_ROOT` keeps the exact name already honored by `paths.py:8`. Then:

- `catalog_service.py:71` reads `settings.celestrak_timeout_s` instead of the literal `8.0`.
- `paths.py` may optionally consult `settings.project_root`, but to avoid an import cycle it can keep
  reading the env var directly — same single source of truth.

Add to `requirements.txt`: `pydantic-settings>=2.4,<3.0` (see §12).

---

## 6. De-hardcode the pipeline (the big one)

### 6.1 What is hardcoded (verified)

The plan step already works for all three scenarios (tests
`test_maneuver_plan_supports_2009_replay_fixture`, `..._kessler_sandbox_fixture` pass). The breakage is
**apply, report, and conjunction retrieval**:

- **Apply is pinned to Protect ISRO.** `backend/app/services/maneuver_service.py:53-68`:

```python
# backend/app/services/maneuver_service.py:53-68
    def apply(self, request: ManeuverApplyRequest) -> ManeuverApplyResponse:
        if request.plan_id != "maneuver-plan-protect-isro-001":
            raise OrbitGuardError(404, "plan_not_found", f"Maneuver plan '{request.plan_id}' was not found.")
        plan = self.plan(ManeuverPlanRequest(conjunction_id="conj-protect-isro-001"))
        if plan.recommendation is None:
            raise OrbitGuardError(
                409,
                "plan_has_no_recommendation",
                "Cannot apply a maneuver because the current plan has no safe recommendation.",
            )
        if request.candidate_id != "mnv-protect-isro-a":
            raise OrbitGuardError(
                422,
                "candidate_not_recommended",
                "Only the recommended Protect ISRO candidate is currently apply-ready.",
            )
```

- **Report id and title are pinned.** `report_service.py:51` → `report_id = "report-protect-isro-001"`,
  `report_service.py:104` → `title="Protect ISRO Maneuver Brief"`, `report_service.py:106` → headline
  literal "...for Protect ISRO." The lazy-create branch at `report_service.py:64-73` also hardcodes that
  id and Protect ISRO request fields.
- **Conjunction GET only knows three ids.** `conjunction_service.py:262-268`
  (`_request_for_known_conjunction`) is a literal map; everything else 404s.
- Supporting literal maps: `maneuver_service.py:82-88` (`_plan_id_for_conjunction`),
  `maneuver_planner_engine.py:291-297` (`_candidate_prefix`),
  `secondary_risk_service.py:76-82` (`_scenario_id_for_plan`),
  `conjunction_engine.py:170-176` (`_conjunction_id`).

### 6.2 The single ID convention that makes all of this data-driven

Every demo id already follows one pattern keyed by a **scenario slug** and a **sequence**:

| Scenario slug | conjunction_id | plan_id | candidate prefix | report_id |
|---|---|---|---|---|
| `protect-isro` | `conj-protect-isro-001` | `maneuver-plan-protect-isro-001` | `mnv-protect-isro` | `report-protect-isro-001` |
| `2009-replay` | `conj-2009-replay-001` | `maneuver-plan-2009-replay-001` | `mnv-2009-replay` | `report-2009-replay-001` |
| `kessler-sandbox` | `conj-kessler-sandbox-001` | `maneuver-plan-kessler-sandbox-001` | `mnv-kessler-sandbox` | `report-kessler-sandbox-001` |

Collapse the four scattered literal maps into one tiny helper (e.g. `app/core/ids.py`):

```python
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScenarioIds:
    slug: str   # e.g. "protect-isro"
    seq: str    # e.g. "001" ("" for dynamically screened conjunctions)

    @classmethod
    def from_conjunction_id(cls, conjunction_id: str) -> "ScenarioIds":
        body = conjunction_id.removeprefix("conj-")     # "protect-isro-001"
        head, _, tail = body.rpartition("-")
        if head and tail.isdigit():                     # demo ids end in -NNN
            return cls(slug=head, seq=tail)
        return cls(slug=body, seq="")                   # dynamic id: keep whole body

    @classmethod
    def from_plan_id(cls, plan_id: str) -> "ScenarioIds":
        return cls.from_conjunction_id("conj-" + plan_id.removeprefix("maneuver-plan-"))

    @property
    def conjunction_id(self) -> str:
        return f"conj-{self.slug}-{self.seq}" if self.seq else f"conj-{self.slug}"

    @property
    def plan_id(self) -> str:
        return f"maneuver-plan-{self.slug}-{self.seq}" if self.seq else f"maneuver-plan-{self.slug}"

    @property
    def candidate_prefix(self) -> str:
        return f"mnv-{self.slug}"

    @property
    def report_id(self) -> str:
        return f"report-{self.slug}-{self.seq}" if self.seq else f"report-{self.slug}"
```

This reproduces **exactly** the ids the current literal maps produce for the three demo scenarios
(so all existing tests stay green) while also working for any new scenario or dynamically screened
conjunction. `maneuver_planner_engine._candidate_prefix` (`:291-297`) and
`maneuver_service._plan_id_for_conjunction` (`:82-88`) become one-liners delegating to `ScenarioIds`;
the literal dicts are deleted.

### 6.3 Generalized `ManeuverService.apply`

Add a plan registry (works because §2 makes ManeuverService a singleton) and resolve the plan from the
plan_id instead of pinning Protect ISRO:

```python
class ManeuverService:
    def __init__(self, ...) -> None:
        ...
        self._plans: dict[str, tuple[str, ManeuverPlanResponse]] = {}  # plan_id -> (conjunction_id, plan)

    def plan(self, request: ManeuverPlanRequest) -> ManeuverPlanResponse:
        ...  # unchanged body
        response = ManeuverPlanResponse(plan_id=self._plan_id_for_conjunction(request.conjunction_id), ...)
        self._plans[response.plan_id] = (request.conjunction_id, response)
        logger.info("plan conjunction=%s plan=%s recommended=%s",
                    request.conjunction_id, response.plan_id, response.recommendation is not None)
        return response

    def apply(self, request: ManeuverApplyRequest) -> ManeuverApplyResponse:
        # 1) Resolve the plan: prefer a previously computed plan; otherwise rebuild
        #    deterministically from the plan_id (no Protect-ISRO literal).
        cached = self._plans.get(request.plan_id)
        if cached is not None:
            conjunction_id, plan = cached
        else:
            conjunction_id = ScenarioIds.from_plan_id(request.plan_id).conjunction_id
            plan = self.plan(ManeuverPlanRequest(conjunction_id=conjunction_id))
            if plan.plan_id != request.plan_id:
                raise OrbitGuardError(404, "plan_not_found",
                                      f"Maneuver plan '{request.plan_id}' was not found.")
        # 2) Same guards as today, but candidate is validated against the ACTUAL recommendation.
        if plan.recommendation is None:
            raise OrbitGuardError(409, "plan_has_no_recommendation",
                                  "Cannot apply a maneuver because the current plan has no safe recommendation.")
        if request.candidate_id != plan.recommendation.candidate_id:
            raise OrbitGuardError(422, "candidate_not_recommended",
                                  "The selected candidate is not the recommended maneuver for this plan.")
        secondary = self._secondary_risk_service.screen(plan, plan.recommendation)
        logger.info("apply plan=%s candidate=%s secondary=%s",
                    request.plan_id, request.candidate_id, secondary.status)
        return ManeuverApplyResponse(
            plan_id=request.plan_id,
            candidate_id=request.candidate_id,
            before=plan.before,
            after=plan.predicted_after,
            secondary_status=secondary.status,
            secondary_summary=secondary.summary,
            screened_object_count=secondary.screened_object_count,
            secondary=secondary,
        )
```

For Protect ISRO this is byte-for-byte equivalent (recommendation is `mnv-protect-isro-a`,
secondary fixture exists → status `clear`), so `test_apply_maneuver_returns_secondary_clear` stays
green. For 2009 Replay and Kessler the plan now resolves and applies; because there is **no secondary
fixture** for those scenarios, `SecondaryRiskEngine.classify(candidate, None)`
(`backend/app/engines/secondary_risk_engine.py:8-20`) returns `status="warning"` with an explicit
"could not find a candidate-specific fixture, so the maneuver is not marked clear" message. That is the
**honest** result (doc 01 §7) and is exactly what the new apply tests assert (§11).

> Optional polish (data-only, not source): add `data/secondary-screening/2009-replay.json` and
> `kessler-sandbox.json` mirroring the Protect ISRO fixture so those scenarios also report `clear`/an
> intended status. `SecondaryRiskService._scenario_id_for_plan` (`:76-82`) becomes
> `ScenarioIds.from_plan_id(plan_id).slug`, so any added fixture is picked up with no further code.

### 6.4 Generalized `ReportService`

Replace the literal report id/title/headline with data derived from the scenario manifest. Give
`ReportService` a `ScenarioService` collaborator (wired by the container) and add a lookup to
`ScenarioService`:

```python
# scenario_service.py
def find_by_top_conjunction(self, conjunction_id: str) -> ScenarioManifest | None:
    return next(
        (m for m in self._load_manifests().values() if m.top_conjunction_id == conjunction_id),
        None,
    )
```

```python
# report_service.create_report (replacing report_service.py:51-60)
manifest = self._scenario_service.find_by_top_conjunction(request.conjunction_id)
scenario_title = manifest.title if manifest else conjunction.primary_object_id
report_id = ScenarioIds.from_conjunction_id(request.conjunction_id).report_id
self._reports[report_id] = self._build_report(
    report_id=report_id,
    request=request,
    plan=plan,
    candidate=plan.recommendation,
    secondary=secondary,
    tca_utc=conjunction.tca_utc,
    scenario_title=scenario_title,   # NEW
)
return ReportCreateResponse(report_id=report_id, status="created")
```

```python
# _build_report: title/headline derived from the scenario (replacing report_service.py:104,106)
title=f"{scenario_title} Maneuver Brief",
briefing=BriefingOutput(
    headline=f"OrbitGuard recommends a low-delta-v avoidance maneuver for {scenario_title}.",
    ...
)
```

Because `data/scenarios/protect-isro.json` has `"title": "Protect ISRO"`, this yields the unchanged
`"Protect ISRO Maneuver Brief"` and the unchanged headline for the hero scenario — so
`test_report_generation_and_retrieval`, `test_report_is_grounded_in_current_maneuver_outputs`, and
`test_report_includes_secondary_status_and_assumptions` all stay green. 2009 Replay yields
`"2009 Iridium-Cosmos Replay Maneuver Brief"`, Kessler yields `"Kessler Sandbox Maneuver Brief"` — all
derived, zero literals.

The lazy-create branch (`report_service.py:62-76`) generalizes: keep returning the stored report if
present; if absent, look up the scenario by `report_id` slug and lazily build it, instead of the
Protect-ISRO-only path. Since `report_id` is deterministic (`report-protect-isro-001` still resolves),
existing behavior is preserved.

### 6.5 Models that gain fields

- `ScreeningResponse` (`models/conjunction.py:29-32`) gains `computation_mode` — see §7.
- No new fields are strictly required for apply/report; generalization is achieved via the derived ids
  and the scenario lookup. (`ScenarioManifest.expected_outcome` already exists at
  `models/scenario.py:33-38` and is the data-driven source of truth for the demo's expected
  plan/candidate/secondary status.)

---

## 7. Make computed-vs-fixture explicit

### 7.1 The problem (verified)

When SGP4 screening finds nothing, `conjunction_service.py:185-188` silently injects a committed
fixture conjunction:

```python
# backend/app/services/conjunction_service.py:185-189
        if not details and context.expected_top_conjunction_id:
            fixture = FINAL_ROUND_CONJUNCTION_FIXTURES.get(context.expected_top_conjunction_id)
            if fixture and fixture.risk.miss_distance_m <= request.coarse_threshold_m:
                details = [fixture]
        details = details[: request.max_results]
```

The response (`ScreeningResponse`, `mode="sgp4-protagonist-vs-catalog"`) gives the caller no way to
know the result came from a fixture rather than live propagation. This is exactly the "no fake
precision" anti-goal (doc 01 §7).

### 7.2 The fix: a `computation_mode` flag

Add to `models/conjunction.py`:

```python
from typing import Literal

class ScreeningResponse(BaseModel):
    mode: str
    computation_mode: Literal["sgp4", "fixture-fallback"] = "sgp4"
    conjunctions: list[ConjunctionSummary]
    warnings: list[str] = Field(default_factory=list)
```

In `ConjunctionService.screen`, set `computation_mode = "fixture-fallback"` in the branch above (and
log it, §4.4); otherwise leave it `"sgp4"`. Default `"sgp4"` keeps the field backward-compatible and
leaves every existing screening test untouched. The frontend (doc 01 §5, the "Show details" /
assumptions surface) can render a small "demo geometry" badge when `computation_mode == "fixture-fallback"`.

---

## 8. Dynamic conjunction retrieval

### 8.1 The problem (verified)

`GET /conjunctions/{id}` (`conjunction_service.get_detail`, `:201-245`) can only retrieve ids that
`_request_for_known_conjunction` (`:262-268`) knows — the three demo ids. A conjunction produced by a
user-supplied catalog/protected object during `screen()` cannot be fetched afterward (404), even though
it was just computed.

### 8.2 The fix: cache the last screening's full details in the shared service

`screen()` already computes full `ConjunctionDetail` objects (it then discards them, keeping only
summaries via `summary_from_detail`). Have it stash them in the (now-singleton, §2) service:

```python
class ConjunctionService:
    def __init__(self, ...) -> None:
        ...
        self._screened_details: dict[str, ConjunctionDetail] = {}

    def screen(self, request: ScreeningRequest) -> ScreeningResponse:
        ...
        details = details[: request.max_results]
        # Cache by id so GET /conjunctions/{id} works for ANY screened conjunction.
        self._screened_details.update({d.conjunction_id: d for d in details})
        ...

    def get_detail(self, conjunction_id: str) -> ConjunctionDetail:
        cached = self._screened_details.get(conjunction_id)
        if cached is not None:
            return cached
        request = self._request_for_known_conjunction(conjunction_id)
        if request is not None:
            ...  # existing re-screen path (kept for known demo ids / cold start)
        fixture = FINAL_ROUND_CONJUNCTION_FIXTURES.get(conjunction_id)
        if fixture is not None:
            return fixture
        raise OrbitGuardError(404, "conjunction_not_found", f"Conjunction '{conjunction_id}' was not found.")
```

Lookup order: **cache → known-scenario re-screen → committed fixture → 404**. The known-scenario and
fixture paths remain so the three demo ids resolve even on a cold start (no prior `screen()` call in the
process), which keeps `test_conjunction_detail_contains_assumptions` and
`test_final_round_fixture_detail_contains_warning_context` green. The cache is bounded by catalog size
(tens of objects) — fine for a hackathon; an optional `maxlen`/LRU is noted but not built (§13).

---

## 9. Readiness: split liveness (`/health`) from readiness (`/ready`)

### 9.1 The problem (verified)

`backend/app/api/routes/health.py:11-18` always returns `status="ok"` regardless of whether the
fixture data the demo depends on is actually present. There is no probe that answers "can this process
actually run the demo right now?"

### 9.2 The fix: keep `/health` as liveness, add `/ready`

`/health` is unchanged (so `test_health_returns_ok` stays green). Add `/ready`, backed by the existing
`DemoService.status()` which already checks the required fixture files
(`backend/app/services/demo_service.py:38-60`):

```python
from fastapi import APIRouter, Depends, Response

from app.dependencies import get_demo_service
from app.models.common import HealthResponse
from app.models.demo import DemoStatusResponse
from app.services.demo_service import DemoService

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    # Liveness: the process is up. Cheap, no dependency checks.
    return HealthResponse(status="ok", service="orbitguard-backend",
                          version=settings.version, environment=settings.environment)


@router.get("/ready", response_model=DemoStatusResponse)
def ready(response: Response, demo: DemoService = Depends(get_demo_service)) -> DemoStatusResponse:
    # Readiness: are the offline demo fixtures present? Reuses existing DemoService checks.
    status = demo.status()
    if status.status != "ready":
        response.status_code = 503
    return status
```

`/ready` returns `200` with the full check list when fixtures are present, `503` (same
`DemoStatusResponse` body) when something required is missing — so a load balancer / the frontend can
distinguish "process alive" from "demo actually runnable".

---

## 10. Narrow exceptions, remove dead code, P1/P2 cleanups

- **Narrow the broad `except`.** `propagation_engine.py:51-67` catches bare `Exception` around
  `Satrec.twoline2rv`:

```python
# backend/app/engines/propagation_engine.py:51-53
        try:
            satrec = self._satrec_from_tle(obj.tle)
        except Exception as exc:
```

  `twoline2rv` raises `ValueError` for malformed TLEs. Narrow to `except (ValueError, IndexError) as
  exc:` and add a `logger.warning("invalid_tle object=%s", obj.object_id)`. This keeps the graceful
  "invalid-tle" series result but stops swallowing genuinely unexpected errors (which now surface to
  the §3 global handler and get logged).

- **Delete confirmed dead code** (defined, never referenced — verified by search):
  - `PROTECT_ISRO_RISK` constant, `conjunction_service.py:17-22`.
  - `ConjunctionEngine.classify_severity`, `conjunction_engine.py:124-131`.
  - `ConjunctionEngine.status_for_severity`, `conjunction_engine.py:133-139`.
  - `CatalogService.load_scenario_fixture`, `catalog_service.py:191-194` (no caller; scenario catalogs
    load via `load_catalog`).

- **CelesTrak fetch timestamp determinism** (P1). `catalog_service.py:370` uses
  `datetime.now(UTC)` for the live snapshot's `fetched_at_utc`. For a *live* fetch this is correct, but
  it makes tests non-deterministic. Inject a clock: `clock: Callable[[], datetime] = datetime.now` on
  `CatalogService.__init__`, default unchanged; tests can pin it. Offline/fixture mode is already
  deterministic, so the hero demo is unaffected.

- **Consistency pass:** the four id-helpers replaced by `ScenarioIds` (§6.2) remove the last literal
  scenario maps from the engines/services.

---

## 11. Tests to add (pytest) — and keep all 74 green

New tests (each is additive; none change the existing 74):

1. **Global 500 envelope.** Register a throwaway route or a dependency override that raises, with a
   client built to not re-raise, and assert the structured body:

```python
def test_unhandled_exception_returns_structured_500() -> None:
    app = create_app()

    @app.get("/api/_boom")
    def _boom():
        raise RuntimeError("kaboom")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/api/_boom")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert "kaboom" not in response.text  # real error is logged, never leaked
```

2. **`/ready` happy + sad path.** `GET /api/ready` → `200`, `status == "ready"` on the real tree;
   with a `DemoService(root=tmp_path)` override → `503`, `missing_required_count > 0`.

3. **Generalized apply — 2009 Replay.** `POST /api/maneuvers/apply` with
   `maneuver-plan-2009-replay-001` / `mnv-2009-replay-a` → `200`, valid `ManeuverApplyResponse`,
   `secondary_status` present (assert `in {"clear", "warning"}` so it passes whether or not a 2009
   secondary fixture is added).

4. **Generalized apply — Kessler.** Same with `maneuver-plan-kessler-sandbox-001` /
   `mnv-kessler-sandbox-a` → `200`, `after.miss_distance_m > before.miss_distance_m`.

5. **Generalized apply — wrong candidate.** Apply a valid plan_id with a bogus candidate →
   `422 candidate_not_recommended`. Unknown plan_id → `404 plan_not_found`.

6. **Generalized report — 2009 + Kessler.** `POST /api/reports` for each → `200`; `GET` the returned
   id → `200`; assert `report_id` is the derived `report-2009-replay-001` / `report-kessler-sandbox-001`
   and the title contains the scenario title ("2009 Iridium-Cosmos Replay" / "Kessler Sandbox").

7. **Dynamic conjunction GET.** `POST /api/conjunctions/screen` for a scenario, take a returned
   `conjunction_id`, then `GET /api/conjunctions/{that_id}` → `200` with full detail (proves the §8
   cache).

8. **`computation_mode` flag.** Screen a scenario whose SGP4 result is empty so the fixture fallback
   fires → assert `computation_mode == "fixture-fallback"`; a normal SGP4 screening →
   `computation_mode == "sgp4"`.

9. **Logging smoke.** Using pytest `caplog`, assert an apply/screen call emits an
   `orbitguard.*` INFO record (so the boundary logging can't silently regress).

One existing test is **rewritten, not removed**: the CelesTrak fallback test
(`test_catalogs_conjunctions.py:68-82`) patches the container's catalog service instead of a module
global (§2.4). Final state: **74 existing (74th adjusted) + ~9 new, all green.**

---

## 12. Dependencies & phased rollout

### 12.1 Dependency / config changes

- `backend/requirements.txt`: add `pydantic-settings>=2.4,<3.0` (the only new runtime dep). Current
  file (`requirements.txt:1-4`) keeps fastapi/uvicorn/pydantic/sgp4 unchanged.
- `backend/requirements-dev.txt`: no change (pytest + httpx already present).
- No `pyproject.toml` exists in `backend/` (confirmed) — `requirements*.txt` remain the manifest; no
  new config file is required beyond an optional `.env` read by `pydantic-settings`.

### 12.2 Phased rollout (green at every step)

| Phase | Change | Risk | Gate |
|---|---|---|---|
| 0 | Add `logging_config`, `middleware`, global `Exception` handler; configure logging in `create_app`. No service logic touched. | very low | 74 green + new 500 test |
| 1 | Migrate `config.py` to `pydantic-settings` (identical defaults); wire `celestrak_timeout_s`. | low | 74 green |
| 2 | Introduce `dependencies.py` + lifespan container; convert routes to `Depends`; rewrite the one CelesTrak test. | medium | 74 green |
| 3 | Add `ScenarioIds`; replace the four literal id maps; delete dead code; narrow the `except`. | low | 74 green |
| 4 | Generalize `ManeuverService.apply` + plan registry. | medium | 74 green + apply tests (2009/Kessler) |
| 5 | Generalize `ReportService` (scenario-derived title/id) + `ScenarioService.find_by_top_conjunction`. | medium | 74 green + report tests |
| 6 | `computation_mode` flag; ConjunctionService screening cache + dynamic GET; `/ready` probe. | low | 74 green + flag/GET/ready tests |

Each phase is independently shippable and reviewable; the demo replay
(`DemoService.replay`, `:68-110`) is exercised after each phase as the end-to-end guard for Protect ISRO.

---

## 13. Explicit "do NOT do" (anti-over-engineering)

This is a hackathon backend. To stay focused and avoid the "demo hack under questioning" trap *without*
swinging into enterprise gold-plating, we will **not**:

- ❌ **No database.** In-memory dicts on the shared singletons (report store, plan registry, screening
  cache) are sufficient for the demo lifetime. No SQLite/Postgres/ORM/migrations.
- ❌ **No auth / sessions / users.** No login, no API keys, no JWT. The service is a local, offline
  demo backend; adding auth contradicts the offline-deterministic hero requirement and adds zero judge
  value.
- ❌ **No full CDM / covariance propagation.** Keep the documented 2D-Gaussian Pc surrogate and the
  along-track lead-time maneuver surrogate. We make the *assumptions explicit* (doc 01 §7) rather than
  faking operational fidelity.
- ❌ **No message queue / Celery / background workers / websockets.** All endpoints are synchronous and
  fast; screening is bounded by `MAX_TIME_GRID_SAMPLES` (`propagation_service.py:14`).
- ❌ **No microservices, no service mesh, no container orchestration, no distributed tracing.** One
  process, one `uvicorn`.
- ❌ **No premature cache eviction machinery.** The screening/report caches are small and process-bound;
  an LRU cap is noted as a one-liner if needed, not built now.
- ❌ **No structured-config framework beyond `pydantic-settings`**, no secrets manager (there are no
  secrets), no metrics/Prometheus endpoint. Stdlib `logging` to stdout is enough.

The bar is: **a new engineer ships a change in under an hour** (README §"What success looks like"), and
a judge inspecting the network tab or asking "does 2009 work too?" sees a clean, consistent, honest API.
