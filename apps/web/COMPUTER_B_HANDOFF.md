# Computer B experience handoff

This document records the original mock experience handoff. The `integration` branch now connects the real engine. Use the root [README](../../README.md) and [architecture notes](../../docs/ARCHITECTURE.md) for current behavior and run instructions.

Local `experience` branch, based on engine bootstrap `6960bb54d809a5c8a74a5d2171aebaa487ad0b96`. Changes are confined to `apps/web` and `content/explanations`. Engine, contracts, root configuration, and shared documentation are unchanged. Nothing has been pushed or merged.

## Implemented

Country navigation: bundled country boundaries, adaptive clickable labels, selected-country highlighting, name/code search, animated camera focus, zoom/rotation/reset controls, and TX/RX camera shortcuts. Country selection does not alter radio positions. Natural Earth label points and coarse boundaries are cartographic references; Singapore has a supplementary marker. Country-data tests bring the full suite to 40 passing tests.

Visual refinement: detailed bundled Natural Earth coastlines, locally rendered land texture, atmospheric rim glow, star field, continuous low-poly terrain, brighter path beams, progress strip, and a Present mode with a persistent prediction/transmission dock. The real engine boundary is unchanged. The current build remains approximately 1.27 MB JS / 361 KB gzip.

- Responsive React mission workspace; interactive Three.js globe with orbit/zoom, schematic continents, geographic station markers, ionosphere shell, and VHF terrain view.
- Animation of result-provided paths; no UI RF calculations. W/dBm conversions import Computer A's units package.
- Beginner presets and advanced radio controls; VHF/HF missions; prediction gating and attempt tracking.
- RX power, noise, SNR, margin, confidence, WHY, and recursive MATH rendering.
- Local persistence, save/load slot, reset, graphics modes, labeled controls, and WebGL fallback.
- Production service-worker caching; all graphics are locally generated geometry, with no remote asset dependencies.

## Integration boundary

Replace `src/simulationAdapter.ts` with Computer A's canonical `simulateScenario` after coordinating the contracts. It currently imports the shared mock and adds deterministic VHF/HF visual fixtures. HF uses scenario id `hf-expedition`. Fixtures do not respond to changes in power, height, frequency, antenna, or mode. All numeric results remain explicitly mocked.

Local VHF path coordinates use schematic scene units and appear in terrain view. HF paths use geographic degrees and radial altitude in metres and appear on the globe. Coordinate conventions need agreement with Computer A. Terrain and station heights are illustrative, not an independent geometry model.

MATH has an honest empty state because the shared mock provides no calculation tree; its recursive renderer accepts populated CalculationNode data. Real limiting-factor ranking, antenna-height effects, and above-MUF behavior remain engine integration work. No physics integration checkpoint has passed.

## Verification

- TypeScript and production Vite build passed.
- Full test suite: 37 tests passed in 4 files, including three fixture-boundary tests.
- Browser checks: VHF/HF transmission, prediction gating, WHY/MATH, advanced controls, save/reset/load, reload persistence, mobile and desktop layouts.
- No runtime errors observed. The rendering stack emits a Three.js Clock deprecation warning.
- Build warns about the Three.js-inclusive bundle: approximately 1.13 MB JS / 308 KB gzip.
- Chrome automation was unavailable. Offline reload with the server stopped failed in the in-app browser. Cache status is shown in the footer; verify offline reload in Chrome on the presentation laptop. Keep the local server running meanwhile.
- Actual-laptop 30 FPS remains unmeasured. POTATO reduces pixel ratio and geometry detail without changing results.

## Run

Use existing root scripts: `bun install --frozen-lockfile`, `bun run dev`, `bun run build`, `bun run test`. Bun was unavailable on this machine, so pnpm installed dependencies without generating a new lockfile; bun.lock and package configuration were preserved.

Production preview: `bun run build`, then `bunx vite preview apps/web --host 127.0.0.1 --port 5173`. Open `http://127.0.0.1:5173/`. Allow caching in a service-worker-capable browser. After build updates close and reopen old tabs before offline testing. A first visit requires the server.
