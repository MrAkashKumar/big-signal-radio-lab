# BIG SIGNAL — Radio Science Lab

## Product Requirements Document

**Baseline:** 19 September 2026 · **Scope:** repository implementation plus explicit acceptance criteria · **Related:** [BRD](BRD.md), [README](README.md), [Architecture](docs/ARCHITECTURE.md).

This document describes intended behavior and where it is implemented. An implementation reference is not a passing test report. Live AI behavior, deployment readiness, accessibility compliance, and performance must be verified in their actual environments.

## 1. Product principle

**Make the invisible visible—and make the result explainable.**

The main loop is:

```text
Understand the mission → Predict → Configure → SEND IT
        ↑                                      ↓
Change one thing ← Inspect WHY / MATH ← Read the result
```

Animations communicate the idea. The engine's labeled outcomes, numerical results, assumptions, and warnings communicate the scientific result. A learner's prediction must never determine the simulation outcome.

## 2. Users and primary journeys

| User | Entry | Completion |
| --- | --- | --- |
| Beginner | Learn | Completes an experiment and answers a transfer question |
| Experimenter | Radio lab | Compares designs and explains the limiting factor |
| Resilience learner | Disaster lab / When phones fail | Explains which modeled links connect a network and its tradeoffs |
| Teacher | Teacher tools | Creates a valid challenge and reviews student evidence |
| Presenter | Project walkthrough | Shows a coherent tour with or without optional narration |

### First useful experiment

1. Start the app using the [README setup instructions](README.md).
2. Choose Learn for a guided lesson or Radio lab for an open experiment.
3. Read the mission and select a prediction when required. A disabled SEND IT should explain the missing prerequisite.
4. Change an available setting and run the simulation.
5. Read the labeled outcome and inspect WHY/MATH; do not infer success from animation alone.
6. Change one setting, rerun, and compare the evidence.
7. Save/export if the experiment needs to be preserved outside the current browser.

For a presentation, the home hospital story or Project walkthrough provides context before the experiment. Introductory artwork is conceptual and must not be presented as a computed coverage map.

## 3. Navigation and information architecture

| Surface | Purpose | Important distinction |
| --- | --- | --- |
| Learn | Guided prediction, experiment, reflection, and local mastery | Prerequisites may intentionally lock a lesson |
| Radio lab | Configure and inspect a two-station experiment | RF values come from the engine, not scene geometry |
| Disaster lab | Explore stations, relays, links, redundancy, and energy | Connectivity evaluates configured bidirectional links |
| When phones fail | Hospital-network teaching scenario | Historically inspired, not a reconstruction or operational plan |
| Unreasonable engineering | Extreme designs and explicit fantasy switches | Real-formula experiments and fantasy physics remain distinguishable |
| My experiments | Recover and exchange saved evidence | Browser storage is local, not an account |
| Teacher tools | Create portable challenges | Structured checks do not automatically judge written planning constraints |
| About the physics | Explain models and limitations | Not a claim of field-validated prediction accuracy |

Navigation labels are centralized in `apps/web/src/app/navigation.ts`. Guided stories and walkthrough UI live under `apps/web/src/features/`; teaching copy lives in `content/`.

## 4. Functional requirements

All rows below have corresponding local implementation. “Optional” identifies capability that additionally requires configuration and live verification.

