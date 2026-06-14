# OrbitGuard Context System

This folder keeps the project resumable. Every major feature/service has one context file that tracks implementation status, commands run, tests run, blockers, and next steps.

## Required Workflow

1. Before implementing a module, read `CURRENT_STATE.md`.
2. Read the matching LLD in `../architecture/`.
3. Read the matching context file in this folder.
4. Implement only the planned scope.
5. Run the tests defined by the LLD.
6. Update the context file and `CURRENT_STATE.md` before stopping.

## Status Values

- Not started
- In progress
- Blocked
- Implemented
- Tested
- Demo-ready

## Rule

If work stops mid-module, the `Current Working Point` and `Next Step` sections must be specific enough that another engineer can resume without rereading the whole conversation.
