import { expect, test } from "vitest";
import { exampleScenario } from "./exampleScenario";
import { mockSimulation } from "./mockSimulation";

test("mock is deterministic, internally consistent, and does not mutate the scenario", () => {
  const before = structuredClone(exampleScenario);
  const result = mockSimulation(exampleScenario);
  expect(result).toEqual(mockSimulation(exampleScenario));
  expect(exampleScenario).toEqual(before);
  expect(result.receivedPowerDbm - result.noiseFloorDbm).toBe(result.snrDb);
  expect(result.snrDb - result.requiredSnrDb).toBe(result.linkMarginDb);
  expect(result.warnings.join(" ")).toContain("MOCK RESULT");
  result.warnings.push("changed");
  expect(mockSimulation(exampleScenario).warnings).toHaveLength(1);
});
