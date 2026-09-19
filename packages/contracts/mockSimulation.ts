import type { Scenario, SimulationResult } from "./index";

export function mockSimulation(_scenario: Scenario): SimulationResult {
  return {
    schemaVersion: 1,
    propagationAvailable: true,
    receivedPowerDbm: -108,
    noiseFloorDbm: -113,
    snrDb: 5,
    requiredSnrDb: 12,
    linkMarginDb: -7,
    success: "failed",
    confidence: { level: "low", reasons: ["UI fixture only. No physics calculated."] },
    calculations: [],
    limitingFactors: [{ id: "terrain", label: "Terrain obstruction", impactDb: -18,
      possibleImprovementDb: 15, confidence: 0.9, explanationKey: "terrain-obstruction" }],
    propagationPaths: [],
    warnings: ["MOCK RESULT. Values are fixed for UI development."],
    explanationKeys: ["terrain-obstruction"],
  };
}
