import { describe, expect, it } from "vitest";
import { exampleScenario } from "../../../packages/contracts/exampleScenario";
import type { TeacherChallenge } from "../../../packages/missions/product";
import {
  DEFAULT_FANTASY,
  simulateLaboratory,
  simulateScenario,
  validateScenario,
} from "../../../packages/simulation/src";
import {
  compareExperimentMeaning,
  evaluateTeacherChallenge,
  switchPropagationModel,
  switchScenarioBand,
} from "./productDomain";

const teacher: TeacherChallenge = {
  objective: "Make a school link",
  environment: "Rooftops",
  frequencyOptionsHz: [145e6],
  equipment: ["Quarter-wave vertical"],
  communicationGoal: "Voice",
  constraints: ["Explain your choices"],
  targetConcepts: ["link budget"],
  hints: [],
  success: { minimumMarginDb: 6, maximumPowerW: 5 },
};

describe("teacher challenge evaluation", () => {
  it("accepts structured valid limits and evaluates both antennas by family", () => {
    expect(
      evaluateTeacherChallenge(
        exampleScenario,
        simulateScenario(exampleScenario),
        teacher,
      ).status,
    ).toBe("passed");
  });
  it("does not pass a height limit when only the receiver exceeds it", () => {
    const scenario = structuredClone(exampleScenario);
    scenario.receiver.antenna.heightM = 20;
    const result = evaluateTeacherChallenge(
      scenario,
      simulateScenario(scenario),
      { ...teacher, success: { ...teacher.success, maximumHeightM: 15 } },
    );
    expect(result.status).toBe("failed");
    expect(result.checks.find((check) => check.id === "height")!.status).toBe(
      "failed",
    );
  });
  it("does not invent battery endurance from the default comparison battery", () => {
    const result = evaluateTeacherChallenge(
      exampleScenario,
      simulateScenario(exampleScenario),
      { ...teacher, success: { ...teacher.success, minimumRuntimeHours: 1 } },
    );
    expect(result.status).toBe("incomplete");
    expect(
      result.checks.find((check) => check.id === "endurance")!.status,
    ).toBe("not-assessed");
  });
  it("rejects unavailable routes even when hypothetical margins meet the target", () => {
    const result = {
      ...simulateScenario(exampleScenario),
      propagationAvailable: false,
      linkMarginDb: 100,
    };
    expect(
      evaluateTeacherChallenge(exampleScenario, result, teacher).status,
    ).toBe("failed");
  });
  it("rejects receiver equipment that is not in the available list", () => {
    const scenario = structuredClone(exampleScenario);
    scenario.receiver.antenna.type = "dish";
    expect(
      evaluateTeacherChallenge(
        scenario,
        simulateScenario(scenario),
        teacher,
      ).checks.find((c) => c.id === "equipment")!.status,
    ).toBe("failed");
  });
  it("evaluates power and frequency constraints", () => {
    const scenario = structuredClone(exampleScenario);
    scenario.frequencyHz = 433e6;
    scenario.transmitter.powerDbm = 40;
    const result = evaluateTeacherChallenge(
      scenario,
      simulateScenario(scenario),
      teacher,
    );
    expect(result.checks.find((c) => c.id === "power")!.status).toBe("failed");
    expect(result.checks.find((c) => c.id === "frequency")!.status).toBe(
      "failed",
    );
  });
  it("never claims a classroom success based on fantasy physics", () => {
    expect(
      evaluateTeacherChallenge(
        exampleScenario,
        simulateLaboratory(exampleScenario, DEFAULT_FANTASY),
        teacher,
      ).status,
    ).toBe("failed");
  });
});

