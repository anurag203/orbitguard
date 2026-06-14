# Scenario Fixtures

This folder contains deterministic scenario manifests for OrbitGuard.

## Current Scenarios

- `protect-isro.json`: Round 1 hero flow.
- `2009-replay.json`: historical Iridium-Cosmos teaching flow.
- `kessler-sandbox.json`: debris-growth education flow.

## Rules

- Scenario events must be deterministic.
- Simulated or injected events must be labeled clearly.
- Scenario IDs and expected output IDs must remain stable because reports and demo replay depend on them.
