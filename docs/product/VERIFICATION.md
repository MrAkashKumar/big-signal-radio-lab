# Product verification

## Browser checks

Development and production builds were tested in the Codex browser on 2026-09-13. Live browser observations are retained in the coding task transcript; no replayable browser recording or screenshot files are committed. The browser showed the rendered application, rather than a static HTML preview.

- First launch opens the first lesson. SEND IT is disabled until a prediction is chosen. The first simulated link succeeds. Answering the transfer question advances to Bigger signal.
- A teacher challenge exports to a local `.bigsignal.json` file. The exported file validates through `decodeExperiment`. A clean browser origin imports its title, 146 MHz scenario, 10 W limit, and lesson metadata.
- The imported teacher challenge passes its structured checks at 5 W. An A/B comparison at 50 W adds 10.0 dB to received power, SNR, and margin, and fails the teacher power check.
- The HF lesson returns a usable path at its starting frequency. At 30 MHz, it reports no supported path and explicitly labels the positive numeric budget hypothetical.
- With the production preview server stopped, reloading the installed app succeeds. SEND IT still produces a successful local simulation. POTATO renders the engine path as a labeled SVG terrain profile.
- At 390 × 844, the lesson, Disaster Lab, and teacher page have document width 390 with no horizontal page overflow. The viewport override was reset afterward.

See [panel verification](PANEL_VERIFICATION.md) for network, battery, antenna, wire, and 3D placement checks.

The final production build at `http://localhost:4181` was installed, then its server was stopped. The app reloaded, country search found Singapore, the detailed globe rendered, and SEND IT returned −49.6 dBm received power with 66.4 dB margin. No browser errors were reported. The preview server was then restarted. Natural Earth coastlines, island geometry, lakes, and major rivers are bundled; they do not drive RF loss or terrain elevation.

Final automated result: **472 tests across 19 files pass**, including regressions for co-located vertical links and networks with missing transmit/receive workloads. TypeScript checking and the production build pass. The JavaScript bundle is 3.37 MB raw / 1.10 MB gzip, including all offline map data and the 3D renderer.

## Repeatable checks

Run `bun run test`, `bun run test:physics`, and `bun run build`. Tests cover fixed numerical references, lesson scenarios and outcomes, portable-file rejection, teacher requirements, independent storage recovery, network graph results, energy estimates, and fantasy switches.

For a repeatable browser walkthrough, run `bun run dev` and follow the lesson and classroom procedures in the README. For offline verification, run the production preview, wait for the Ready offline notice, stop that preview server, and reload the tab. Development mode does not register the service worker.

## Limits of the evidence

These are educational models, not field measurements. Network reliability is represented through link margin and available paths, not a calibrated probability of delivery. Custom wire geometry has no NEC solve. Image and video waveforms are not implemented and cannot pass the communication requirement. No AI service is required or configured.

The production bundle includes the local world geometry and 3D renderer. Vite reports a large-chunk warning. Graphics use demand rendering and POTATO uses an SVG view; no minimum frame-rate measurement is claimed here.

There is no configured hosted deployment target in the repository. The verified production artifact is `apps/web/dist` and the local preview serves that artifact.
