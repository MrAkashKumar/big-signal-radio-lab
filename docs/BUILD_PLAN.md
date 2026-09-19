# B I G  S I G N A L

## Finalized Hackathon Build Plan

**B I G S I G N A L** is a nonprofit, experimental educational RF simulator for students, teachers, radio clubs, and educators.

It teaches radio by letting students build, break, inspect, and repair communication links.

The product should feel:

* technically legitimate
* visually impressive
* slightly ridiculous
* easy to experiment with
* useful to teachers
* understandable to complete beginners
* inspectable by technically knowledgeable users

The core question is:

> **Can we get a signal from here to there — and what is stopping us?**

The hackathon build must focus on one complete educational loop rather than attempting the entire long-term vision.

---

# 1. HACKATHON PRODUCT GOAL

A student should be able to:

1. receive a communication challenge
2. predict whether a link will work
3. configure frequency, power, antenna, height, bandwidth, and other relevant parameters
4. press **SEND IT**
5. watch the RF path animate
6. see whether communication succeeds
7. understand the primary limiting factor
8. inspect the actual calculations
9. modify the design
10. try again
11. learn a real RF concept in approximately 5–10 minutes

A judge should be able to understand the concept in under two minutes.

---

# 2. HERO DEMO

The primary demo should show one communication objective whose behavior changes dramatically across frequency.

Example:

> A science expedition needs communication between Base Camp and a remote team.

The user can switch between:

### HF

Visualization:

* globe
* ionosphere
* skywave
* skip
* possible multi-hop path

Educational concepts:

* MUF
* takeoff angle
* ionosphere
* day/night effects

### VHF/UHF

Visualization:

* terrain
* direct path
* obstruction
* diffraction

Educational concepts:

* line of sight
* antenna height
* terrain
* power
* polarization

### Microwave

Stretch goal.

Visualization:

* directional beam
* Fresnel zone
* obstruction

Educational concepts:

* beamwidth
* alignment
* Fresnel clearance
* directional gain

The central message is:

> **Changing frequency changes the entire propagation problem.**

---

# 3. PRODUCT PERSONALITY

The scientific output must remain serious.

The interface may be ridiculous.

Examples:

### Main simulation button

**SEND IT**

### Reset

**RESET THE UNIVERSE**

### Advanced controls

**NERD KNOBS**

### Extreme experiment mode

**UNREASONABLE ENGINEERING**

### Bad link

**NOPE.**

### Very large transmitter power

> **B I G S I G N A L acknowledges your commitment to solving problems incorrectly.**

### Microwave introduction

Show an image of an actual microwave oven.

Caption:

> **Wrong microwave.**

Then transition immediately into microwave RF.

### Terrain obstruction

> **THE HILL CONTINUES TO EXIST.**

Humor should support memory but never replace the real explanation.

---

# 4. DEVELOPMENT STRATEGY

Two computers run separate coding agents.

They work in parallel.

The project must therefore be designed around **stable contracts and strict ownership**.

Do not let both agents freely modify the entire codebase.

The collaboration architecture is:

```text
                  SHARED CONTRACTS
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼

 COMPUTER A                        COMPUTER B
 SIMULATION / DATA                 UI / 3D / LESSONS

 physics                           React
 link budget                       Three.js
 noise                             scenes
 propagation                       controls
 schemas                           mission UX
 tests                             explanations
 validation                        visuals

        │                               │
        └───────────────┬───────────────┘
                        │
                   INTEGRATION
```

The agents communicate through agreed TypeScript interfaces.

---

# 5. MACHINE OWNERSHIP

## COMPUTER A — ENGINE

Computer A owns:

```text
/packages/units
/packages/simulation
/packages/propagation
/packages/validation
/packages/contracts
```

It is responsible for:

* units
* dB/dBm conversions
* link-budget engine
* thermal noise
* receiver noise
* basic antenna models
* free-space propagation
* VHF terrestrial model
* simplified HF educational model
* limiting-factor ranking
* uncertainty
* tests
* reference validation
* simulation API