describe("cross-band experiments preserve the problem", () => {
  it.each(["HF", "VHF", "UHF", "MICROWAVE"] as const)(
    "%s keeps endpoints, equipment, power and time fixed",
    (band) => {
      const snapshot = structuredClone(exampleScenario),
        next = switchScenarioBand(exampleScenario, band);
      expect(next.transmitter).toEqual(exampleScenario.transmitter);
      expect(next.receiver.position).toEqual(exampleScenario.receiver.position);
      expect(next.receiver.antenna).toEqual(exampleScenario.receiver.antenna);
      expect(next.time).toEqual(exampleScenario.time);
      expect(exampleScenario).toEqual(snapshot);
      expect(() => validateScenario(next)).not.toThrow();
    },
  );
  it("retains a configured ridge between terrestrial bands", () => {
    const terrain = switchScenarioBand(exampleScenario, "VHF");
    if (terrain.environment.model === "vhf-terrain")
      terrain.environment.obstruction = { fraction: 0.2, altitudeM: 30 };
    const microwave = switchScenarioBand(terrain, "MICROWAVE");
    expect(microwave.environment).toMatchObject({
      model: "vhf-terrain",
      obstruction: { fraction: 0.2, altitudeM: 30 },
      externalNoiseDb: 0,
    });
  });
  it.each([
    ["HF", 29.43],
    ["VHF", 6],
    ["UHF", 0],
    ["MICROWAVE", 0],
  ] as const)("%s loads its explicit external-noise default", (band, expectedDb) => {
    const next = switchScenarioBand(exampleScenario, band);
    expect(next.environment.externalNoiseDb).toBeCloseTo(expectedDb, 2);
  });
  it("selecting the ionosphere on a VHF setup also selects a valid HF frequency", () => {
    const next = switchPropagationModel(exampleScenario, "hf-skywave");
    expect(next.frequencyHz).toBe(7e6);
    expect(next.modeId).toBe("ssb");
    expect(() => simulateScenario(next)).not.toThrow();
  });
  it("keeps an existing HF frequency when selecting the HF model", () => {
    const next = switchPropagationModel(
      { ...exampleScenario, frequencyHz: 14e6 },
      "hf-skywave",
    );
    expect(next.frequencyHz).toBe(14e6);
    expect(next.environment.externalNoiseDb).toBeCloseTo(20.82, 2);
  });
  it("selecting a terrestrial model updates noise for the retained frequency", () => {
    const source = switchScenarioBand(exampleScenario, "HF");
    const next = switchPropagationModel(source, "free-space");
    expect(next.frequencyHz).toBe(7e6);
    expect(next.environment.externalNoiseDb).toBeCloseTo(29.43, 2);
  });
  it("leaves ordinary manual frequency and noise edits independent", () => {
    const scenario = switchScenarioBand(exampleScenario, "HF");
    scenario.frequencyHz = 14e6;
    expect(scenario.environment.externalNoiseDb).toBe(29.43);
    scenario.environment.externalNoiseDb = 3;
    expect(scenario.frequencyHz).toBe(14e6);
  });
});

describe("comparison interpretation", () => {
  const result = simulateScenario(exampleScenario);
  it("marks a real/fantasy delta as different universes", () => {
    expect(
      compareExperimentMeaning({ result }, { result, physics: DEFAULT_FANTASY })
        .quantitativeComparison,
    ).toBe(false);
  });
  it("marks changes between fantasy laws too", () => {
    expect(
      compareExperimentMeaning(
        { result, physics: DEFAULT_FANTASY },
        { result, physics: { ...DEFAULT_FANTASY, speedOfLightMultiplier: 2 } },
      ).samePhysics,
    ).toBe(false);
  });
  it("does not treat a hypothetical route as a valid improvement", () => {
    expect(
      compareExperimentMeaning(
        { result },
        { result: { ...result, propagationAvailable: false } },
      ).quantitativeComparison,
    ).toBe(false);
  });
  it("allows comparison under identical physical rules and available paths", () => {
    expect(
      compareExperimentMeaning(
        { result },
        { result, physics: { mode: "real" } },
      ).quantitativeComparison,
    ).toBe(true);
  });
});