| ID / BRD link | Requirement | Acceptance criteria | Implementation reference |
| --- | --- | --- | --- |
| FR-01 / BR-01 | Run a prediction-led experiment | When prediction is required, missing prediction keeps SEND IT unavailable with guidance; selecting an answer enables execution; engine results are independent of the answer | `LabWorkspace.tsx`, `LabControls.tsx` |
| FR-02 / BR-03 | Keep one authoritative RF calculation boundary | Scenario validates before execution; returned result provides power, noise, SNR, margin, paths, warnings, and limits; React renders rather than recomputes RF | `packages/contracts`, `packages/simulation`, `simulationAdapter.ts` |
| FR-03 / BR-01 | Support controlled radio changes | Relevant controls update scenario values; changing band preserves the intended endpoint experiment; unsupported/invalid inputs do not silently become valid results | `LabControls.tsx`, `productDomain.ts` |
| FR-04 / BR-03 | Explain success and failure | Display labeled status, units, limiting factors, and calculation detail; unavailable propagation is not shown as successful merely because a hypothetical margin is positive | `Results.tsx`, `content/explanations` |
| FR-05 / BR-01 | Teach through a structured curriculum | Lessons expose objectives, predictions, experiments, reflection, and transfer questions; mastery follows defined evidence and prerequisite rules | `content/lessons.ts`, `packages/missions/product.ts` |
| FR-06 / BR-01 | Compare designs and explore equipment | A/B results correspond to their saved inputs; workbench exposes model assumptions; arbitrary wire geometry is not claimed to be an electromagnetic solve | `AdvancedLab.tsx`, `laboratory.ts` |
| FR-07 / BR-07 | Evaluate educational networks | Configured links are evaluated in both directions; connectivity, redundancy, and energy reflect the supplied network; invalid or incomplete inputs remain visible | `DisasterLab.tsx`, `packages/simulation/src/network.ts` |
| FR-08 / BR-07 | Provide a human-centered hospital scenario | The hospital scenario opens through its UI entry and permits modeled experiments; the interface retains educational framing | `TsunamiLevel.tsx`, `packages/missions/tsunami.ts` |
| FR-09 / BR-03 | Separate real and fantasy physics | Fantasy mode is explicitly labeled; comparisons and portable experiments preserve the selected physics settings | `laboratory.ts`, `packages/missions/product.ts` |
| FR-10 / BR-04 | Save, export, and import experiments | A valid exported experiment round-trips; malformed/schema-incompatible files are rejected; invalid persisted data recovers safely | `productStorage.ts`, `packages/missions/product.ts` |
| FR-11 / BR-04 | Support teacher challenges | Export retains objective and supported constraints; importing the file reproduces them; structured checks distinguish model requirements from written discussion | `TeacherTools.tsx`, `packages/missions/product.ts` |
| FR-12 / BR-05 | Support cached offline core use | After a production installation reports readiness, reload without connectivity and complete a local simulation; tutor API requests are not represented as offline-capable | `apps/web/public/sw.js` and web offline registration |
| FR-13 / BR-02 | Provide an understandable visual walkthrough | Five stops navigate known pages; previous/next/end and animation controls work without an API key; guide does not award mastery | `features/walkthrough`, `content/explanations/walkthrough.ts` |
| FR-14 / BR-08 | Optional contextual text tutor | A configured server accepts validated context, explains authoritative results, and applies only supported edits; stale context cancels/rejects actions; user can undo eligible edits | `TutorPanel.tsx`, `tutorActions.ts`, `packages/tutor`, `apps/server` |
| FR-15 / BR-08 | Optional voice walkthrough | Explicit voice start and permission precede microphone use; known-stop navigation is bounded; selected narration language is supplied to the tutor; stopping releases voice resources | `TutorPanel.tsx`, `tutorVoice.ts`, `apps/server/provider.ts` |

Paths without a directory prefix in this table are under `apps/web/src`, except `laboratory.ts`, which is under `packages/simulation/src`. [Project structure](docs/PROJECT_STRUCTURE.md) provides the full layout.

## 5. Interface and accessibility requirements

These are acceptance requirements, not a declaration of WCAG certification.

- **UX-01:** Every important outcome has a text label and numerical/explanatory alternative to color or 3D.
- **UX-02:** Hover, focus, selected, active, and disabled states retain readable labels. Active tabs have a persistent indicator; focus is visible with a keyboard.
- **UX-03:** Radio settings remain reachable. Desktop scrolling has a visible cue and keyboard-accessible region; mobile and short screens must not hide controls behind fixed panels.
- **UX-04:** Test at desktop and 390-pixel-wide mobile layouts. Main navigation, lesson controls, tutor, and send actions must remain reachable without unintended page-level horizontal overflow.
- **UX-05:** Reduced-motion preferences and explicit pause controls prevent decorative motion from being mandatory.
- **UX-06:** BIG, NORMAL, and POTATO change rendering detail, not the scientific result. POTATO provides a lightweight SVG alternative.
- **UX-07:** Locked lessons and unavailable actions explain why. Do not remove genuine learning prerequisites to make every item look clickable.
- **UX-08:** Plain-language context appears before dense technical controls; advanced detail remains discoverable without obscuring the main experiment.

