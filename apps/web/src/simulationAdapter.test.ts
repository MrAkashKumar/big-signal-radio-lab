import { describe, expect, it } from "vitest";
import { exampleScenario } from "../../../packages/contracts/exampleScenario";
import { explanations } from "../../../content/explanations";
import { createMission, defaultSettings, parseSettings } from "./missions";
import { runSimulation } from "./simulationAdapter";

describe("experience engine integration", () => {
  it("returns independent calculations without changing mission inputs", () => {
    const scenario = createMission("VHF");
    const before = structuredClone(scenario);
    const result = runSimulation(scenario);
    expect(scenario).toEqual(before);
    expect(result.calculations.find((node) => node.id === "link-budget")?.value).toBe(result.receivedPowerDbm);
    result.calculations.length = 0;
    result.propagationPaths.length = 0;
    expect(runSimulation(scenario).calculations.length).toBeGreaterThan(0);
    expect(runSimulation(scenario).propagationPaths.length).toBeGreaterThan(0);
  });

  it("runs the ridge power and height recovery loop", () => {
    const scenario = createMission("VHF");
    const before = structuredClone(scenario);
    const low = runSimulation(scenario);
    scenario.transmitter.powerDbm += 10;
    const power = runSimulation(scenario);
    scenario.transmitter.powerDbm = before.transmitter.powerDbm;
    scenario.transmitter.antenna.heightM = 15;
    const height = runSimulation(scenario);
    expect(low.success).toBe("failed");
    expect(power.success).toBe("marginal");
    expect(height.success).toBe("good");
    expect(power.receivedPowerDbm - low.receivedPowerDbm).toBeCloseTo(10, 10);
    expect(height.linkMarginDb - low.linkMarginDb).toBeGreaterThan(10);
    expect(low.propagationPaths[0].type).toBe("diffracted");
    expect(height.propagationPaths[0].type).toBe("direct");
    expect(createMission("VHF")).toEqual(before);
  });

  it("returns HF to Tokyo at 14 MHz and an escaping ray at 30 MHz", () => {
    const scenario = createMission("HF");
    const usable = runSimulation(scenario);
    expect(usable.success).toBe("good");
    expect(usable.propagationAvailable).toBe(true);
    expect(usable.propagationPaths[0].points.at(-1)).toEqual({
      lat: scenario.receiver.position.latitudeDeg,
      lon: scenario.receiver.position.longitudeDeg,
      altitudeM: scenario.receiver.position.altitudeM + scenario.receiver.antenna.heightM,
    });
    scenario.frequencyHz = 30e6;
    const escaped = runSimulation(scenario);
    expect(escaped.success).toBe("failed");
    expect(escaped.propagationAvailable).toBe(false);
    expect(escaped.linkMarginDb).toBeGreaterThan(0);
    expect(escaped.explanationKeys).toContain("hf-above-muf");
    expect(escaped.propagationPaths[0].points.at(-1)!.altitudeM).toBeGreaterThan(300000);
    expect(escaped.limitingFactors.find((factor) => factor.id === "frequency")?.possibleImprovementDb).toBe(0);
  });

  it.each(["VHF", "HF"] as const)("loads a validated %s saved experiment", (band) => {
    const settings = { ...defaultSettings(), band, scenario: createMission(band), prediction: "failed" as const, attempts: 3 };
    const loaded = parseSettings(JSON.parse(JSON.stringify(settings)));
    expect(loaded).toEqual(settings);
    expect(runSimulation(loaded.scenario)).toEqual(runSimulation(settings.scenario));
  });

  it("rejects old mock missions, malformed engine inputs, and mismatched bands", () => {
    expect(() => parseSettings({ ...defaultSettings(), scenario: exampleScenario })).toThrow("outdated");
    const invalid = defaultSettings();
    invalid.scenario.modeId = "made-up-mode";
    expect(() => parseSettings(invalid)).toThrow("modeId");
    expect(() => parseSettings({ ...defaultSettings(), band: "HF" })).toThrow("mismatched");
  });

  it("provides prose for every explanation returned by the mission experiments", () => {
    for (const band of ["VHF", "HF"] as const) {
      for (const frequency of band === "HF" ? [3e6, 14e6, 30e6] : [30e6, 145e6, 450e6]) {
        const scenario = createMission(band);
        scenario.frequencyHz = frequency;
        const result = runSimulation(scenario);
        for (const key of [...result.explanationKeys, ...result.limitingFactors.map((factor) => factor.explanationKey)]) {
          expect(explanations[key]?.beginner, key).toBeTruthy();
          expect(explanations[key]?.advanced, key).toBeTruthy();
        }
      }
    }
  });
});
