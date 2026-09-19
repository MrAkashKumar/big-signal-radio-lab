import { describe, expect, it } from "vitest";
import { exampleScenario } from "../packages/contracts/exampleScenario";
import {
  analyzeImpedance,
  analyzeReceiver,
  antennaDimensions,
  DEFAULT_BATTERY,
  DEFAULT_FANTASY,
  estimateBattery,
  estimateFeedline,
  fresnelProfile,
  simulateLaboratory,
  simulateScenario,
} from "../packages/simulation/src";

const impedance = {
  resistanceOhm: 50,
  reactanceOhm: 0,
  referenceOhm: 50,
  radiationResistanceOhm: 45,
};
const receiver = {
  signalDbm: -100,
  noiseDbm: -110,
  gainDb: 20,
  noiseFigureDb: 0,
  bandwidthHz: 12500,
  outputClipDbm: -10,
};
const value = (result: ReturnType<typeof simulateScenario>, id: string) =>
  result.calculations.find((node) => node.id === id)!.value;

describe("battery energy accounting", () => {
  it("accounts for three mutually exclusive power states", () => {
    const result = estimateBattery({
      capacityWh: 100,
      usableFraction: 0.8,
      idleW: 1,
      receiveW: 4,
      transmitCircuitW: 5,
      rfPowerW: 10,
      amplifierEfficiency: 0.5,
      transmitDutyCycle: 0.2,
      receiveDutyCycle: 0.3,
    });
    expect(result.transmitPowerW).toBe(25);
    expect(result.averagePowerW).toBeCloseTo(6.7, 10);
    expect(result.runtimeHours).toBeCloseTo(80 / 6.7, 10);
  });
  it("higher RF power drains the same battery faster", () => {
    expect(
      estimateBattery({ ...DEFAULT_BATTERY, rfPowerW: 100 }).runtimeHours!,
    ).toBeLessThan(estimateBattery(DEFAULT_BATTERY).runtimeHours!);
  });
  it("zero draw has an explicit unbounded sentinel and empty capacity has zero runtime", () => {
    expect(
      estimateBattery({
        ...DEFAULT_BATTERY,
        idleW: 0,
        receiveDutyCycle: 0,
        transmitDutyCycle: 0,
      }).runtimeHours,
    ).toBeNull();
    expect(
      estimateBattery({ ...DEFAULT_BATTERY, capacityWh: 0 }).runtimeHours,
    ).toBe(0);
  });
  it.each([
    { amplifierEfficiency: 0 },
    { capacityWh: -1 },
    { transmitDutyCycle: 0.9, receiveDutyCycle: 0.9 },
    { usableFraction: NaN },
  ])("rejects invalid energy inputs %o", (invalid) => {
    expect(() => estimateBattery({ ...DEFAULT_BATTERY, ...invalid })).toThrow(
      RangeError,
    );
  });
});

describe("matched-line and receiver references", () => {
  it("perfect match has no reflection but does not guarantee radiation efficiency", () => {
    const result = analyzeImpedance(impedance);
    expect(result.swr).toBe(1);
    expect(result.returnLossDb).toBeNull();
    expect(result.mismatchLossDb).toBeCloseTo(0);
    expect(result.radiationEfficiency).toBe(0.9);
    expect(
      analyzeImpedance({ ...impedance, radiationResistanceOhm: 0 })
        .radiationEfficiency,
    ).toBe(0);
  });
  it("100 ohm load on 50 ohm line gives 2:1 VSWR and 0.5115 dB mismatch loss", () => {
    const result = analyzeImpedance({ ...impedance, resistanceOhm: 100 });
    expect(result.swr).toBeCloseTo(2, 10);
    expect(result.returnLossDb).toBeCloseTo(9.542425094, 8);
    expect(result.mismatchLossDb).toBeCloseTo(0.5115252245, 8);
  });
  it("reactive loads retain the sign on the Smith chart", () => {
    const plus = analyzeImpedance({ ...impedance, reactanceOhm: 50 });
    const minus = analyzeImpedance({ ...impedance, reactanceOhm: -50 });
    expect(plus.reflectionReal).toBeCloseTo(0.2);
    expect(plus.reflectionImaginary).toBeCloseTo(0.4);
    expect(minus.reflectionImaginary).toBeCloseTo(-0.4);
    expect(plus.reflectedPowerFraction).toBeCloseTo(0.2);
  });
  it("short circuits expose infinite SWR explicitly without numeric Infinity", () => {
    const result = analyzeImpedance({
      ...impedance,
      resistanceOhm: 0,
      radiationResistanceOhm: 0,
    });
    expect(result.swr).toBeNull();
    expect(result.mismatchLossDb).toBeNull();
    expect(JSON.stringify(result)).not.toContain("Infinity");
  });
  it("rejects an impossible resistance decomposition", () => {
    expect(() =>
      analyzeImpedance({ ...impedance, radiationResistanceOhm: 51 }),
    ).toThrow(RangeError);
  });
  it("gain raises signal and noise equally in an ideal linear receiver", () => {
    const result = analyzeReceiver(receiver);
    const high = analyzeReceiver({ ...receiver, gainDb: 40 });
    expect(result.outputSignalDbm).toBe(-80);
    expect(result.outputNoiseDbm).toBe(-90);
    expect(high.outputSignalDbm - result.outputSignalDbm).toBe(20);
    expect(high.outputNoiseDbm - result.outputNoiseDbm).toBe(20);
    expect(high.outputSnrDb).toBe(result.inputSnrDb);
  });
  it("positive noise figure degrades SNR, and blockers consume headroom", () => {
    expect(
      analyzeReceiver({ ...receiver, noiseFigureDb: 10 }).outputSnrDb,
    ).toBeLessThan(10);
    expect(analyzeReceiver({ ...receiver, blockerDbm: -20 }).clipping).toBe(
      true,
    );
    expect(
      analyzeReceiver({ ...receiver, blockerDbm: -20 }).headroomDb,
    ).toBeLessThan(-9.99);
  });
  it("scales an explicitly approximate matched cable model", () => {
    const base = { lengthM: 10, frequencyHz: 1e8, lossDbPer100MAt100MHz: 20 };
    expect(estimateFeedline(base).lossDb).toBe(2);
    expect(estimateFeedline({ ...base, frequencyHz: 4e8 }).lossDb).toBe(4);
    expect(estimateFeedline({ ...base, lengthM: 20 }).lossDb).toBe(4);
  });
  it("reports wavelength and Fresnel geometry in metres", () => {
    expect(antennaDimensions(299792458).wavelengthM).toBe(1);
    expect(antennaDimensions(299792458).quarterWaveM).toBe(0.25);
    const profile = fresnelProfile(1000, 299792458, 3);
    expect(profile[0].radiusM).toBe(0);
    expect(profile[1].radiusM).toBeCloseTo(Math.sqrt(250));
    expect(profile[2].radiusM).toBe(0);
    expect(() => fresnelProfile(1000, 145e6, 4.5)).toThrow(RangeError);
  });
});

