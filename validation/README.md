# Simulation validation

Run `bun run test:physics` for units, propagation, mode profiles, scenario validation, complete engine cases, and numerical stress tests. Run `bun run test` to include contract/mock tests.

## Evidence layers

- `fixtures/free-space-reference.json` contains 12 independently calculated HF, VHF, UHF, microwave, space-distance, and extreme-power budgets. `generate_reference_cases.py` uses 60-digit decimal linear-power arithmetic and exact SI constants, without importing production code. Recheck with `python3 validation/generate_reference_cases.py --check`.
- `reference-cases.test.ts` compares FSPL, received power, and noise against those independent values with a 1e-9 dB numerical tolerance. These are free-space reference budgets, not skywave forecasts.
- `numerical-stress.test.ts` checks round trips, scaling, reciprocity, extreme finite inputs, gain/loss signs, receiver noise temperature, and nonfinite inputs.
- `scenario-engine.test.ts` exercises the public adapter, VHF recovery, HF availability, absorption, multiple hops, FT8 bandwidth conventions, polarization, cable thermal noise, and mutation safety.
- `globe-stress.test.ts` checks poles, the antimeridian, antipodes, HF ray lengths, Earth intersections, and the difference between Fresnel loss and an obstructed direct ray.
- `fixtures/demo-scenarios.json` and `fixtures/demo-results.json` are integration fixtures generated from the engine. They are regression/handoff artifacts, not independent proof of the physics. Recheck with `bun run validation/export-demo-fixtures.ts --check`.

Run `bun run validation/benchmark.ts` for a local timing sample of 100 solves per example after warmup. Timings include counterfactual ranking. They do not measure browser rendering or guarantee frame rate on another machine.

## Demonstrations

The ridge fixture deliberately uses inefficient antennas and strong configured external noise. It is a controlled teaching example, not measured field data. At 5 W it fails. At 50 W it is marginal. Raising the transmitter from 2 m to 15 m succeeds and improves the margin more than the power increase.

The HF presets cover a working daytime circuit, the same circuit at night, an escaping above-MUF ray, strong low-frequency absorption, three-hop propagation, and FT8. A missing path always produces failed status. Its numeric budget remains a labeled hypothetical calculation, never evidence of reception.

See [the backend API guide](../packages/simulation/README.md) for input ranges, thresholds, geometry, and limitations. The required backend A1–A9 is implemented. Computer B's UI integration remains a separate checkpoint.

## References and physical limits

Free-space spreading follows [ITU-R P.525](https://www.itu.int/rec/R-REC-P.525-5-202411-I/en). Diffraction follows the single-edge approximation in [ITU-R P.526-16](https://www.itu.int/dms_pubrec/itu-r/rec/p/R-REC-P.526-16-202511-I!!PDF-E.pdf). Fresnel radius and effective-Earth geometry assume a single obstruction; they do not replace a full terrain model.

Speed of light and Boltzmann's constant use [exact SI values from NIST](https://www.nist.gov/pml/special-publication-330/sp-330-section-2). Receiver noise uses equivalent temperature at a 290 K noise-figure reference. The receive cable attenuates antenna noise and contributes its own ambient thermal noise, consistent with [McMaster antenna-noise notes](https://www.ece.mcmaster.ca/faculty/nikolova/antenna_dload/current_lectures/L07_Noise.pdf).

The [WSJT-X guide](https://wsjt.sourceforge.io/wsjtx-main_en.html) supplies the FT8 approximate threshold and 2500 Hz SNR reference. FM, SSB, and CW thresholds are documented educational choices, not certified receiver sensitivities.

HF behavior follows the concepts in the [Australian SWS introduction](https://www.sws.bom.gov.au/Educational/5/2/2). The spherical shell, cosine daylight interpolation, and inverse-square absorption are deliberately simplified. This implementation does not claim ITU-R P.533 accuracy, real weather prediction, real-world link availability, or measured decoder success.
