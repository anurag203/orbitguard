# Offline Demo Data Plan

## Purpose

Ensure OrbitGuard can be shown without internet access.

## Required Local Data

- scenario manifests,
- protected object metadata,
- demo catalog subset,
- expected conjunction outputs,
- expected maneuver outputs,
- secondary screening outputs,
- report fixture examples,
- globe texture fallback if used.

## Readiness Checks

- all required files exist,
- scenario run returns expected IDs,
- frontend can load local assets,
- backend health passes,
- Protect ISRO flow completes.

## Failure Policy

If live refresh fails, the UI should continue with local snapshots and clearly label the data as a snapshot.
