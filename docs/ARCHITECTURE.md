# Architecture and contract notes

## Calculation boundary

`Scenario` enters `simulateScenario` from `@bigsignal/simulation`, and `SimulationResult` returns all RF results. The web adapter uses that entry point directly. React renders the result and never computes path loss, noise, SNR, or link margin.

The `integration` checkpoint combines `engine` and `experience` without changing the engine's version 1 contracts. `EnvironmentConfig` selects free space, VHF terrain, or HF skywave with explicit model inputs. The UI missions load complete engine scenarios and set the HF endpoints and demonstration time.

`validateScenario` checks inputs at the engine boundary. Persisted settings use the same validator. Invalid saved settings fall back to the mission default, and simulation validation errors appear in the UI.

`propagationAvailable` distinguishes a supported route from a hypothetical budget. When it is false, the UI displays the failed status and a warning next to the numeric results even if the hypothetical margin is positive.

See [contract notes](../packages/contracts/README.md) for the schema and [simulation documentation](../packages/simulation/README.md) for thresholds, mode profiles, assumptions, and confidence semantics.

## Geometry and explanations

Engine paths contain latitude and longitude in degrees and altitude in metres above mean sea level. Endpoint altitude already includes antenna height. The globe renders these coordinates directly.

The terrain view projects geographic points onto the transmitter-to-receiver profile. It places the single obstruction at the middle of the illustration by stretching each side independently. A shared projection places the antenna tips, terrain crest, and returned paths in the same coordinates. Heights and spacing are exaggerated for visibility. This is display geometry and does not change the engine result.

Educational text lives in `content/explanations`. The engine returns explanation keys, warnings, calculation nodes, and ranked limiting factors. The UI displays each, including cases where restoring a path matters more than a numeric dB improvement.

## Runtime and validation

Simulation runs on SEND IT, never in the render loop. Graphics modes change rendering detail without changing physics. The app bundles its data and runs without a cloud backend. A production service worker caches the built app for offline reloads.

Use root `validation/` for physics and numerical checks. Web integration tests exercise mission inputs, engine responses, persisted settings, and terrain projection. Run the full test suite and production build before publishing changes. Browser checks must also cover the VHF power and height experiment and HF above-MUF behavior.

## Product domains

The product composes the existing scenes and version 1 RF contracts with a typed lesson registry in `content/lessons.ts`. `packages/missions/product.ts` owns assessment and portable-file validation. The lesson runner records prediction, attempts, transfer answers, and applied evidence without changing simulation accuracy across tiers.

`ProductApp` coordinates navigation and the working experiment. `LabWorkspace` runs the engine on SEND IT and renders results, comparisons, and teacher checks. `productStorage` recovers the working experiment, notebook entries, and mastery independently. Imported classroom data passes the same schema parser used for export.

Energy, impedance, cable, receiver, Fresnel, and fantasy helpers live in `packages/simulation/src/laboratory.ts`. Networks are an additive graph domain in `network.ts`; each edge invokes the same Scenario engine for both directions. No existing Scenario or SimulationResult field was removed or renamed.

The custom wire editor stores geometric points and segments separately. It does not infer gain, impedance, or resonance from arbitrary wire geometry. The SVG scene fallback projects returned path points and uses the same terrain projection as the 3D view.

## Contextual tutor and focused workspace

Lesson phases and workspace views select which mounted surface is shown, preserving simulation and mastery state. The map and radio controls have independent scroll areas. Disaster Lab exposes its live NetworkScenario to ProductApp through a typed callback. TutorPanel receives the current context and applies validated tutor actions through ProductApp. Demonstrations update controls and rerun results without recording attempts or mastery. A snapshot check rejects stale actions, and Undo restores the prior setup only if the learner has not since edited it.

The optional server lives in apps/server. It serves the production artifact and /api/tutor endpoints; Vite proxies the same routes during development and preview. packages/tutor validates context, builds bounded prompts from authoritative engine summaries, and supplies read-only hypothetical experiments plus a shared whitelist of editable numeric controls and antenna presets. Text edits are staged per request and atomically applied only after a successful response; voice tools execute only from completed responses, deduplicate call IDs, and return authoritative results through the Realtime function-output protocol. Text uses the OpenAI Agents SDK and voice uses server-created Realtime WebRTC calls. Standard credentials never reach the client. API routes are excluded from service-worker handling.

Voice has explicit connecting/listening/thinking/speaking states and tears down microphone tracks, peers, and pending requests on exit. Experiment changes refresh voice instructions or stop the session if refresh fails. Text requests are cancelled when their context changes. Recent history is bounded to the server contract; neither server conversation persistence nor provider tracing is enabled. Live-provider verification requires an API key.

The project walkthrough adds bounded language, visible-page and stop metadata to TutorContext. WalkthroughConsole renders local teaching content; ProductApp owns its page navigation. The voice-only guide_walkthrough tool selects one of five known stops or closes the guide, without editing experiment settings. Completed calls are deduplicated and checked against the response snapshot. Navigation ends the action batch and forces the follow-up response to narrate without tools; normal context refresh supplies the new page before later user requests. A separate narration request opens the consent panel and waits for an explicitly started voice connection. Lab edits from informational pages are rejected. The tour never marks learning progress or saves/exports files.