Computer A does **not** build UI.

---

## COMPUTER B — EXPERIENCE

Computer B owns:

```text
/apps/web
/packages/visualization
/packages/ui
/content
/packages/missions
```

It is responsible for:

* React application
* Three.js / React Three Fiber
* 3D scenes
* Earth scene
* terrain scene
* propagation animations
* controls
* Beginner / Advanced UI
* WHY view
* MATH view
* mission flow
* humor
* educational explanations
* local persistence
* offline assets
* graphics modes

Computer B does **not** calculate RF physics.

---

# 6. SHARED CONTRACT

This contract should be agreed before meaningful parallel work begins.

Neither agent should modify it casually.

Create:

```text
/packages/contracts
```

The minimum interface should resemble:

```ts
export type Difficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export interface GeoPosition {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeM: number;
}

export interface AntennaConfig {
  id: string;
  type:
    | "rubber-duck"
    | "vertical"
    | "dipole"
    | "yagi"
    | "dish"
    | "custom";

  gainDbi: number;
  heightM: number;

  polarization:
    | "vertical"
    | "horizontal"
    | "circular"
    | "unknown";
}

export interface FeedlineConfig {
  lengthM: number;
  lossDb: number;
}

export interface Scenario {
  schemaVersion: 1;

  id: string;
  title: string;

  difficulty: Difficulty;

  frequencyHz: number;
  modeId: string;

  transmitter: {
    position: GeoPosition;
    powerDbm: number;
    antenna: AntennaConfig;
    feedline: FeedlineConfig;
  };

  receiver: {
    position: GeoPosition;
    antenna: AntennaConfig;
    feedline: FeedlineConfig;

    bandwidthHz: number;
    noiseFigureDb: number;
  };

  environment: EnvironmentConfig;

  time: SimulationTime;
}
```

Result:

```ts
export interface CalculationNode {
  id: string;
  label: string;

  value: number;
  unit: string;

  equation?: string;

  assumptions?: string[];

  children?: CalculationNode[];
}
```

```ts
export interface LimitingFactor {
  id: string;

  label: string;

  impactDb: number;

  possibleImprovementDb: number;

  confidence: number;

  explanationKey: string;
}
```

```ts
export interface PropagationPath {
  type:
    | "direct"
    | "diffracted"
    | "skywave"
    | "groundwave";

  points: {
    lat?: number;
    lon?: number;
    altitudeM?: number;

    localX?: number;
    localY?: number;
    localZ?: number;
  }[];
}
```

```ts
export interface SimulationResult {
  schemaVersion: 1;

  receivedPowerDbm: number;

  noiseFloorDbm: number;

  snrDb: number;

  requiredSnrDb: number;

  linkMarginDb: number;

  probabilityOfSuccess?: number;

  success:
    | "good"
    | "marginal"
    | "failed";

  confidence: {
    level:
      | "high"
      | "medium"
      | "low";

    reasons: string[];
  };

  calculations: CalculationNode[];

  limitingFactors: LimitingFactor[];

  propagationPaths: PropagationPath[];

  warnings: string[];

  explanationKeys: string[];
}
```

---

# 7. SINGLE ENGINE ENTRY POINT

Computer A exposes one canonical function:

```ts
simulateScenario(
  scenario: Scenario
): SimulationResult
```

The UI must treat this as authoritative.

No RF math should be duplicated in React.

No UI component should calculate:

* FSPL
* SNR
* noise floor
* link margin
* antenna losses
* propagation losses

The UI renders the result.

---

# 8. MOCK ENGINE FOR COMPUTER B

Computer B should not wait for Computer A.

Immediately create:

```text
/packages/contracts/mockSimulation.ts
```

It returns deterministic fake-but-schema-correct results.

Example:

