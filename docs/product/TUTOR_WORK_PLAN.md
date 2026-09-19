# Seamless workspace and tutor

- [x] Read the Poteto Mode Principles section in full.
- [x] how over the affected subsystem. ProductApp owns scenario and lesson state; LabWorkspace runs simulation and stacks scene/results/instruments; DisasterLab owns its own graph. No server existed.
- [x] architect for parallel design exploration. Compare sticky long pages with bounded workspace views. Choose explicit lesson phases and local workspace tabs; maintain state while changing views. Text uses the Agents SDK with server-side read-only physics tools; voice uses WebRTC with server-side session creation.
- [x] Blocking first steps. Confirm official API protocol and agreed context shape before wiring client/server.
- [x] Independent workstreams. Workspace owner, disaster owner, server owner, and coordinator tutor UI use disjoint files.
- [x] Shared mutable state. Parent integrates ProductApp only after workspace owner releases it. Root dependency configuration belongs to server owner.
- [x] Smallest safe decomposition. Three bounded delegates plus coordinating client implementation and end-to-end review.
- [x] Delegate code-writing and review the resulting diff.
- [x] Verify on the matching surface. Desktop, mobile, missing-key behavior, mocked transport contract, cancellation, microphone teardown, and deterministic grounded tools.
- [x] Commit verified integration and push. No hosted deployment target is configured.
- [x] Record actual provider verification limits and required environment variables.

Data shapes are TutorContext, TutorMessage, provider status, and a voice connection lifecycle. Context contains the current scenario/physics or disaster network and lesson ID. The backend validates it and recomputes results. Conversation text and audio are transmitted only after an explicit learner action; standard API credentials never enter browser code. No AI answer awards mastery or silently edits an experiment.

## Verification

499 tests across21 files and production build pass. Browser desktop1280×720 has document height720 while the lab and docked tutor remain accessible. The first lesson retains results and demonstrated mastery across phases. Disaster Test network opens Results and reports100% coverage and28h38m for its initial exercise. Mobile390×844 has no horizontal overflow and the tutor remains usable. The missing-key state disables sends with a clear connection message.

A temporary, explicitly labeled TEST FIXTURE provider verified the real browser→HTTP→validated context→response path. It received the current disaster network and returned its computed coverage/endurance summary. Switching to Lab while a delayed answer was pending cancelled the answer and retained the question for retry. The fixture was stopped and the real unconfigured server restored. This verifies wiring, not model answer quality. Unit tests verify voice event parsing and resource cleanup, API SDP request shape, bounds, cancellation and sanitized provider errors. Live microphone negotiation, model replies, and account permissions remain untested without OPENAI_API_KEY.

Experience First drove the phase-based layout; Model the Domain drove the voice lifecycle and typed tutor context; Boundary Discipline kept credentials and context validation on the server; Prove It Works drove desktop/mobile and HTTP-fixture checks rather than treating compilation as integration evidence.

The complete production server at localhost8787 was verified through first-lesson prediction, SEND IT, and the expected −49.6 dBm result. With that server stopped, the installed app reloaded offline and retained lesson progress. The real server was restarted afterward. Independent final review confirmed the previously reported cancellation, history, and context-size issues were fixed.
