# BIG SIGNAL — Radio Science Lab

## Business Requirements Document

**Document baseline:** 19 September 2026 · **Product:** experimental educational web application · **Status:** current capability description and proposed evaluation criteria; not a production certification.

> Make invisible radio connections understandable through visible experiments.

Start with the [README and visual product tour](README.md). Detailed behavior is specified in the [PRD](PRD.md); system boundaries are documented in [Architecture](docs/ARCHITECTURE.md).

## 1. Opportunity and purpose

Radio teaching often separates equations from their practical meaning. A beginner may know that increasing power makes a signal stronger but not understand why a blocked path can still fail. Hardware access, setup time, and unfamiliar terminology can also make classroom experimentation difficult.

BIG SIGNAL provides a browser-based laboratory where learners predict an outcome, change a radio setting, observe a modeled result, and explain what happened. It is an educational simulator, not a service that establishes real radio communication.

The original project positions the product as nonprofit and experimental. No paid subscription, commercial deployment, customer adoption, or measured learning improvement is claimed by this document.

## 2. Value proposition

**Audience-friendly pitch:** “Try to send a message. See what blocks it. Change your design and discover why it works.”

The product combines:

- Visual terrain, globe, and network views with labeled outcomes.
- A prediction–experiment–reflection learning loop instead of passive explanation alone.
- Inspectable equations, assumptions, units, and limiting factors from a deterministic engine.
- Local lessons and portable classroom files without a mandatory account or AI subscription.
- An optional contextual AI tutor that explains and operates supported controls; it is not the source of RF calculations.

These are product attributes, not a claim that no other simulator offers similar capabilities.

## 3. Stakeholders and needs

| Stakeholder | Need | Product response |
| --- | --- | --- |
| Beginner learner | Understand one concept without knowing RF terminology | Guided lessons, predictions, plain-language explanations, visible outcomes |
| Teacher or radio-club educator | Set an experiment and review evidence | Lesson progression, teacher challenges, saved and exported experiments |
| Curious or advanced learner | Inspect the model and test unusual designs | WHY/MATH, equipment workbench, comparisons, real/fantasy separation |
| Presenter or hackathon judge | Understand the purpose and see a complete experiment quickly | Illustrated introduction, project walkthrough, short demonstration flow |
| Maintainer | Improve the experience without changing scientific meaning accidentally | Typed contracts, engine/UI ownership boundaries, deterministic tests |

Disaster-resilience learners are an educational audience. Emergency operators are **not** an operational target customer for this build.

## 4. Business objectives and requirements

| ID | Requirement | Priority | Acceptance evidence |
| --- | --- | --- | --- |
| BR-01 | Teach a radio concept through an end-to-end experiment | Essential | A learner can predict, run, inspect, change one parameter, rerun, and explain the difference |
| BR-02 | Make the product understandable without specialist vocabulary | Essential | First-time audience testing can restate the problem and learning value after a short demo |
| BR-03 | Keep scientific results inspectable and separate from presentation | Essential | UI displays engine results and assumptions; code review finds no duplicate RF engine in React or tutor prose |
| BR-04 | Support classroom reuse without mandatory accounts | Essential | Teacher creates a challenge; a second browser imports its validated file and runs it |
| BR-05 | Keep the core learning experience independent of paid AI services | Essential | Lessons and simulation operate with no tutor key; cached production app supports offline reload |
| BR-06 | Make common layouts and controls usable across screen sizes | Essential | Keyboard, narrow-screen, selected/hover/disabled-state, and reduced-motion checks complete |
| BR-07 | Demonstrate human relevance through responsible scenarios | Essential | Field and hospital-network examples teach tradeoffs and clearly state educational limitations |
| BR-08 | Offer optional conversational assistance without taking control away | Desirable | Configured tutor explains current context; supported edits are bounded and reversible; voice requires consent |

BR-02 and educational impact need user research. Their inclusion is not evidence that a study has been completed.

## 5. Scope and current capability

### Present in the local implementation

- Learn curriculum, Radio lab, Disaster lab, When phones fail, and Unreasonable engineering.
- Saved experiments, teacher tools, physics explanations, local persistence, and validated file exchange.
- Terrain/globe/network visualizations, graphics modes, and conceptual introductory animations.
- Authoritative link simulation, additional laboratory helpers, and bidirectional network-link evaluation.
- A local visual walkthrough and optional text/voice tutor integration.

