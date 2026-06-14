# OrbitGuard Project Rules

Read this before modifying the project.

## Mandatory First Reads

1. `docs/ONBOARDING.md`
2. `docs/ENGINEERING_RULES.md`
3. `docs/FEATURE_CHANGE_PROCESS.md`
4. `context/CURRENT_STATE.md`
5. The LLD for the module you are changing in `architecture/`
6. The matching context file in `context/`

## Change Workflow

1. Identify the owning LLD.
2. Update the LLD first if the design, API, data model, algorithm, failure behavior, or tests are changing.
3. Implement the smallest scoped change.
4. Add or update tests in the same change.
5. Run the relevant test command.
6. Update the matching context file with files changed, commands run, tests run, blockers, and next step.
7. Update `context/CURRENT_STATE.md` if the active module or next recommended action changed.

## Design Change Rule

Design changes are not allowed to live only in code. If implementation changes the intended architecture, update:

- the relevant LLD in `architecture/`,
- `HLD.md` if system-level behavior changes,
- `METHODOLOGY.md` if science/risk claims change,
- `decisions/` if the choice is durable,
- the relevant context file.

## Testing Rule

No feature is complete until its documented tests pass or the context file records exactly why they could not be run.

## Demo Safety Rule

Do not make the Protect ISRO hero demo depend on live internet, secrets, paid APIs, or manual data setup.

## Science Honesty Rule

Do not present TLE-only estimates, simplified Pc, or demo maneuvers as operational spacecraft command authority.

## Docker Rule

Use Docker when it improves reproducibility, onboarding, or demo reliability. Do not force Docker into inner-loop work where the local command is faster and equivalent.
