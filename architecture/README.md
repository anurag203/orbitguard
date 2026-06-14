# OrbitGuard Architecture Documents

This folder contains one low-level design document per major OrbitGuard feature/service. Each LLD is both an implementation guide and a testing guide.

## How To Use

1. Read [../HLD.md](../HLD.md) for the system-level design.
2. Pick the next LLD from the build order in [../execution/ROUND1_BUILD_ORDER.md](../execution/ROUND1_BUILD_ORDER.md).
3. Read the matching context file in [../context/](../context/).
4. Implement only that module's documented scope.
5. Run the tests defined in the LLD.
6. Update the matching context file before stopping.

## LLD Index

| LLD | Module |
|---|---|
| 01 | Mission Console Frontend |
| 02 | FastAPI Backend |
| 03 | Catalog Data Service |
| 04 | Orbit Propagation Engine |
| 05 | Conjunction Screening Engine |
| 06 | Collision Probability Engine |
| 07 | Avoidance Maneuver Planner |
| 08 | Secondary Risk Screening |
| 09 | Scenario Engine |
| 10 | AI Briefing and Reporting |
| 11 | Demo Mode and Offline Replay |
| 12 | Testing, Deployment, and Observability |

## Standard Rule

Every implementation session must update the matching context file. If the session is interrupted, the next engineer should be able to resume from the context file without guessing.
