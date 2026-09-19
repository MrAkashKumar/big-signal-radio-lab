# Backend contract integration

Computer A's backend extends the bootstrap version 1 types on `engine`. Merge these changes with Computer B deliberately. Computer A has not changed the live experience branch.

## Changes from the bootstrap

`Scenario.environment` is now a discriminated union. The existing `{ model: "free-space", temperatureK: 290 }` remains valid. `vhf-terrain` adds effective Earth radius and an optional single obstruction. `hf-skywave` adds explicit shell, critical-frequency, absorption, ground-reflection, and hop-limit inputs. Read `index.ts` for required fields or load a complete bundled example.

`externalNoiseDb` is an optional increase in antenna thermal-noise power relative to the configured ambient temperature. It is not added directly to the final receiver noise floor. The engine accounts for receiver cable attenuation and cable thermal emission.

`SimulationResult.propagationAvailable` is required. The bundled mock has been updated. If Computer B created another mock, add this field.

When `propagationAvailable` is false, numeric results describe the hypothetical candidate route. Display the warning and failed status. Do not display a positive margin as successful reception. An above-MUF result includes an escaping ray for animation.

`PropagationPath` keeps the existing shape. Production output uses `lat`, `lon`, and `altitudeM`. Coordinates are degrees and meters above mean sea level. Endpoint altitudes already include antenna height. Do not add antenna height twice.

## Integration checks

1. Merge the backend commit and resolve shared contract changes explicitly.
2. Replace `mockSimulation` with `simulateScenario` from `@bigsignal/simulation`.
3. Use `loadExampleScenario` from `@bigsignal/simulation/examples` for complete inputs.
4. Render calculation trees, warnings, status, and returned paths. Do not calculate RF values in the experience.
5. Catch `ScenarioValidationError` and show its `issues` as field errors.
6. Run `bun install --frozen-lockfile`, `bun run test`, and `bun run build` against the merged UI.
7. Exercise ridge power/height changes and HF day/night/above-MUF paths in Chrome.

See [the backend guide](../simulation/README.md) and [the exported scenarios](../../validation/fixtures/demo-scenarios.json).
