# Engineering Rules

## Documentation Rules

- Every major feature must map to an LLD in `architecture/`.
- Every LLD must have a matching context file in `context/`.
- Update context before stopping work.
- Durable architecture choices go into `decisions/` as ADRs.
- Public claims about science must be reflected in `METHODOLOGY.md`.

## Code Rules

- Keep routers thin; domain logic belongs in services/engines.
- Keep API request and response shapes typed.
- Prefer deterministic fixtures for demo-critical flows.
- Do not add hidden network dependencies to the Protect ISRO demo.
- Do not mix frontend UI state with backend science logic.
- Keep units explicit in model names, field descriptions, or docs.

## Testing Rules

- New backend behavior requires pytest coverage.
- New frontend behavior requires component or E2E coverage once the frontend exists.
- Scenario outputs that power the demo require deterministic tests.
- A feature is not demo-ready until its LLD demo acceptance criteria pass.

## Safety And Honesty Rules

- Do not present TLE-only risk estimates as operational-grade precision.
- Do not hide covariance assumptions.
- Do not let AI briefings invent metrics.
- Do not call simulated/injected events "live" events.

## Repository Hygiene

- Keep generated caches, virtualenvs, and build artifacts untracked.
- Do not commit secrets or API tokens.
- Keep root-level files intentional; use folders for grouped material.

## Docker Rules

- Use Docker for onboarding, demo reproducibility, and clean service startup checks.
- Do not require Docker for every inner-loop unit test when `make test-backend` is faster and equivalent.
- If Docker cannot run because the local daemon is down, record that in the relevant context file instead of treating source implementation as failed.
