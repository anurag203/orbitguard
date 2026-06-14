# TLE Snapshots Plan

## Purpose

Define how OrbitGuard will store public orbital element snapshots for reproducible demos.

## Snapshot Metadata

Every snapshot should record:

- source URL,
- fetch timestamp,
- group name,
- object count,
- parser version,
- notes about filtering.

## Planned Snapshot Groups

- active satellites,
- debris objects for demo scenarios,
- stations or recognizable objects,
- ISRO-related assets,
- historical scenario objects where available.

## Current Committed Fixture

- `data/catalogs/demo-protect-isro.json`
  - deterministic Round 1 offline fixture,
  - includes CARTOSAT-2F and a scenario debris object,
  - includes ISRO watchlist entries,
  - labeled as demo data, not a live operational warning.

## Validation

- TLE line format validation.
- object count check.
- duplicate NORAD ID check.
- parser smoke test.

## Demo Rule

The hero demo must run from committed snapshots and must not require live fetch.
