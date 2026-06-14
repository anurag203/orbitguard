# Feature Change Process

Use this process for every meaningful feature addition or modification.

## 1. Locate The Owner Module

Find the closest LLD in `architecture/`. If no LLD owns the change, create or update one before coding.

## 2. Read Context

Open:

- `context/CURRENT_STATE.md`
- the matching module context file
- any relevant ADRs in `decisions/`

## 3. Define Scope

Update the LLD when the change affects:

- responsibilities,
- APIs,
- data models,
- algorithms,
- error handling,
- testing,
- demo behavior.

## 4. Implement Narrowly

Change the smallest module set that satisfies the feature. Avoid unrelated refactors during deadline work.

## 5. Test

Run the tests defined in the LLD. If a test cannot be run, record why in the context file.

## 6. Update Context

Before stopping, update:

- completed work,
- files changed,
- commands run,
- tests run,
- blockers,
- next step.

## 7. Preserve Demo Reliability

If a change can affect Protect ISRO, run the demo acceptance path or mark it as a blocker.
