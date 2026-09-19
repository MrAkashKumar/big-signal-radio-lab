# Integration checkpoint

The `integration` branch combines backend `3a0dd07` and frontend `32f57b3`.

The first merge built and passed 303 tests, but the frontend adapter still returned fixed mock values. Its 5 W to 50 W probe reported `0 dB; expected 10 dB`. The integration replaces that adapter with the authoritative engine and loads complete VHF and HF scenarios.

## Verified on September 13, 2026

- `bun install --frozen-lockfile` completed without lockfile changes.
- `bun run test` passed 312 tests in 13 files.
- `bun run test:physics` passed 296 tests in 9 files.
- `bun run build` passed TypeScript and produced the web bundle.
- Browser VHF at 5 W and 2 m showed -81.8 dBm RX and -6.8 dB margin.
- Browser VHF at 50 W and 2 m showed -71.8 dBm RX and +3.2 dB margin, a 10 dB improvement.
- Returning to 5 W and raising TX to 15 m showed -67.6 dBm RX and +7.4 dB margin, about 14.2 dB above baseline. The path changed from diffracted to direct.
- MATH rendered 29 calculation nodes for the VHF scenario.
- HF Singapore to Tokyo at 14 MHz showed +26.0 dB margin with a returning path. At 30 MHz it failed with an escaping path and a visible warning that its +22.6 dB candidate budget is hypothetical.
- Save, reset, and load restored the HF experiment, prediction, attempt count, and POTATO mode.
- A 390 px viewport had 390 px body width. Advanced controls remained available.
- Production reload and VHF transmission worked after stopping the preview server. The original service worker returned a blank page in that check. Its same-origin asset lookup now ignores response Vary headers when matching precached static files.

## Remaining limits

The production bundle is about 1.58 MB, or 472 KB gzip, and Vite reports its chunk-size warning. Three.js reports a Clock deprecation warning from the rendering stack. Actual presentation-laptop frame rate is unmeasured. The repository has no hosted deployment target configured.

RF models remain educational approximations. Terrain display scales are exaggerated; the simulation results and geographic paths remain authoritative.
