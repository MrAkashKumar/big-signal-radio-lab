# Coordinate the two computers

## Start from the same baseline

1. Clone this repository.
2. Read the build plan and architecture notes.
3. Complete Phase 0 as one coordinated bootstrap before splitting implementation work.
4. Record the tested bootstrap commit in the handoff.
5. Start Computer A on `engine` and Computer B on `experience` from that same commit.

The initial documentation commit is not the tested Phase 0 application baseline.

## Respect directory ownership

| Owner | Directories |
| --- | --- |
| Computer A | `packages/contracts`, `packages/units`, `packages/simulation`, `packages/propagation`, `validation` |
| Computer B | `apps/web`, `packages/ui`, `packages/visualization`, `packages/missions`, `content` |
| Coordinated | Root package and workspace configuration, TypeScript and Vite configuration, CI, README, docs, demo fixtures |

Use `main` for accepted baselines. Use `integration` for deliberate merge checkpoints. Do not continuously merge incomplete work from the other computer.

## Change a shared contract

1. Propose the exact change and document the reason.
2. Coordinate the change with the other computer.
3. Update deterministic mocks and fixtures.
4. Update engine tests.
5. Verify that the UI compiles against the proposed contract.
6. Merge the change during an agreed integration window.

Apply this procedure to `Scenario`, `SimulationResult`, `AntennaConfig`, and `PropagationPath`, plus any shared types they depend on.

## Verify integration checkpoints

1. Integrate units, FSPL, link budget, and noise with the main shell and VHF results. Changing 5 W to 50 W must add approximately 10 dB with no UI RF math.
2. Integrate terrain and limiting factors with WHY, MATH, and prediction. In the chosen ridge fixture, raising the antenna from 2 m to 15 m must help more than the 5 W to 50 W increase.
3. Integrate simplified HF geometry with the Earth scene. Increasing frequency above modeled MUF must stop the returning skywave path and explain the failure.

Before each merge, run contract checks, physics tests, the full test suite, and the web build. Record any failed or unavailable checks in the handoff.
