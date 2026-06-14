# OrbitGuard Onboarding

## What OrbitGuard Is

OrbitGuard is an autonomous collision-avoidance copilot for space-traffic safety. The project demonstrates an end-to-end mission workflow: ingest orbital data, visualize objects, screen conjunctions, estimate risk, recommend an avoidance maneuver, re-screen the adjusted path, and explain the decision.

## What Makes It Win

- It is not only a monitoring dashboard.
- It recommends a maneuver.
- It checks whether that maneuver creates new danger.
- It explains the decision with an audit trail.
- It has deterministic demo scenarios, especially Protect ISRO.

## Architecture In One Breath

React + TypeScript renders the mission console. FastAPI + Python owns APIs, data loading, scenario orchestration, and orbital computation modules. Deterministic fixtures make the demo work offline.

## Current Implementation Philosophy

The repository uses logical services, not deployed microservices. Keep one backend and one frontend until splitting is technically necessary. Modules should still have clean boundaries, tests, and LLDs.

## Before You Modify Anything

- Read `context/CURRENT_STATE.md`.
- Read the LLD for the module you are touching.
- Read that module's context file.
- Add or update tests with the feature.
- Update context before stopping.

## Demo Priority

Protect ISRO is the hero demo. Any implementation choice that threatens the reliability of that flow should be treated as high risk.
