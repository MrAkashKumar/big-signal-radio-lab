# Computer A backend reference

`@bigsignal/simulation` supplies the deterministic RF engine for Computer B's globe and result panels. The core A1 through A9 scope is implemented. The engine runs locally without a server, network requests, credentials, or a database.

This handoff belongs to the `engine` branch. Computer B's concurrent `experience` work has not been integrated. Computer A's backend work does not change the UI. The integration agent can record the exact checkout with `git rev-parse HEAD` and follow [CONTRIBUTING.md](../../CONTRIBUTING.md) for the merge checkpoint.

## Package API

```ts
import {
	simulateScenario,
	validateScenario,
	ScenarioValidationError,
	MODE_PROFILES,
	type Scenario,
	type SimulationResult,
} from '@bigsignal/simulation';
import { loadExampleScenario, scenarioIds } from '@bigsignal/simulation/examples';

const scenario: Scenario = loadExampleScenario('hf-day');
const result: SimulationResult = simulateScenario(scenario);

function simulateImportedJson(input: unknown): SimulationResult {
	try {
		return simulateScenario(validateScenario(input));
	} catch (error) {
		if (error instanceof ScenarioValidationError) {
			console.error(error.issues);
		}
		throw error;
	}
}
```

`simulateScenario(scenario: Scenario): SimulationResult` validates its input before calculation and does not mutate it. `validateScenario(input: unknown): Scenario` returns a new object containing supported fields. Invalid inputs throw `ScenarioValidationError`, whose `issues: string[]` describes the invalid fields. Invalid inputs do not return a failed radio link.

`scenarioIds` is a frozen array. `loadExampleScenario(id)` returns a fresh mutable copy and throws `RangeError` for unknown IDs. `requiredSnrForBandwidth` is also exported. Low-level `freeSpacePathLossDb`, `receivedPowerDbm`, and `thermalNoiseDbm` are available through `@bigsignal/simulation/physics`.

## Input requirements

The contract is schema version 1. The authoritative types are in [packages/contracts/index.ts](../contracts/index.ts). The exact bounds and required nested fields are in [validateScenario.ts](src/validateScenario.ts).

