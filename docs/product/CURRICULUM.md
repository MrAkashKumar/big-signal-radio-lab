# Curriculum and model coverage

The course contains 10 beginner, 8 intermediate, and 14 advanced lessons. Each lesson has a prediction, a guided experiment, an observation, an explanation, a misconception, and a transfer question. Lessons take approximately 3–8 minutes. Each tier has an independent entry point and sequential prerequisites.

The lesson registry is `content/lessons.ts`. `getLessonScenario` clones a valid engine fixture and applies the lesson's declared inputs. The interface exposes each lesson's allowed controls. The separate workbench contains analytical impedance, receiver gain, cable, wavelength, and schematic antenna-pattern tools. Its wire editor saves geometry without deriving impedance or gain.

| Tier | Lesson ID | Experiment and boundary |
| --- | --- | --- |
| Beginner | `what-is-radio` | First usable direct link. No Internet dependency in the modeled route. |
| Beginner | `bigger-signal` | Compare 0.1, 1, 10, and 100 W with fixed geometry. |
| Beginner | `distance-is-rude` | Double equatorial separation with RX longitudes 0.040, 0.080, and 0.160 degrees in free space. |
| Beginner | `antenna-sticks` | Compare supplied preset gains and polarization. Pattern shapes are schematic. |
| Beginner | `hill-exists` | Compare 5 W at 2 m, 50 W at 2 m, and 5 W at 15 m in the selected ridge fixture. |
| Beginner | `noise-too` | Compare gain in the receiver bench, then filter bandwidth and normalized thresholds. |
| Beginner | `wrong-microwave` | Oven illustration introduces a 2.4 GHz directional link and Fresnel clearance. No dish pointing-error or weather model. |
| Beginner | `sky-bounce` | Compare 7 and 14 MHz with daytime and nighttime synthetic ionospheres. |
| Beginner | `sky-declined` | Raise 14 MHz to 30 MHz and distinguish missing skywave from a hypothetical positive budget. |
| Beginner | `mode-matters` | Compare FM, SSB, CW, and FT8 thresholds and their information requirements. |
| Intermediate | `db-intuition` | Compare 1, 2, and 10 W and offset power gain with cable loss. |
| Intermediate | `link-budget` | Trace the complete budget and change RX cable loss from 1 to 3 dB under room-temperature external noise. |
| Intermediate | `feedline` | Compare explicit cable loss and the workbench's length/frequency approximation. No manufacturer-specific cable model. |
| Intermediate | `polarization` | Compare matched, crossed, and circular-to-linear polarization. Real multipath remains outside the model. |
| Intermediate | `diffraction` | Vary antenna height and one ridge height. No multiple-ridge terrain solve. |
| Intermediate | `fresnel` | Compare first-zone size at 145 and 2400 MHz with fixed entered gains. Change obstruction height. |
| Intermediate | `receiver-noise` | Compare 500 and 1000 Hz CW noise bandwidth, then reduce noise figure. |
| Intermediate | `system-design` | Target 10 dB margin within 5 W and 15 m, with multiple valid designs. |
| Advanced | `impedance` | Impedance bench computes reflection from supplied resistance, reactance, and reference impedance. Not coupled automatically to the link. |
| Advanced | `resonance` | Compare wavelength estimates and resonant resistive loads. Wire dimensions do not produce a resonance solve. |
| Advanced | `swr-return-loss` | Bench derives SWR, reflected power, return loss, and mismatch loss, including limiting cases. |
| Advanced | `radiation-efficiency` | Compare supplied radiation resistance at fixed total resistance. No efficiency solve from arbitrary wire geometry. |
| Advanced | `smith-chart` | Conceptual chart interpretation supported by calculated complex reflection. No matching-network synthesis. |
| Advanced | `height-ground` | Model geometric clearance; distinguish it from conceptual ground-dependent lobes and conductivity. |
| Advanced | `sensitivity` | Inspect receiver noise and mode-specific sensitivity. Arbitrary cascaded receiver stages are conceptual. |
| Advanced | `receiver-overload` | Calculate gain, additive noise, blocker power, and headroom. AGC timing, nonlinear intermodulation spectra, and ADC waveforms are conceptual. |
| Advanced | `multihop-nvis` | Simulate simplified multiple hops and compare a short steep path. Real NVIS coverage and antenna elevation patterns are conceptual. |
| Advanced | `other-propagation` | Inspect the selected engine model and identify inputs absent from ground-wave and sporadic-E prediction. Both mechanisms are conceptual. |
| Advanced | `multipath-fading` | Use a static link as a reference for conceptual phase cancellation, fading, and diversity. No stochastic fading process. |
| Advanced | `doppler` | Compare filter widths and reason about radial velocity. No moving-platform Doppler is applied to results. |
| Advanced | `satellite` | Transfer free-space budget principles to conceptual uplink and downlink diagrams. No orbit, transponder, or service-coverage model. |
| Advanced | `model-validity` | Compare plausible noise and ridge-height inputs. No calibrated delivery probability or operational coverage certification. |

`simulationStatus: conceptual` means that the named concept requires the separate analytical bench or a conceptual exercise. These lessons also use a related base-link experiment. `modelNote` states the boundary in the lesson interface. A successful base link does not establish that an unmodeled mechanism was simulated.

## Evidence and classroom files

`ENCOUNTERED` records a prediction or simulation attempt. `DEMONSTRATED` requires at least one attempt and a correct transfer answer. `APPLIED` additionally requires a successful real-physics link after a physical configuration change from the learner's saved guided-design snapshot. Replaying the guided solution, renaming an experiment, changing unsolved antenna labels, or editing an unused cable length does not qualify.

`.bigsignal.json` files carry the scenario, presentation settings, lesson metadata, teacher objectives and constraints, and any fantasy-physics settings. Import validation checks version, field types, numerical bounds, and the engine scenario. It preserves fantasy assumptions rather than silently interpreting the result as real physics.

Narrowing receiver bandwidth reduces collected noise. The engine also converts required SNR to the new bandwidth reference, so filter width alone does not grant free link margin. A filter below the mode's minimum bandwidth is unsupported.

The six fictional disaster exercises describe what happened, failed infrastructure, participants, essential information, constraints, and why an independent radio route helps. They cover Internet failure, cellular overload, battery endurance, a terrain relay, regional HF, and a multi-station network. They separate physical feasibility from operator permissions and do not claim to certify an operational emergency plan.

## Verification and sources

`bunx vitest run packages/missions/product.test.ts` checks all lesson fixtures, prediction and transfer answers, progression, advanced-topic coverage, the ridge and HF demonstrations, normalized bandwidth behavior, applied-design evidence, and portable-file validation. The interface audit also reads `LabControls.tsx`, `AdvancedLab.tsx`, and `LabWorkspace.tsx` to ensure that named controls exist. Full product browser checks cover the rendered interactions separately.

Primary references support the teaching context. They do not validate every configured educational threshold.

- [ITU emergency telecommunications](https://www.itu.int/en/mediacentre/backgrounders/Pages/emergency-telecommunications.aspx) describes resilient communications, infrastructure disruption, trained operators, and complementary radio systems.
- [NOAA HF radio communications](https://www.spaceweather.gov/impacts/hf-radio-communications) describes how ionospheric conditions alter and interrupt HF paths.
- `packages/simulation/src/modes.ts` records source references and confidence for each approximate mode threshold.
- `packages/simulation/README.md` and `packages/simulation/MODEL_COVERAGE.md` document engine assumptions and numerical coverage.