```ts
export function mockSimulation(
  scenario: Scenario
): SimulationResult {
  return {
    schemaVersion: 1,

    receivedPowerDbm: -108,
    noiseFloorDbm: -113,
    snrDb: 5,
    requiredSnrDb: 12,
    linkMarginDb: -7,

    success: "failed",

    confidence: {
      level: "high",
      reasons: [
        "Bundled deterministic scenario"
      ]
    },

    calculations: [],

    limitingFactors: [
      {
        id: "terrain",
        label: "Terrain obstruction",
        impactDb: -18,
        possibleImprovementDb: 15,
        confidence: 0.9,
        explanationKey:
          "terrain-obstruction"
      }
    ],

    propagationPaths: [],

    warnings: [],

    explanationKeys: [
      "terrain-obstruction"
    ]
  };
}
```

Computer B builds everything against the mock.

Later replace:

```ts
mockSimulation()
```

with:

```ts
simulateScenario()
```

If the integration requires major UI rewrites, the contract was insufficient.

---

# 9. BRANCH STRATEGY

Use one repository.

Suggested branches:

```text
main

engine
experience
integration
```

Computer A works mainly on:

```text
engine
```

Computer B works mainly on:

```text
experience
```

Use:

```text
integration
```

for deliberate merge checkpoints.

Do not continuously merge each other's incomplete work.

---

# 10. FILE OWNERSHIP

Avoid merge conflicts by assigning directories.

## Computer A may modify

```text
/packages/contracts
/packages/units
/packages/simulation
/packages/propagation
/validation
```

## Computer B may modify

```text
/apps/web
/packages/ui
/packages/visualization
/packages/missions
/content
```

## Shared files

Only modify during agreed integration windows:

```text
package.json
workspace config
tsconfig
vite config
CI config
README
```

---

# 11. CONTRACT CHANGE RULE

If either agent needs to modify:

```text
Scenario
SimulationResult
AntennaConfig
PropagationPath
```

it must:

1. create the proposed change
2. document why
3. update mock data
4. update engine tests
5. ensure UI compiles
6. merge only during integration

Do not casually change shared contracts.

---

# 12. PHASE 0 — BOOTSTRAP

Do this before splitting.

One person initializes:

```text
/apps/web
/packages/contracts
/packages/units
/packages/simulation
/packages/visualization
/packages/missions
/content
/validation
/demo
```

Install baseline stack:

```text
TypeScript
React
Vite
Three.js
React Three Fiber
Zustand
Vitest
```

Create:

```text
npm run dev
npm run build
npm run test
npm run test:physics
```

Both computers clone the same baseline commit.

Then branch.

---

# 13. COMPUTER A BUILD ORDER

## A1 — Units

Implement:

```text
W ↔ dBm
mW ↔ dBm
dB addition
Hz ↔ MHz
m ↔ km
```

Tests required.

---

## A2 — Free-Space Path Loss

Implement canonical FSPL.

Expose calculation provenance.

Result must include:

```text
frequency
distance
formula
path loss
units
```

---

## A3 — Link Budget

Implement:

```text
TX power
- TX cable loss
+ TX antenna gain

- propagation loss

+ RX antenna gain
- RX cable loss

= received power
```

---

## A4 — Noise

Implement thermal noise:

```text
kTB
```

plus receiver noise figure.

Return:

```text
noise floor
SNR
```

---

## A5 — Mode Profiles

Initial educational profiles:

```text
FM voice
SSB
CW
FT8
```

Each contains:

```text
bandwidth
approximate required SNR
citation/reference field
confidence
```

These are educational approximations.

---

## A6 — VHF Terrain Model

Hackathon version may use bundled terrain inputs.

Model:

```text
direct LOS
basic radio horizon
single obstruction
knife-edge approximation
```

Avoid building a global terrain service.

---

## A7 — Simplified HF Model

The hackathon HF engine should be intentionally educational.

Inputs:

```text
frequency
distance
time
F2 effective height
simplified MUF
simplified absorption
```

Outputs:

```text
works / marginal / fails

estimated hops

visualization path

explanation keys
```

It should support:

```text
frequency below useful range
usable frequency
frequency above MUF
```

It does not need to be professional HF prediction software.

---

## A8 — Limiting-Factor Ranking

Do not simply rank largest loss.

Estimate:

