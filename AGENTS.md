# BIGSIGNAL agent instructions

Read [the build plan](docs/BUILD_PLAN.md), [the collaboration guide](CONTRIBUTING.md), and [the contract notes](docs/ARCHITECTURE.md) before implementation.

This repository was initialized by Computer A. A machine's assigned role comes from its user instruction. Do not assume every agent cloning this repository is Computer A.

## Ownership

- Computer A owns `packages/contracts`, `packages/units`, `packages/simulation`, `packages/propagation`, and `validation`.
- Computer B owns `apps/web`, `packages/ui`, `packages/visualization`, `packages/missions`, and `content`.
- Root configuration, CI, README, shared documentation, and demo fixtures require coordination after the initial bootstrap.
- Use root `validation/` as the canonical validation directory. The source plan also mentions `packages/validation`; do not create a duplicate.

## Implementation rules

- Computer A exposes `simulateScenario(scenario: Scenario): SimulationResult` as the authoritative RF entry point.
- Keep RF calculations out of React, visualization code, and teaching agents.
- Agree on complete version 1 contracts and deterministic mocks before parallel feature implementation.
- Follow the contract change procedure in CONTRIBUTING.md.
- Keep educational copy in `content/explanations`. Return explanation keys from the engine.
- Bundle demo inputs and assets locally. Mark educational approximations and expose calculation assumptions.
- Run proportionate tests and the build before publishing implementation changes. Do not report planned checks as passing.
- Work on `engine` for Computer A and `experience` for Computer B. Integrate at deliberate checkpoints.
