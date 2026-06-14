# OrbitGuard Engineering Guide

This is the first folder a new senior engineer should read.

## Fast Path

0. Read [../RULES.md](../RULES.md) for mandatory project rules.
1. Read [ONBOARDING.md](ONBOARDING.md) to understand the project in 15 minutes.
2. Read [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) to know where things live.
3. Read [ENGINEERING_RULES.md](ENGINEERING_RULES.md) before changing code.
4. Read [FEATURE_CHANGE_PROCESS.md](FEATURE_CHANGE_PROCESS.md) before adding a new feature.
5. Read the relevant LLD in [../architecture/](../architecture/) and context file in [../context/](../context/).

## Source Of Truth

- Product intent: [../ORBITGUARD_REQUIREMENTS.md](../ORBITGUARD_REQUIREMENTS.md)
- High-level design: [../HLD.md](../HLD.md)
- Low-level designs: [../architecture/](../architecture/)
- Current work state: [../context/CURRENT_STATE.md](../context/CURRENT_STATE.md)
- Build order: [../execution/ROUND1_BUILD_ORDER.md](../execution/ROUND1_BUILD_ORDER.md)

## Rule

No significant feature change should be implemented without updating the matching LLD, tests, and context file.
