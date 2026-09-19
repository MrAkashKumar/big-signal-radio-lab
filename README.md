# B I G S I G N A L

An interactive educational radio laboratory for students, teachers, and curious people. Build a connection between two radios, see what gets in the way, and discover how to improve it. No radio hardware or account is required.

**The question: can we get a message from here to there—and what is stopping us?**

Predict a result, change one setting, press **SEND IT**, and inspect the result. A deterministic radio-frequency (RF) engine powers the lessons, terrain/globe views, and network experiments. Core learning works offline after the production app has been cached; the optional AI tutor needs a server and internet access.

## Explain it in 30 seconds

> Radio waves are invisible, so radio can be hard to understand. BIG SIGNAL makes the connection visible. You try to send a message, see why the connection struggles, and test a better design. Sometimes raising an antenna helps more than adding power. The important part is learning why—not just getting a green light.

The same ideas help explain field expeditions, remote communities, and disaster-resilience communications. These are educational scenarios, not real-world coverage predictions or emergency instructions.

## Run the product

For contributors, see the [project structure and code placement guide](docs/PROJECT_STRUCTURE.md).

Install [Bun](https://bun.sh/) before starting. From the repository root:

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173/`). Start with **Enter the hospital mission** on the home screen, choose the guided lessons, or select a mode in the navigation. Returning visits can restore your locally saved workspace. The core app does not require a cloud backend or API key.

## Work in one place

**Project walkthrough** opens a five-stop visual guide with language selection. **Open voice guide** queues an explanation in Ask Signal; after server configuration and explicit consent, OpenAI Realtime can narrate stops, navigate the tour, and demonstrate supported radio changes with Undo. Try “Give me a walkthrough,” “Next,” and “Explain this in Tamil.” The visual tour works without a key; live voice does not. See [voice setup and walkthrough instructions](docs/TUTOR_SETUP.md#voice-led-project-walkthrough). Never paste API keys into chat; rotate any exposed key.

Lessons use Brief, Experiment, and Reflect steps. The lab keeps the map and radio controls together, with direct views for results, comparisons, instruments, and physics settings. SEND IT stays within reach. Disaster Lab opens on the network, with separate briefing and result views.

The home screen presents a coastal hospital rescue story with illustrated terrain, buildings, a hilltop relay, and animated transmissions. Select **Phones go down**, **Find another route**, and **Test the connection** to explain the challenge. Use **Pause animation** to stop motion; system reduced-motion preferences disable it. **Enter the hospital mission** opens the existing interactive hospital network. The introductory routes are conceptual, not computed coverage. Inside the lab, expand **New to radio? Start here.** for a plain-language guide to power, frequency, antenna height, and noise. Results retain technical units with short explanations below each metric.

**Ask Signal** opens the optional AI tutor beside the lab on desktop or as a compact panel on mobile. It receives the current experiment or disaster network, answers text questions with engine tools and can demonstrate changes directly in the workspace, with undo, and supports spoken conversations through OpenAI Realtime. Setup is in [Signal tutor setup](docs/TUTOR_SETUP.md). No key is required for the lessons or simulation.

## Choose a mode

The shared interface uses neutral white surfaces, dark readable text, blue selected controls, and restrained section accents. On phones the main navigation becomes a two-column grid, tool tabs wrap within the viewport, and form controls use larger text and touch targets. Keyboard focus is explicitly outlined; color is never the only indicator of selection.

The radio controls have a keyboard-focusable **Radio settings** scroll region on desktop and normal page scrolling on mobile/short screens. A visible hint points to additional settings. **SEND IT** explains when it is waiting for a prediction; a guess enables the experiment but does not determine its result. Workbench and disaster tabs use explicit selected states. Lesson prerequisites remain enforced rather than making locked lessons appear selectable.

Every non-Learn tab includes a collapsible visual use-case guide. Radio lab introduces a field expedition; Disaster lab introduces community connectivity; When phones fail introduces hospital communications; Unreasonable engineering introduces an extreme outpost design. My experiments, Teacher tools, and About the physics show visual workflows for saving evidence, running a class, and inspecting models. Select the three story steps for plain-language instructions, use **Animate route** / **Pause motion**, or **Hide guide** to focus on the workspace. These illustrations do not load scenarios, change settings, or represent live engine results. Reduced-motion preferences disable their animation.

| Mode | Human question | What to try |
| --- | --- | --- |
| Learn | How does radio work? | Follow a guided prediction, experiment, and reflection. |
| Radio lab | What changes this connection? | Adjust one setting and compare the results. |
| Disaster lab | How can a team stay connected? | Explore relays, coverage, redundancy, and battery constraints. |
| When phones fail | How could hospitals communicate after infrastructure fails? | Explore the 2004 tsunami-inspired hospital-network scenario. |
| Unreasonable engineering | What happens at the extremes? | Test extreme equipment, or explicitly switch to fantasy physics. |

- **Learn** has 10 beginner, 8 intermediate, and 14 advanced lessons. Each has a prediction, hands-on experiment, explanation, transfer question, and local mastery record. Each tier has its own entry point. Detailed concepts identify which quantities are modeled and which remain conceptual.
- **Radio lab** lets you place stations, change bands while keeping endpoints fixed, compare A/B designs, inspect WHY/MATH, and use the antenna and receiver workbench. Raise antenna height, change polarization, inspect Fresnel zones, or test a weak-signal mode.
- **Disaster Lab** has six civil-resilience exercises. Learn why direct radio can help when power, fiber, Internet, or cellular infrastructure fails. Place relays in 3D or on a map, configure bidirectional links, and compare coverage, redundancy, battery endurance, and communication requirements.
- **Unreasonable Engineering** keeps ordinary physics for extreme equipment. Its separate fantasy mode can change Earth curvature, ionosphere presence, spreading, or the speed of light. Files and comparisons preserve the selected universe.

POTATO graphics renders lightweight SVG scenes with the same simulation results. BIG and NORMAL render interactive 3D. Reduced motion, keyboard controls, responsive layouts, and graphics fallbacks keep the lab usable on modest equipment.

## Give a two-minute demonstration

1. **Start with a person and a problem.** “Our remote team needs to contact base camp.” Show the home radio illustration and open the first link or a terrain lesson.
2. **Make a prediction.** Ask whether the connection will work, then press **SEND IT**. Explain the displayed outcome before discussing numbers.
3. **Change one thing.** Compare more transmitter power with a higher antenna. Run each experiment and use its actual results; do not promise that either change always fixes a link.
4. **Explain why.** Open the result explanation and calculation details. Point out the modeled obstruction or other limiting factor.
5. **Connect it to people.** Open **When phones fail** or **Disaster lab** to show why connecting multiple stations is a different challenge from connecting just two.

Useful language for a first-time audience:

| Technical term | Plain-language explanation |
| --- | --- |
| Transmitter / receiver | The radio sending / listening for the message. |
| Frequency | The radio setting that helps determine how the wave travels. |
| Antenna height | How high the antenna is; it can change clearance over terrain. |
| Noise | Unwanted energy the receiver must distinguish from the signal. |
| Link margin | How far the modeled signal quality is above or below the mode's requirement. A usable propagation path is also necessary. |
| Relay | Another station that passes communication onward. |

Animations illustrate a concept or an engine-returned path; they do not show a real wave's speed or guarantee real-world coverage. Text labels and numeric results remain the source for interpreting success, not color alone.

## Teach with a portable challenge

1. Open **Teacher Tools**. Choose a lesson or the current lab setup.
2. Enter the objective, available equipment, frequencies, hints, and numerical limits.
3. Open the student challenge to adjust its simulation parameters. Use **Teacher Tools** again to refine its teaching metadata.
4. Download the `.bigsignal.json` file and distribute it through your normal classroom channel.
5. Students choose **Open file**, make a prediction, and test their designs. They can save and export the resulting experiment.

Structured requirements check the physical model, usable one-way path, margin, power, frequency, equipment, and optional antenna height. Written planning constraints require classroom discussion. Battery requirements belong in Disaster Lab, where complete station energy inputs exist. No account or student roster is collected.

Network files use `.bigsignal-network.json` and import within Disaster Lab. Wire files use `.bigsignal-wire.json` and import in the custom wire editor. Custom wires are geometric designs, not solved electromagnetic antenna models.

## Verify and use offline

```sh
bun run test
bun run test:physics
bun run build
bun x vite preview apps/web --host 127.0.0.1 --port 4180
```

The production artifact is `apps/web/dist`. Load the preview once and wait for **Ready offline**. The core lessons, simulations, and bundled assets then work on an offline reload. Close old tabs and reopen after updates. The development server does not install an offline cache.

## Inspect the engineering

| Location | Responsibility |
| --- | --- |
| `apps/web` | React interface, navigation, controls, and scenes. |
| `content` | Lessons and educational explanations. |
| `packages/missions` | Mission definitions, assessment, and portable-file validation. |
| `packages/contracts` | Shared scenario and result schemas. |
| `packages/simulation`, `packages/propagation`, `packages/units` | Authoritative models and numerical helpers. |
| `validation` | Physics and numerical checks. |
| `apps/server`, `packages/tutor` | Optional contextual AI tutor. |

`simulateScenario` remains the authoritative RF entry point. `simulateLaboratory` adds explicit real/fantasy settings. `simulateNetwork` evaluates each configured edge in both directions before assessing connectivity, redundancy, and energy. Physics never lives in React.

Model assumptions, equations, units, and confidence appear in MATH and the equipment workbench. HF uses synthetic ionospheric conditions, terrain uses a configured single obstruction, and antenna patterns are analytical teaching shapes. The app is not an operational emergency communications plan or permission to transmit.

- [Architecture and integration boundaries](docs/ARCHITECTURE.md)
- [Course and model coverage](docs/product/CURRICULUM.md)
- [Product verification](docs/product/VERIFICATION.md)
- [Decision trail](docs/product/decisions.tsv)
- [Simulation models and limits](packages/simulation/README.md)
- [Numerical validation](validation/README.md)
- [Original build plan](docs/BUILD_PLAN.md)
- [Collaboration workflow](CONTRIBUTING.md)

The stack is TypeScript, React, Vite, Three.js, React Three Fiber, and Vitest with the committed Bun lockfile. The optional Bun server uses the OpenAI Agents SDK and Realtime API; its key stays on the server. There is no configured hosted deployment target.