describe("explicit fantasy overrides preserve real baselines", () => {
  it("real mode is identical to the authoritative engine", () => {
    expect(simulateLaboratory(exampleScenario, { mode: "real" })).toEqual(
      simulateScenario(exampleScenario),
    );
  });
  it("disabling spreading removes exactly the FSPL term", () => {
    const base = simulateScenario(exampleScenario);
    const result = simulateLaboratory(exampleScenario, {
      ...DEFAULT_FANTASY,
      mode: "fantasy",
      disableFreeSpaceSpreading: true,
    });
    expect(value(result, "fspl")).toBe(0);
    expect(result.receivedPowerDbm - base.receivedPowerDbm).toBeCloseTo(
      value(base, "fspl"),
      10,
    );
    expect(
      result.warnings.some((warning) => warning.startsWith("FANTASY PHYSICS")),
    ).toBe(true);
  });
  it("doubling c changes FSPL by 6.0206 dB and halves travel time", () => {
    const base = simulateScenario(exampleScenario);
    const result = simulateLaboratory(exampleScenario, {
      ...DEFAULT_FANTASY,
      mode: "fantasy",
      speedOfLightMultiplier: 2,
    });
    expect(result.receivedPowerDbm - base.receivedPowerDbm).toBeCloseTo(
      6.020599913,
      8,
    );
    expect(value(result, "travel-time")).toBeCloseTo(
      value(base, "travel-time") / 2,
      12,
    );
  });
  it("flat terrestrial geometry restores horizon routes without dropping an obstruction", () => {
    const scenario = structuredClone(exampleScenario);
    scenario.receiver.position.longitudeDeg = 1;
    scenario.environment = {
      model: "vhf-terrain",
      temperatureK: 290,
      effectiveEarthRadiusFactor: 4 / 3,
      obstruction: { fraction: 0.5, altitudeM: 30 },
    };
    expect(simulateScenario(scenario).propagationAvailable).toBe(false);
    const result = simulateLaboratory(scenario, {
      ...DEFAULT_FANTASY,
      mode: "fantasy",
      disableEarthCurvature: true,
    });
    expect(result.propagationAvailable).toBe(true);
    expect(value(result, "earth-bulge")).toBe(0);
    expect(value(result, "diffraction-loss")).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toContain("null");
  });
  it("altered c updates Fresnel diffraction too", () => {
    const scenario = structuredClone(exampleScenario);
    scenario.environment = {
      model: "vhf-terrain",
      temperatureK: 290,
      effectiveEarthRadiusFactor: 4 / 3,
      obstruction: { fraction: 0.5, altitudeM: 20 },
    };
    const base = simulateScenario(scenario);
    const result = simulateLaboratory(scenario, {
      ...DEFAULT_FANTASY,
      mode: "fantasy",
      speedOfLightMultiplier: 4,
    });
    expect(value(result, "fresnel-radius")).toBeCloseTo(
      value(base, "fresnel-radius") * 2,
      10,
    );
  });
  it("removing the ionosphere cannot leave an HF return path", () => {
    const scenario = structuredClone(exampleScenario);
    scenario.frequencyHz = 7e6;
    scenario.environment = {
      model: "hf-skywave",
      temperatureK: 290,
      effectiveHeightM: 250000,
      criticalFrequencyMHzDay: 8,
      criticalFrequencyMHzNight: 4,
      absorptionDbAt10MHzDay: 3,
      absorptionDbAt10MHzNight: 1,
      groundReflectionLossDb: 3,
      maxHops: 5,
    };
    const result = simulateLaboratory(scenario, {
      ...DEFAULT_FANTASY,
      mode: "fantasy",
      removeIonosphere: true,
    });
    expect(result.propagationAvailable).toBe(false);
    expect(result.success).toBe("failed");
    expect(result.propagationPaths).toEqual([]);
  });
  it("accepts 100 MW in real physics, and rejects invalid fantasy wave speed", () => {
    const scenario = structuredClone(exampleScenario);
    scenario.transmitter.powerDbm = 110;
    expect(simulateLaboratory(scenario).receivedPowerDbm).toBeGreaterThan(
      simulateScenario(exampleScenario).receivedPowerDbm,
    );
    expect(() =>
      simulateLaboratory(scenario, {
        ...DEFAULT_FANTASY,
        mode: "fantasy",
        speedOfLightMultiplier: 0,
      }),
    ).toThrow(RangeError);
  });
});
