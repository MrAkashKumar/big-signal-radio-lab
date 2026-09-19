import { describe, expect, it } from "vitest";
import { loadExampleScenario } from "@bigsignal/simulation/examples";
import { simulateScenario } from "@bigsignal/simulation";
import { terrainProjection } from "./terrainProjection";

describe("terrain projection of engine paths", () => {
  it.each(["vhf-clear", "vhf-ridge", "vhf-ridge-height"])(
    "aligns %s paths with antenna tips",
    (id) => {
      const scenario = loadExampleScenario(id);
      const projection = terrainProjection(scenario);
      const points = simulateScenario(scenario).propagationPaths[0].points;
      for (const [i, p] of [points[0], points.at(-1)!].entries()) {
        const rendered = projection.point(p)!;
        expect(rendered[0]).toBeCloseTo(projection.stations[i].x);
        expect(rendered[1]).toBeCloseTo(projection.stations[i].tip);
      }
      expect(
        points.every((p) => projection.point(p)?.every(Number.isFinite)),
      ).toBe(true);
    },
  );
  it("aligns the diffracted path with the illustrated ridge", () => {
    const scenario = loadExampleScenario("vhf-ridge");
    const projection = terrainProjection(scenario);
    const points = simulateScenario(scenario).propagationPaths[0].points;
    const peak = projection.point(points[32])!;
    expect(peak[0]).toBeCloseTo(0);
    expect(peak[1]).toBeCloseTo(projection.ground(0));
  });
  it("keeps vertical links finite and aligned when a height suggestion would collapse the antennas", () => {
    const scenario = loadExampleScenario("vhf-clear");
    scenario.receiver.position = { ...scenario.transmitter.position };
    scenario.transmitter.antenna.heightM = 3;
    scenario.receiver.antenna.heightM = 5;
    const result = simulateScenario(scenario);
    expect(Number.isFinite(result.receivedPowerDbm)).toBe(true);
    expect(
      result.limitingFactors.some((factor) => factor.id === "height"),
    ).toBe(false);
    const projection = terrainProjection(scenario);
    const points = result.propagationPaths[0].points;
    for (const [i, p] of [points[0], points.at(-1)!].entries()) {
      const rendered = projection.point(p)!;
      expect(rendered[0]).toBe(projection.stations[i].x);
      expect(rendered[1]).toBeCloseTo(projection.stations[i].tip);
    }
  });
  it("moves the transmitter marker when its height changes", () => {
    const low = terrainProjection(loadExampleScenario("vhf-ridge"));
    const high = terrainProjection(loadExampleScenario("vhf-ridge-height"));
    expect(high.stations[0].tip).toBeGreaterThan(low.stations[0].tip);
    expect(high.ground(0)).toEqual(low.ground(0));
  });
});