## 6. Data, privacy, and safety

- Scenario and result contracts are versioned. Imported data passes parsers/validation before use.
- Working state, notebook entries, and mastery use local browser persistence. Users need exports for durable sharing or backup; clearing site storage can remove local progress.
- Single-experiment files use `.bigsignal.json`; network files use `.bigsignal-network.json`; custom-wire files use `.bigsignal-wire.json`. Use the matching import surface.
- Core simulation does not require an account. Optional tutor requests send supplied context and questions to the configured server/provider; do not describe them as local-only.
- Provider credentials stay on the server, never in frontend bundles, screenshots, documentation examples, or commits. Rotate any exposed credential.
- AI demonstrations must respect supported edit limits, fresh context, and Undo behavior; they must not award student progress or silently export files.
- Models use educational approximations. Map detail is not a global terrain elevation service; a drawn route is not proof of real-world coverage.
- The application does not grant radio licenses, operate transmitters, or replace qualified emergency planning.

## 7. Reliability and performance

| ID | Requirement / target | Verification |
| --- | --- | --- |
| NFR-01 | Deterministic engine results for the same supported inputs | Repeat fixed numerical and regression tests |
| NFR-02 | Normal simulation under 100 ms; at least 30 FPS on the chosen demo machine | Original planning targets only; benchmark and record hardware before claiming attainment |
| NFR-03 | Physics runs on deliberate actions, not every animation frame | Review execution boundaries and profile the demo |
| NFR-04 | AI unavailability leaves manual simulation usable | Test missing key, disconnected network, denied microphone, and ended session |
| NFR-05 | Production caching is distinguishable from development behavior | Test a cached production build offline; do not infer from a running dev server |
| NFR-06 | Storage/import errors do not destroy unrelated valid state | Parser and independent-storage recovery regressions |

No browser-support matrix, uptime SLA, bundle-size budget, or live-provider latency guarantee is established by this document. Define those before production commitments.

## 8. Acceptance and release checklist

Run from the repository root:

```sh
bun run test
bun run test:physics
bun run build
```

The build script includes application and worker TypeScript checks. A successful build alone does not verify browser interaction, offline behavior, or a live AI session.

Before calling a revision demo-ready:

1. Complete a lesson using prediction, SEND IT, WHY/MATH, and reflection.
2. Compare a fixed setup at 5 W and 50 W: the applicable linear link budget should increase by approximately 10 dB without UI-side RF calculations.
3. Use the designated ridge fixture to compare power and antenna-height changes; do not generalize its outcome to all terrain.
4. Raise the HF frequency above modeled MUF and confirm unavailable propagation is clearly distinguished from its hypothetical numeric budget.
5. Navigate every main/tool tab and inspect hover/focus/selection, including mobile radio settings and disaster controls.
6. Round-trip a teacher challenge and reject a malformed file without losing unrelated saved data.
7. Check the hospital/network example against its actual engine outputs, not the introductory artwork.
8. Cache a production build, disconnect, reload, and complete a core experiment in POTATO mode.
9. If demonstrating AI, separately verify text, consent, voice start/stop, language request, bounded navigation/edit, stale-context rejection, and Undo with the configured provider.
10. Record revision, device/browser, commands, observed failures, and unavailable checks. Do not reuse old test counts as current evidence.

Historical observations are in [verification notes](docs/product/VERIFICATION.md). They are dated evidence, not a blanket assertion about later changes.

## 9. Non-goals and future decisions

This release does not promise real transmissions, field-certified predictions, natural-resource/person detection, full-wave wire solving, live operational disaster intelligence, cloud accounts, or whole-interface localization. A selectable voice language is a narration preference, with quality dependent on the configured model and audio conditions.

Future decisions should follow evidence: classroom usability research; systematic accessibility testing; measured performance budgets; broader language review; deployment and provider-cost controls; and any higher-fidelity model work. None is automatically approved or implemented by listing it here.

## 10. Change control and traceability

BR requirements state why the product exists; FR/UX/NFR requirements state what must be demonstrated. Engine contract changes follow [CONTRIBUTING.md](CONTRIBUTING.md); implementation boundaries follow [Architecture](docs/ARCHITECTURE.md). Update the relevant requirement, test, and teaching limitation together when behavior changes.
