# Contributing To OrbitGuard

Before changing code, read:

- [RULES.md](RULES.md)
- [docs/README.md](docs/README.md)
- [docs/ENGINEERING_RULES.md](docs/ENGINEERING_RULES.md)
- [docs/FEATURE_CHANGE_PROCESS.md](docs/FEATURE_CHANGE_PROCESS.md)
- [context/CURRENT_STATE.md](context/CURRENT_STATE.md)

## Required Flow

1. Identify the owning LLD in `architecture/`.
2. Read the matching context file in `context/`.
3. Keep changes scoped to that module unless the LLD says otherwise.
4. Add or update tests.
5. Run the relevant test command.
6. Update context before stopping.

## Backend Commands

```bash
make setup-backend
make test-backend
make run-backend
```

## Non-Negotiables

- Do not make demo-critical flows depend on live internet.
- Do not present estimated orbital risk as operational-grade certainty.
- Do not add a major feature without updating the LLD and context.
- Do not leave an interrupted module without a clear next step in its context file.