```text
potential improvement
```

Example:

```text
Terrain obstruction:
potential +15 dB

Power:
potential +10 dB

Cable:
potential +2 dB
```

Return actionable ranking.

---

## A9 — Validation

Required test cases:

```text
W ↔ dBm

FSPL

thermal noise

simple VHF link

blocked VHF link

working HF example

HF above modeled MUF
```

---

# 14. COMPUTER B BUILD ORDER

## B1 — Main Shell

Build:

```text
mission header

large 3D scene

configuration panel

results bar

WHY

MATH

SEND IT
```

Use mock results.

---

## B2 — Beginner Mode

Controls:

```text
Power:
Small
Normal
Big
Questionably Big

Antenna:
Handheld
Simple Wire
Directional

Height:
Low
Rooftop
Tower
```

Map these to real underlying values.

---

## B3 — Advanced Mode

Expose:

```text
frequency
power W/dBm
antenna gain
height
bandwidth
noise figure
feedline loss
polarization
```

Button:

**REVEAL NERD KNOBS**

---

## B4 — VHF Scene

Create:

```text
TX
terrain
obstacle
RX
```

Render:

```text
direct ray
blocked ray
diffracted path
```

Animate SEND IT.

---

## B5 — HF Scene

Create:

```text
Earth
TX
RX
simplified ionosphere shell
```

Render propagation path from `PropagationPath`.

Important:

Computer B should not independently calculate the HF ray.

It receives geometry from SimulationResult.

---

## B6 — Results

Display:

```text
RX power
noise
SNR
link margin
success
confidence
```

Status copy:

```text
SIGNAL MADE IT

MARGINAL

NOPE
```

---

## B7 — WHY

Use:

```text
explanationKey
```

to select educational copy.

Example:

```text
terrain-obstruction
```

returns:

> The ridge blocks the direct path. Your signal can still bend around the obstruction through diffraction, but the extra loss is large.

---

## B8 — MATH

Render calculation nodes.

Example:

```text
Free-space path loss

Formula:
...

Values:
...

Result:
112.6 dB
```

---

## B9 — Prediction Step

Before SEND IT:

```text
What do you think happens?

Strong
Marginal
Dead
```

Save the prediction.

After simulation:

show:

```text
Your prediction:
Dead

Result:
Marginal
```

---

## B10 — Local Persistence

Persist:

```text
active mission
difficulty
graphics mode
prediction
attempt count
saved experiment
```

No accounts.

---

## B11 — Graphics Modes

Implement:

```text
BIG
NORMAL
POTATO
```

POTATO reduces:

```text
particles
shadows
mesh subdivisions
atmosphere detail
animation density
```

Physics remains identical.

---

# 15. FIRST INTEGRATION CHECKPOINT

Integrate after:

Computer A has:

```text
units
FSPL
link budget
noise
```

Computer B has:

```text
main shell
mock engine
VHF scene
results panel
```

Replace the mock for a basic line-of-sight scenario.

Acceptance test:

> Changing transmitter power from 5 W to 50 W must update the displayed link by approximately +10 dB without any UI-side RF calculation.

If this works, parallel development continues.

---

# 16. SECOND INTEGRATION CHECKPOINT

Requirements:

Computer A:

```text
terrain loss
limiting factors
```

Computer B:

```text
WHY
MATH
prediction
```

Acceptance scenario:

```text
VHF link blocked by ridge
```

Student tries:

```text
5 W → 50 W
```

Improvement:

```text
≈ +10 dB
```

Then:

```text
height 2 m → 15 m
```

Improvement is greater.

WHY explains:

> Geometry was the primary problem.

---

# 17. THIRD INTEGRATION CHECKPOINT

Requirements:

Computer A:

```text
simplified HF model
```

Computer B:

```text
Earth
ionosphere
HF path animation
```

Acceptance scenario:

```text
working HF frequency
```

Then increase frequency.

Path changes.

Eventually above modeled MUF:

```text
skywave path no longer returns
```

Show:

> **THE IONOSPHERE HAS DECLINED YOUR REQUEST.**