- Frequency uses Hz. Power uses dBm. Gain uses dBi. Feedline loss uses nonnegative dB.
- Position uses latitude and longitude in degrees. Position altitude is meters above mean sea level. Antenna height is meters above that position.
- Antenna tips must be at least 1 meter apart. A terrain obstruction must be at least 1 meter from each endpoint along the surface.
- Time is a valid UTC calendar timestamp ending in `Z`, such as `2026-09-13T11:20:00.000Z`.
- `modeId` must be `fm-voice`, `ssb`, `cw`, or `ft8`.
- Every environment requires `temperatureK`. Optional `externalNoiseDb` defaults to zero and describes antenna noise above that ambient temperature.
- Authored band defaults use median outdoor man-made noise factors from [ITU-R P.372-17](https://www.itu.int/rec/R-REC-P.372-17-202408-I/en), referenced to 290 K. The quiet-rural HF model is `Fa = 53.6 - 28.6 log10(f_MHz)` over 0.3 to 30 MHz. The application uses 29.43 dB at 7 MHz, a published rural 6 dB value near 140 MHz for the 146 MHz VHF preset, and the 0 dB thermal baseline at 433 MHz and 2.4 GHz.
- Noise factor is highly location, season, time, and percentile dependent. These are teaching defaults, not live measurements. Explicit band and propagation-model switches load the matching preset. Ordinary frequency and noise edits remain independent. `simulateScenario` never chooses or infers a band-noise default.
- `vhf-ridge` deliberately retains a 47 dB adverse local-interference override so the recovery lesson still fails before the learner changes the setup. That value is not presented as average VHF background noise.
- `free-space` needs no additional environment fields.
- `vhf-terrain` requires `effectiveEarthRadiusFactor` within 1 to 2. Its optional obstruction uses an interior path `fraction` and an altitude in meters above mean sea level.
- `hf-skywave` accepts 1 to 30 MHz. It requires shell height, day and night critical frequencies, day and night absorption at 10 MHz, ground reflection loss, and integer `maxHops`. The presets supply these fields.

## Result semantics

`receivedPowerDbm`, `noiseFloorDbm`, `snrDb`, `requiredSnrDb`, and `linkMarginDb` share the same receiver budget. `calculations` contains numeric values, units, formulas, and assumptions. `warnings`, `confidence`, and `explanationKeys` carry model limitations and teaching hooks. Educational text belongs in Computer B's `content/explanations`.

| Condition | `success` |
| --- | --- |
| No supported path, receiver bandwidth below the mode minimum, or margin below 0 dB | `failed` |
| Supported path, sufficient bandwidth, and margin from 0 dB to below 6 dB | `marginal` |
| Supported path, sufficient bandwidth, and margin at least 6 dB | `good` |

When `propagationAvailable` is false, numeric power, SNR, and margin describe a hypothetical candidate route. They do not predict reception. An above-MUF HF result can still include an escaping ray for the globe. The UI renders that supplied ray and uses `success` plus `propagationAvailable` for reception state. Positive margin alone does not establish a working link.

`limitingFactors` ranks simulated counterfactual changes by `possibleImprovementDb`. Ordinary entries have positive potential improvement and negative `impactDb`. A change that repairs path availability or minimum bandwidth has both values set to zero because its effect cannot be represented as a reliable dB gain. Its label and explanation key identify the repair. Such a repair does not guarantee enough margin for reception.

## Globe coordinates

The engine uses a spherical Earth with radius `6_371_000` meters. Geographic path points use `lat`, `lon`, and `altitudeM`. Endpoint altitude already includes antenna height. Adding antenna height again moves the endpoint incorrectly.

For latitude `lat` and longitude `lon` converted to radians, the geographic Cartesian convention is:

```text
r = 6_371_000 + altitudeM
X = r * cos(lat) * cos(lon)
Y = r * cos(lat) * sin(lon)
Z = r * sin(lat)
```

The north pole is positive Z. A renderer with a different up axis applies one consistent axis transform to the globe and every path. Render scale may change all lengths uniformly.

Free-space paths contain endpoint chords. VHF paths contain sampled effective-Earth rays, with obstruction vertices for diffraction. HF paths contain shell and ground vertices joined by straight Cartesian chord segments. A decorative spline or arbitrary altitude lift would change the depicted RF geometry. Great-circle interpolation handles the antimeridian and chooses a deterministic plane for antipodal endpoints.

The engine runs on SEND IT or a deliberate preview update. React and globe animation do not calculate RF loss, MUF, noise, margin, or rankings.

## Model assumptions

- Free space uses isotropic far-field spreading with configured antenna gains. It ignores Earth and terrain blockage, including chords through Earth.
- VHF uses an effective-Earth horizon and at most one knife edge. It does not model terrain profiles, foliage, reflections, weather, smooth-Earth diffraction, or troposcatter. Beyond-horizon paths are unavailable.
- HF uses one effective spherical shell and equal hop spacing. MUF and hop feasibility use sea-level endpoint geometry. Ray length includes the supplied endpoint heights. Local midpoint solar hour drives a cosine daylight factor, independent of season and latitude.
- HF absorption scales with inverse frequency squared and hop count. Intermediate ground contacts add the configured reflection loss. There are no live ionosonde data, solar-cycle forecasts, fading, magnetoionic effects, or operational propagation guarantees.
- Antenna gain is a supplied scalar. Antenna type and feedline length are descriptive inputs. The engine does not solve antenna shape, orientation, resonant gain, or cable loss from length.
- Matching known polarizations incur no fixed loss. Linear-to-circular mismatch incurs about 3.01 dB. Crossed linear polarizations use a 30 dB educational cap. Unknown polarization assumes a match. HF applies no fixed polarization penalty because rotation is unresolved. Circular handedness is absent.
- Antenna noise temperature is `temperatureK * 10^(externalNoiseDb/10)`. The RX cable attenuates that noise and contributes thermal noise at `temperatureK`. Receiver noise figure uses a 290 K reference. Antenna loss temperature and impedance mismatch are unresolved.
- Mode thresholds are approximate. `MODE_PROFILES` supplies the reference and confidence for each mode. Required SNR changes by `10 log10(referenceBandwidthHz / receiverBandwidthHz)`. This bandwidth normalization prevents a fictitious margin gain from narrowing the measurement bandwidth. Filters below the mode minimum fail even if the numeric margin is positive.

| Mode | Reference SNR | Reference bandwidth | Minimum receiver bandwidth |
| --- | --- | --- | --- |
| FM voice | 12 dB | 12,500 Hz | 12,500 Hz |
| SSB | 10 dB | 2,400 Hz | 2,400 Hz |
| CW | 3 dB | 500 Hz | 250 Hz |
| FT8 | -21 dB | 2,500 Hz | 50 Hz |

FM's threshold is educational input SNR, not a conversion from a 12 dB SINAD specification. No mode profile guarantees decoding or intelligibility.

## Bundled presets and fixtures

| ID | Purpose |
| --- | --- |
| `vhf-clear` | VHF line of sight |
| `vhf-ridge` | Single ridge and a noisy receiver |
| `vhf-ridge-power` | Ridge with tenfold TX power |
| `vhf-ridge-height` | Ridge with a 15 m TX antenna |
| `vhf-horizon` | Beyond the modeled radio horizon |
| `hf-day` | Daytime skywave |
| `hf-night` | Same circuit at night |
| `hf-above-muf` | Escaping HF ray |
| `hf-absorption` | Low-frequency daytime absorption |
| `hf-multihop` | Multiple skywave hops |
| `hf-ft8` | Weak-signal FT8 budget |
| `microwave-clear` | 2.4 GHz directional link with an obstruction |

`validation/fixtures/demo-scenarios.json` and `validation/fixtures/demo-results.json` contain objects keyed by these IDs. The export command regenerates them from current code. `--check` verifies that they match the engine. They let Computer B inspect deterministic inputs and outputs before the integration checkpoint.

## Repository commands

The following commands run from the repository root with Bun:

```sh
bun install --frozen-lockfile
bun run packages/simulation/src/cli.ts --list
bun run packages/simulation/src/cli.ts --example hf-day
bun run packages/simulation/src/cli.ts --input scenario.json
bun run validation/export-demo-fixtures.ts
bun run validation/export-demo-fixtures.ts --check
bun run test:physics
bun run test
bun run build
git rev-parse HEAD
```

The CLI prints JSON results to stdout. Errors use JSON on stderr and exit code 1. A JSON file with invalid scenario fields includes an `issues` array.

Core scope covers units, FSPL, link budgets, noise, mode profiles, terrain, simplified HF, counterfactual ranking, and validation. Tutor agents, cloud services, voice, custom NEC antenna solving, and Computer B's globe UI are outside this backend implementation.

## Run the backend test viewer

```sh
bunx vite packages/simulation/playground --host 127.0.0.1 --port 5174 --strictPort
```

Open `http://127.0.0.1:5174` for scenario controls, live engine results, and a 3D globe/path preview. This is an isolated backend test viewer. Computer B's final globe UI remains in `apps/web`.

See [model coverage](MODEL_COVERAGE.md) for the distinction between implemented terrain/ionospheric approximations and missing buildings, multipath, and space-weather effects.

## Product laboratory models

The additive `laboratory` and `network` exports preserve the version 1 `Scenario` and `SimulationResult` contracts. `simulateScenario` remains authoritative. `simulateLaboratory` passes explicit real/fantasy settings into that same calculation path. Pure laboratory helpers return their equations, units and assumptions alongside results.

- `estimateBattery` computes electrical transmit draw from RF output and amplifier efficiency, then averages mutually exclusive transmit, receive and idle states. Capacity in Wh times the usable fraction divided by average watts gives hours. A null runtime means zero modeled draw. This constant-load estimate omits battery aging, chemistry, discharge curves and temperature.
- `analyzeImpedance` accepts a passive complex load and a real positive reference impedance. It returns complex reflection coefficient, SWR, return loss, mismatch loss and radiation efficiency from an explicitly supplied resistance decomposition. Null represents unbounded SWR/mismatch loss at total reflection or unbounded return loss at a perfect match. The relationships follow [Analog Devices' wave-reflection explanation](https://www.analog.com/en/resources/analog-dialogue/raqs/raq-issue-197.html). Geometry does not imply impedance.
- `analyzeReceiver` is a linear stage with input-referred additive noise at 290 K. It sums signal, noise and an optional blocker in linear power before comparing the total against a configured overload threshold. Above that threshold the linear output numbers are hypothetical; distortion, AGC and intermodulation are not solved.
- `antennaDimensions` returns wavelength, quarter/half-wave lengths and a 0.95-shortened dipole starting estimate. `analyticalPatternPoints` produces normalized schematic field envelopes (`sin(theta)` for broad presets and forward `cos(theta)^n` lobes for directional presets). These shapes do not solve gain, ground interaction, custom-wire resonance or impedance. Custom geometry remains a drawing, never a NEC result.
- `estimateFeedline` uses a stated conductor-loss approximation proportional to length and square root of frequency. It is not a substitute for manufacturer cable data and omits dielectric loss and mismatch.
- `fresnelProfile` returns first-zone radius versus path fraction using `sqrt(lambda*d1*d2/(d1+d2))`. This follows the Fresnel geometry discussed by [ITU-R P.526](https://www.itu.int/rec/r-rec-p.526/en), with the same small-angle approximation as the existing single-edge model.

`PhysicsSettings` is a discriminated union. Real mode retains every ordinary engine calculation and accepts the existing limits up to 110 dBm (100 MW) and 20 km antenna height. Extreme inputs do not make the simplified far-field and terrestrial models engineering-grade. Fantasy mode always adds a visible warning. Disabling spreading sets only the free-space term to zero, which violates energy conservation. Altering wave speed changes spreading, wavelength, Fresnel diffraction and travel time. HF critical frequency remains a configured phenomenological input. Removing the ionosphere eliminates the skywave route. Disabling curvature applies only to the terrestrial horizon, bulge and sampled ray; other model choices explicitly report that the switch is inapplicable.

## Network and resilience boundary

`createDisasterNetwork` supplies six deterministic educational networks. `simulateNetwork` validates every node, including isolated nodes, and computes each requested edge in both directions. Reverse traversal mirrors the obstruction fraction. Both margins must meet the configured target, both modeled routes must exist, and the selected communication requirement must be supported before an edge contributes to connectivity.

Coverage is the fraction of other stations reachable from the selected coordination node. Bridge edges identify single-link failures that disconnect a component. Full redundancy means all nodes are connected and no single edge failure disconnects them. This does not promise survival of node failures, shared obstructions or correlated weather. Duplicate station pairs are rejected so two entries for the same physical connection cannot manufacture redundancy.

Energy uses each station's entered duty cycles, independent of the topology. Relays require the learner to include forwarding airtime; the engine does not invent a traffic load, schedule channels, predict throughput, resolve duplexing, or estimate statistical reliability. Runtime and coverage are separate components, so an empty battery fails endurance even when the hypothetical RF geometry connects.

Mode support is explicit. FM and SSB can carry voice, all current profiles can represent brief status communication, CW represents operator Morse text, and FT8 means its constrained contact/status exchange only. None of the implemented profiles carries arbitrary image/video traffic. This is a statement about the available simulated waveforms, not a claim that a frequency band can never carry those services.
