# Computer B handoff

Start from the bootstrap commit on `engine` or the associated bootstrap pull request. `main` initially contains only documentation. Read the PR status before selecting the baseline.

Run `bun install --frozen-lockfile`, then `bun run dev`. The web starter is in `apps/web/src/main.tsx`. Replace that starter with the experience described in the build plan.

Import `Scenario` and `SimulationResult` from `packages/contracts/index.ts`. Import `mockSimulation` from `packages/contracts/mockSimulation.ts` and `exampleScenario` from `packages/contracts/exampleScenario.ts`.

The mock returns fresh, fixed results and explicitly warns that they are mocked. Do not treat its terrain loss as validated physics.

Review the draft environment and time fields with Computer A before freezing the contract. The engine's full `simulateScenario` entry point is not implemented yet. UI work can proceed against the mock.

The units and simulation primitive tests are in their respective package `src` directories. Three.js, React Three Fiber, and Zustand are installed for the experience work, but the starter does not use them yet.

## Confirmed visual direction

The user explicitly wants an actual interactive 3D globe simulation. Make Earth the central workspace, with orbit and zoom, geographic transmitter and receiver positions, an ionosphere shell, and animated engine-provided propagation paths. Support terrain detail for VHF. The current text starter is temporary bootstrap UI and is not the target design.

Use the installed Google Chrome for browser verification. Chrome's native app is available even when the browser automation connector reports that Chrome is unavailable.