---

# 18. HACKATHON CORE

The build is considered demo-ready when all of these work.

## Required

* [ ] web app starts cleanly
* [ ] no required cloud backend
* [ ] deterministic demo works offline
* [ ] VHF mission
* [ ] HF mission
* [ ] Beginner mode
* [ ] Advanced mode
* [ ] SEND IT animation
* [ ] RX power
* [ ] noise
* [ ] SNR
* [ ] link margin
* [ ] WHY
* [ ] MATH
* [ ] prediction step
* [ ] limiting-factor ranking
* [ ] POTATO mode
* [ ] reset demo
* [ ] unit tests
* [ ] simulation validation
* [ ] core humor/branding
* [ ] 30+ FPS on demo machine

Nothing else is required.

---

# 19. STRETCH ORDER

Only start Stretch after the above is stable.

Priority:

## Stretch 1

Microwave + Fresnel zone.

## Stretch 2

A/B comparison.

## Stretch 3

Basic custom wire antenna editor.

## Stretch 4

Crazy Lab.

## Stretch 5

Mastery indicator.

---

# 20. MICROWAVE STRETCH

First screen:

image of an actual microwave oven.

Text:

> **Wrong microwave.**

Then teach:

```text
2.4 GHz link

directional antennas

line of sight

Fresnel clearance
```

3D:

```text
TX ●──────( Fresnel zone )──────● RX
```

Allow obstacle to intersect zone.

Show:

```text
clearance
estimated excess loss
link margin
```

---

# 21. CUSTOM ANTENNA STRETCH

Beginner:

presets only.

Advanced:

simple 3D wire segments.

Allow:

```text
add point
add wire segment
move point
set feedpoint
set height
```

This should be sufficient to approximate bizarre configurations such as balcony loops.

Do not integrate NEC during hackathon.

Approximate educational output only.

---

# 22. CRAZY LAB

Two modes.

## REAL PHYSICS

Allow ridiculous values:

```text
100 MW
1 km antenna
20 km tower
500 m dish
```

Real formulas still apply.

## FANTASY PHYSICS

Allow:

```text
disable Earth curvature

disable free-space spreading

change speed of light

remove ionosphere
```

Clearly display:

> **FANTASY PHYSICS — NOT REAL**

---

# 23. AGENTIC FEATURE

If competing for the Agents API track, add the teaching agent only after the simulator works.

The agent does not calculate physics.

It receives tools such as:

```text
getScenario

simulateScenario

setFrequency

setPower

setAntennaHeight

setBandwidth

compareScenarios

getLimitingFactors

inspectCalculation

loadMission
```

The agent can:

1. observe the student setup
2. ask what they think will happen
3. run the simulation
4. inspect limiting factors
5. create a counterexample
6. guide the student toward a better experiment
7. explain the result

Pitch line:

> **The AI does not calculate the RF. It operates the laboratory.**

---

# 24. AGENT TEACHING EXAMPLE

Student:

> Why doesn't this work?

Agent calls:

```text
getLimitingFactors()
```

Result:

```text
terrain obstruction: potential improvement +16 dB

power increase: potential improvement +10 dB

feedline replacement: potential improvement +2 dB
```

Agent:

> You could add more power, but I think your bigger problem is geometry. Which would you like to test first: 10× more power or a higher antenna?

Student:

> More power.

Agent:

```text
setPower(50 W)

simulateScenario()
```

Then:

> That bought you 10 dB. Still marginal. Now try raising the antenna.

This is genuinely agentic and directly reinforces the educational mission.

---

# 25. GPT-LIVE STRETCH

If time remains, voice can control the same tools.

Example:

> “Make the antenna stupidly low.”

App:

```text
height → 0.5 m
```

User:

> “Why did it get so bad?”

Voice tutor:

> The ridge now blocks more of the useful path. You have once again attempted to solve geometry with optimism.

Voice is optional.

The app must remain fully functional without it.

---

# 26. EXPLANATION CONTENT

Explanation content belongs in:

```text
/content/explanations
```

