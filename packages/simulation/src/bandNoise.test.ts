import { describe, expect, it } from "vitest";
import {
  BAND_EXTERNAL_NOISE_DEFAULTS,
  defaultExternalNoiseDbForFrequency,
  ITU_R_P372_17_QUIET_RURAL,
  quietRuralNoiseFactorDb,
} from "./bandNoise";
import { loadExampleScenario } from "../examples/scenarios";

describe("ITU-R P.372-17 external-noise references", () => {
  it.each([
    [1.8e6, 46.3],
    [7e6, 29.43],
    [14e6, 20.82],
    [30e6, 11.35],
  ])("calculates quiet-rural noise at %s Hz", (frequencyHz, expectedDb) => {
    expect(quietRuralNoiseFactorDb(frequencyHz)).toBeCloseTo(expectedDb, 2);
  });

  it.each([0.299e6, 30.001e6, NaN, Infinity])(
    "rejects frequency %s outside the model validity range",
    (frequencyHz) => {
      expect(() => quietRuralNoiseFactorDb(frequencyHz)).toThrow(RangeError);
    },
  );

  it("publishes explicit application defaults", () => {
    expect(BAND_EXTERNAL_NOISE_DEFAULTS).toMatchObject({
      HF: { frequencyHz: 7e6, noiseFactorDb: 29.43 },
      VHF: { frequencyHz: 146e6, noiseFactorDb: 6 },
      UHF: { frequencyHz: 433e6, noiseFactorDb: 0 },
      MICROWAVE: { frequencyHz: 2.4e9, noiseFactorDb: 0 },
    });
    expect(BAND_EXTERNAL_NOISE_DEFAULTS.VHF.environmentClass).toBe("rural");
    expect(BAND_EXTERNAL_NOISE_DEFAULTS.UHF.environmentClass).toBe("thermal-baseline");
    expect(BAND_EXTERNAL_NOISE_DEFAULTS.MICROWAVE.environmentClass).toBe(
      "thermal-baseline",
    );
    expect(ITU_R_P372_17_QUIET_RURAL.referenceTemperatureK).toBe(290);
  });

  it.each([
    [14e6, 20.82],
    [146e6, 6],
    [433e6, 0],
    [2.4e9, 0],
  ])("selects the authored default at %s Hz", (frequencyHz, expectedDb) => {
    expect(defaultExternalNoiseDbForFrequency(frequencyHz)).toBeCloseTo(
      expectedDb,
      2,
    );
  });

  it("does not invent a band default below the supported HF transition", () => {
    expect(defaultExternalNoiseDbForFrequency(500e3)).toBeUndefined();
  });

  it.each([
    ["hf-absorption", 46.3],
    ["hf-multihop", 29.43],
    ["hf-day", 20.82],
    ["hf-above-muf", 11.35],
    ["vhf-clear", 6],
    ["microwave-clear", 0],
  ])("authors %s with its referenced background", (id, expectedDb) => {
    expect(loadExampleScenario(id).environment.externalNoiseDb).toBeCloseTo(
      expectedDb,
      2,
    );
  });

  it("labels the ridge noise as an adverse teaching override", () => {
    expect(loadExampleScenario("vhf-ridge").environment.externalNoiseDb).toBe(
      47,
    );
  });
});