“Present” means code exists in this repository. It does not imply deployment, live-provider verification, accessibility certification, or an independently validated engineering model. Consult dated [verification notes](docs/product/VERIFICATION.md) and rerun checks for the current revision.

### External dependencies and optional capability

The core application needs a compatible browser and an initial installation/load. Offline use requires a successfully cached production build, not the Vite development server. AI assistance additionally needs a configured server, a valid server-side credential, connectivity, and provider availability. Voice also needs microphone permission and a compatible secure browser context. Selecting a narration language is not equivalent to translating the whole interface.

### Explicitly outside scope

- Live emergency dispatch, rescue routing, guaranteed coverage, or real-world permission to transmit.
- Detecting people, locating mineral/natural resources, or analyzing satellite imagery.
- Actual radio transmission, physical network provisioning, or hardware control.
- Calibrated global terrain/ionospheric forecasting or a full electromagnetic custom-antenna solver.
- Student accounts, cloud classroom rosters, cross-device synchronization, or a learning-management-system integration.
- Fully offline AI, guaranteed speech recognition/translation quality, or autonomous unrestricted computer operation.

## 6. Human use cases

### UC-01 — A field team cannot reach base

The learner opens a terrain experiment, predicts the result, then compares antenna height and transmitter power. The educational outcome is explaining why geometry and signal budget are different constraints. Success is understanding the simulated result, not establishing a real connection.

### UC-02 — Hospitals need another communication route

The presenter opens When phones fail or Disaster lab, shows configured stations, and investigates direct links, relays, redundancy, and energy constraints. Learners discuss a modeled network's limitations. This is a classroom resilience scenario, not an emergency response plan.

### UC-03 — A teacher wants evidence, not just a green result

The teacher creates a portable challenge with equipment and numerical constraints. Students predict, run, inspect calculations, and export their design. Teacher review combines automated structured checks with discussion of written planning requirements.

### UC-04 — An audience needs a plain-language guide

The presenter opens the local five-stop walkthrough. With optional voice configured, the audience asks for an explanation in a supported narration language. The tutor uses current context and bounded tools; the visual guide remains available without it.

Natural-resource field expeditions can be discussed as a **communications teaching context**. Resource discovery itself is not a product capability.

## 7. Proposed success measures

These are **evaluation targets, not achieved results**. Collect observations with participant consent; analytics infrastructure is not implied.

| Measure | Proposed target | Measurement method |
| --- | --- | --- |
| First-time comprehension | Audience can explain the product within two minutes | Ask a participant to describe the purpose after the demo |
| Learning-loop completion | Beginner completes one guided concept in approximately 5–10 minutes | Facilitated session timing and observation |
| Concept transfer | Learner explains the result of a new related setup | Before/after questions; report sample size and methodology |
| Classroom portability | Challenge transfers and retains constraints correctly | Export/import acceptance check in a separate browser profile |
| Demo resilience | Core experiment completes after cached offline reload | Test the presentation device with connectivity disabled |
| Interface usability | No essential action blocked in agreed desktop/mobile test cases | Keyboard and viewport checklist; log failures rather than infer compliance |

## 8. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Attractive maps imply operational accuracy | Label conceptual visuals and model limits; distinguish supported paths from hypothetical budgets |
| AI supplies an unsupported scientific conclusion | Use authoritative engine outputs, bounded tools, context freshness checks, and explicit uncertainty |
| Provider/network failure breaks a presentation | Keep the local visual tour and manual experiment as the default fallback |
| Large 3D assets or a low-power device degrade usability | Bundle assets, provide POTATO mode, and test the actual presentation hardware |
| Browser storage is cleared or unavailable | Offer portable exports; explain that local persistence is not a cloud backup |
| Broad scope reduces clarity | Prioritize the prediction–experiment–explanation loop before adding features |
| Exposed credentials or sensitive classroom inputs | Keep secrets server-side, rotate exposed keys, and avoid unnecessary personal data |

## 9. Delivery and governance

The repository does not establish a delivery date, operating budget, adoption forecast, or commercial owner. Runtime/provider costs depend on optional deployment and usage and must be reviewed separately.

Scientific changes follow [CONTRIBUTING.md](CONTRIBUTING.md). Product acceptance requires numerical tests, interface checks, and a repeatable demonstration. Future capabilities must be marked proposed until implemented and verified; changes to this document alone do not complete a requirement.

Next documents: [PRD](PRD.md) · [Architecture](docs/ARCHITECTURE.md) · [Model limits](packages/simulation/README.md) · [Usage and setup](README.md).