Example:

```json
{
  "terrain-obstruction": {
    "beginner": "The hill is blocking much of your signal.",
    "intermediate": "The direct VHF path crosses terrain, adding diffraction loss.",
    "advanced": "The modeled obstruction produces approximately 18 dB of knife-edge diffraction loss."
  }
}
```

Physics engine returns:

```text
terrain-obstruction
```

The UI chooses the correct explanation based on difficulty.

This keeps educational copy out of physics code.

---

# 27. IMAGES AND VISUAL GAGS

Create:

```text
/content/images
```

Recommended assets:

```text
microwave-oven

sad-coax

angry-hill

giant-flashlight

tiny-satellite

noise-chaos

absurd-transmitter
```

Use:

* generated artwork
* public-domain assets
* compatible Creative Commons assets
* self-created graphics

Bundle assets locally.

Do not require remote image services during demo.

---

# 28. ACCESSIBILITY

3D may never be the only source of information.

Every important visual must also have:

```text
numeric result
text description
accessible control
```

Avoid:

```text
red = fail
green = success
```

without labels.

Use:

```text
FAIL
MARGINAL
GOOD
```

plus numbers.

---

# 29. PERFORMANCE

Targets:

```text
60 FPS ideal

30 FPS minimum

normal simulation < 100 ms

heavier solve < 500 ms where reasonable
```

Do not run physics calculations in the render loop.

Simulation runs when:

```text
SEND IT
```

or when a deliberate preview recalculation occurs.

---

# 30. DEMO RESILIENCE

Create:

```text
/demo
```

Containing:

```text
demo-scenario.json

expected-results.json

demo-script.md

backup-video.mp4
```

Before judging:

1. use actual presentation laptop
2. disable Wi-Fi
3. reload app
4. complete full demo
5. reset
6. repeat
7. test POTATO
8. test projector resolution
9. verify backup video

---

# 31. DEMO SCRIPT

## Opening

> Radio waves are invisible, which makes them extremely difficult to teach.

Show:

B I G S I G N A L.

> So we made them visible.

---

## Mission

> Our science team needs to communicate with a remote station.

Show VHF.

Press:

**SEND IT**

Link fails.

> We could add more power.

Increase:

```text
5 W → 50 W
```

Still weak.

Raise antenna.

Link succeeds.

> The problem wasn't really power. It was geometry.

---

## Cross-band

Switch to HF.

World changes.

Show ionosphere.

Press SEND IT.

Signal travels much farther.

Increase frequency beyond modeled usable range.

Signal escapes.

> Frequency doesn't just change one number. It changes the propagation problem.

---

## Technical proof

Open:

**MATH**

Show:

```text
link budget

noise

SNR

propagation loss

assumptions
```

> Every visual is backed by an inspectable calculation.

---

## Agent feature

Ask:

> Why is my link still bad?

Agent inspects simulator output.

Agent proposes an experiment.

> The AI is not inventing the physics. It operates the lab.

---

# 32. SUCCESS CRITERIA

## Product

A beginner can learn at least one genuine RF concept from experimentation.

## Engineering

All important numeric results are produced by the simulation package.

## Architecture

UI and simulation remain independently replaceable.

## Demo

A judge understands the central idea within two minutes.

## Engagement

The student wants to try something ridiculous after completing the intended experiment.

---

# 33. THE MOST IMPORTANT RULE

If time becomes limited:

Do not add more features.

Make the existing loop better:

```text
MISSION

→ PREDICT

→ CONFIGURE

→ SEND IT

→ WATCH

→ RESULT

→ WHY

→ MATH

→ CHANGE SOMETHING

→ SEND IT AGAIN
```

A polished version of that loop is the product.

Everything else is optional.

---

# 34. FINAL COLLABORATION RULE

Both agents should treat this sentence as law:

> **Computer A owns truth. Computer B owns experience. The contract between them belongs to both and changes only deliberately.**

That is what allows two machines to make meaningful progress in parallel without turning the last few hours of the hackathon into merge-conflict archaeology.
