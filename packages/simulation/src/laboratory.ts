import type {
  CalculationNode,
  Scenario,
  SimulationResult,
} from "../../contracts";
import { simulateScenario } from "./index";

export interface BatteryInput {
  capacityWh: number;
  idleW: number;
  receiveW: number;
  transmitCircuitW: number;
  rfPowerW: number;
  amplifierEfficiency: number;
  transmitDutyCycle: number;
  receiveDutyCycle: number;
  usableFraction: number;
}
export interface BatteryEstimate {
  averagePowerW: number;
  transmitPowerW: number;
  usableEnergyWh: number;
  runtimeHours: number | null;
  calculations: CalculationNode[];
  assumptions: string[];
}
export const DEFAULT_BATTERY: BatteryInput = {
  capacityWh: 120,
  idleW: 0.5,
  receiveW: 3,
  transmitCircuitW: 4,
  rfPowerW: 5,
  amplifierEfficiency: 0.4,
  transmitDutyCycle: 0.1,
  receiveDutyCycle: 0.4,
  usableFraction: 0.8,
};
export interface ImpedanceInput {
  resistanceOhm: number;
  reactanceOhm: number;
  referenceOhm: number;
  radiationResistanceOhm: number;
}
export interface ImpedanceResult {
  reflectionReal: number;
  reflectionImaginary: number;
  reflectionMagnitude: number;
  reflectedPowerFraction: number;
  swr: number | null;
  returnLossDb: number | null;
  mismatchLossDb: number | null;
  radiationEfficiency: number;
  calculations: CalculationNode[];
  assumptions: string[];
}
export interface AntennaDimensions {
  wavelengthM: number;
  quarterWaveM: number;
  halfWaveM: number;
  practicalDipoleM: number;
  assumptions: string[];
}
export interface FeedlineInput {
  lengthM: number;
  frequencyHz: number;
  lossDbPer100MAt100MHz: number;
}
export interface FeedlineEstimate {
  lossDb: number;
  deliveredPowerFraction: number;
  calculations: CalculationNode[];
  assumptions: string[];
}
export interface ReceiverInput {
  signalDbm: number;
  noiseDbm: number;
  gainDb: number;
  noiseFigureDb: number;
  bandwidthHz: number;
  outputClipDbm: number;
  blockerDbm?: number;
}
export interface ReceiverAnalysis {
  outputSignalDbm: number;
  outputNoiseDbm: number;
  inputSnrDb: number;
  outputSnrDb: number;
  outputTotalDbm: number;
  headroomDb: number;
  clipping: boolean;
  calculations: CalculationNode[];
  assumptions: string[];
}
export type PhysicsSettings =
  | { mode: "real" }
  | {
      mode: "fantasy";
      disableEarthCurvature: boolean;
      removeIonosphere: boolean;
      disableFreeSpaceSpreading: boolean;
      speedOfLightMultiplier: number;
    };
export const REAL_PHYSICS: Extract<PhysicsSettings, { mode: "real" }> = {
  mode: "real",
};
export const DEFAULT_FANTASY: Extract<PhysicsSettings, { mode: "fantasy" }> = {
  mode: "fantasy",
  disableEarthCurvature: false,
  removeIonosphere: false,
  disableFreeSpaceSpreading: false,
  speedOfLightMultiplier: 1,
};

function range(value: number, name: string, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new RangeError(`${name} must be within [${min}, ${max}]`);
}
const calc = (
  id: string,
  label: string,
  value: number,
  unit: string,
  equation: string,
): CalculationNode => ({ id, label, value, unit, equation });

export function estimateBattery(input: BatteryInput): BatteryEstimate {
  range(input.capacityWh, "Battery capacity", 0, 1e9);
  for (const key of [
    "idleW",
    "receiveW",
    "transmitCircuitW",
    "rfPowerW",
  ] as const)
    range(input[key], key, 0, 1e12);
  range(input.amplifierEfficiency, "Amplifier efficiency", 0.001, 1);
  for (const key of [
    "transmitDutyCycle",
    "receiveDutyCycle",
    "usableFraction",
  ] as const)
    range(input[key], key, 0, 1);
  if (input.transmitDutyCycle + input.receiveDutyCycle > 1 + 1e-12)
    throw new RangeError(
      "Transmit and receive duty cycles must total at most 100%",
    );
  const transmitPowerW =
    input.transmitCircuitW + input.rfPowerW / input.amplifierEfficiency;
  const averagePowerW =
    transmitPowerW * input.transmitDutyCycle +
    input.receiveW * input.receiveDutyCycle +
    input.idleW *
      Math.max(0, 1 - input.transmitDutyCycle - input.receiveDutyCycle);
  const usableEnergyWh = input.capacityWh * input.usableFraction;
  const runtimeHours =
    averagePowerW === 0 ? null : usableEnergyWh / averagePowerW;
  return {
    averagePowerW,
    transmitPowerW,
    usableEnergyWh,
    runtimeHours,
    calculations: [
      calc(
        "battery-transmit",
        "Electrical power during transmit",
        transmitPowerW,
        "W",
        "Ptx = Pcircuit + Prf / efficiency",
      ),
      calc(
        "battery-average",
        "Average electrical draw",
        averagePowerW,
        "W",
        "Pavg = dutyTX × Ptx + dutyRX × Prx + (1-dutyTX-dutyRX) × Pidle",
      ),
      calc(
        "battery-usable",
        "Usable battery energy",
        usableEnergyWh,
        "Wh",
        "Eusable = capacityWh × usableFraction",
      ),
      ...(runtimeHours === null
        ? []
        : [
            calc(
              "battery-runtime",
              "Estimated endurance",
              runtimeHours,
              "h",
              "runtime = Eusable / Pavg",
            ),
          ]),
    ],
    assumptions: [
      "Transmit, receive and idle are mutually exclusive states. Each state power is total station draw.",
      "Constant amplifier efficiency and usable battery fraction. Temperature, battery aging, voltage sag and discharge-rate effects are not resolved.",
      "Null runtime means zero modeled draw, not a claim of infinite real battery life.",
    ],
  };
}

export function analyzeImpedance(input: ImpedanceInput): ImpedanceResult {
  range(input.resistanceOhm, "Resistance", 0, 1e7);
  range(input.reactanceOhm, "Reactance", -1e7, 1e7);
  range(input.referenceOhm, "Reference impedance", 0.001, 1e7);
  range(
    input.radiationResistanceOhm,
    "Radiation resistance",
    0,
    input.resistanceOhm,
  );
  const { resistanceOhm: r, reactanceOhm: x, referenceOhm: z } = input;
  const denominator = (r + z) ** 2 + x ** 2;
  const reflectionReal = (r * r + x * x - z * z) / denominator;
  const reflectionImaginary = (2 * z * x) / denominator;
  const reflectedPowerFraction = Math.min(
    1,
    ((r - z) ** 2 + x * x) / denominator,
  );
  const reflectionMagnitude = Math.sqrt(reflectedPowerFraction);
  const swr =
    reflectionMagnitude >= 1
      ? null
      : (1 + reflectionMagnitude) / (1 - reflectionMagnitude);
  const returnLossDb =
    reflectionMagnitude === 0 ? null : -20 * Math.log10(reflectionMagnitude);
  const mismatchLossDb =
    reflectedPowerFraction >= 1
      ? null
      : -10 * Math.log10(1 - reflectedPowerFraction);
  const radiationEfficiency = r === 0 ? 0 : input.radiationResistanceOhm / r;
  return {
    reflectionReal,
    reflectionImaginary,
    reflectionMagnitude,
    reflectedPowerFraction,
    swr,
    returnLossDb,
    mismatchLossDb,
    radiationEfficiency,
    calculations: [
      calc(
        "reflection",
        "Voltage reflection magnitude",
        reflectionMagnitude,
        "1",
        "|Γ| = |(Zload-Z0)/(Zload+Z0)|",
      ),
      calc(
        "reflected-power",
        "Reflected power fraction",
        reflectedPowerFraction,
        "1",
        "Preflected / Pincident = |Γ|²",
      ),
      ...(swr === null
        ? []
        : [calc("swr", "Standing-wave ratio", swr, ":1", "(1+|Γ|)/(1-|Γ|)")]),
      ...(returnLossDb === null
        ? []
        : [
            calc(
              "return-loss",
              "Return loss",
              returnLossDb,
              "dB",
              "-20 log10(|Γ|)",
            ),
          ]),
      ...(mismatchLossDb === null
        ? []
        : [
            calc(
              "mismatch-loss",
              "Mismatch loss",
              mismatchLossDb,
              "dB",
              "-10 log10(1-|Γ|²)",
            ),
          ]),
      calc(
        "radiation-efficiency",
        "Radiation efficiency",
        radiationEfficiency,
        "1",
        "Rradiation / (Rradiation + Rloss)",
      ),
    ],
    assumptions: [
      "Passive load and purely real positive feedline reference impedance. Resistance is radiation plus dissipative resistance.",
      "Null SWR or mismatch loss denotes an unbounded value at total reflection. Null return loss denotes a perfect match.",
      "Impedance is supplied, not inferred from arbitrary geometry. Good SWR alone does not imply efficient radiation.",
    ],
  };
}

export function antennaDimensions(frequencyHz: number): AntennaDimensions {
  range(frequencyHz, "Frequency", 1e5, 1e11);
  const wavelengthM = 299792458 / frequencyHz;
  return {
    wavelengthM,
    quarterWaveM: wavelengthM / 4,
    halfWaveM: wavelengthM / 2,
    practicalDipoleM: wavelengthM * 0.475,
    assumptions: [
      "λ = c / f, c = 299792458 m/s.",
      "Practical dipole uses a 0.95 shortening factor on a half wavelength. This is a starting estimate, not a resonance prediction.",
      "Conductor diameter, insulation, nearby objects and ground change resonance. No gain or impedance is inferred from these dimensions.",
    ],
  };
}

export function estimateFeedline(input: FeedlineInput): FeedlineEstimate {
  range(input.lengthM, "Cable length", 0, 1e6);
  range(input.frequencyHz, "Frequency", 1e5, 1e11);
  range(input.lossDbPer100MAt100MHz, "Reference attenuation", 0, 1000);
  const lossDb =
    ((input.lossDbPer100MAt100MHz * input.lengthM) / 100) *
    Math.sqrt(input.frequencyHz / 1e8);
  return {
    lossDb,
    deliveredPowerFraction: 10 ** (-lossDb / 10),
    calculations: [
      calc(
        "cable-loss",
        "Estimated matched cable attenuation",
        lossDb,
        "dB",
        "L = L100 × length/100 × sqrt(f/100MHz)",
      ),
    ],
    assumptions: [
      "Educational conductor-loss approximation with attenuation proportional to sqrt(frequency).",
      "Matched cable only. Dielectric losses, connectors, mismatch and temperature are omitted. Use manufacturer data for a real cable.",
      "The reference attenuation is dB per 100 metres at 100 MHz.",
    ],
  };
}

export function analyzeReceiver(input: ReceiverInput): ReceiverAnalysis {
  for (const key of ["signalDbm", "noiseDbm", "outputClipDbm"] as const)
    range(input[key], key, -300, 200);
  range(input.gainDb, "Gain", 0, 150);
  range(input.noiseFigureDb, "Noise figure", 0, 100);
  range(input.bandwidthHz, "Bandwidth", 0.01, 1e9);
  if (input.blockerDbm !== undefined)
    range(input.blockerDbm, "Blocker power", -300, 200);
  const addedNoiseMw =
    1000 *
    1.380649e-23 *
    290 *
    input.bandwidthHz *
    (10 ** (input.noiseFigureDb / 10) - 1);
  const inputNoiseMw = 10 ** (input.noiseDbm / 10) + addedNoiseMw;
  const outputSignalDbm = input.signalDbm + input.gainDb;
  const outputNoiseDbm = 10 * Math.log10(inputNoiseMw) + input.gainDb;
  const outputTotalDbm =
    10 *
    Math.log10(
      10 ** (outputSignalDbm / 10) +
        10 ** (outputNoiseDbm / 10) +
        (input.blockerDbm === undefined
          ? 0
          : 10 ** ((input.blockerDbm + input.gainDb) / 10)),
    );
  const headroomDb = input.outputClipDbm - outputTotalDbm;
  const inputSnrDb = input.signalDbm - input.noiseDbm;
  const outputSnrDb = outputSignalDbm - outputNoiseDbm;
  return {
    outputSignalDbm,
    outputNoiseDbm,
    inputSnrDb,
    outputSnrDb,
    outputTotalDbm,
    headroomDb,
    clipping: headroomDb < 0,
    calculations: [
      calc(
        "receiver-signal",
        "Signal after gain",
        outputSignalDbm,
        "dBm",
        "Pout = Pin + G",
      ),
      calc(
        "receiver-noise",
        "Noise after gain",
        outputNoiseDbm,
        "dBm",
        "Nout = G × [Nin + k × 290 × B × (F-1)] in linear power",
      ),
      calc(
        "receiver-snr",
        "Predicted linear output SNR",
        outputSnrDb,
        "dB",
        "SNRout = Psignal,out - Pnoise,out",
      ),
      calc(
        "receiver-headroom",
        "Headroom to configured overload threshold",
        headroomDb,
        "dB",
        "headroom = Pclip - 10log10(sum output powers in mW)",
      ),
    ],
    assumptions: [
      "Linear amplifier with additive input-referred noise at the 290 K reference temperature.",
      "An optional blocker contributes to total power and overload only. Filtering, intermodulation and AGC dynamics are not modeled.",
      "Above the configured overload threshold, linear output powers and SNR are hypothetical. The waveform distortion is not simulated.",
      "Ideal gain raises signal and noise equally. Gain cannot recover SNR already lost at the input.",
    ],
  };
}

export function simulateLaboratory(
  scenario: Scenario,
  physics: PhysicsSettings = REAL_PHYSICS,
): SimulationResult {
  return simulateScenario(scenario, physics);
}

export function fresnelProfile(
  distanceM: number,
  frequencyHz: number,
  samples = 33,
  speedOfLightMultiplier = 1,
): { fraction: number; radiusM: number }[] {
  range(distanceM, "Path distance", 1, 4.1e7);
  range(frequencyHz, "Frequency", 1e5, 1e11);
  range(samples, "Samples", 3, 257);
  range(speedOfLightMultiplier, "Wave speed multiplier", 0.01, 100);
  if (!Number.isInteger(samples))
    throw new RangeError("Samples must be an integer");
  return Array.from({ length: samples }, (_, i) => {
    const fraction = i / (samples - 1);
    return {
      fraction,
      radiusM: Math.sqrt(
        ((299792458 * speedOfLightMultiplier) / frequencyHz) *
          distanceM *
          fraction *
          (1 - fraction),
      ),
    };
  });
}

export function analyticalPatternPoints(
  type: Scenario["transmitter"]["antenna"]["type"] | "loop",
  count = 24,
): { x: number; y: number; z: number }[] {
  range(count, "Angular samples", 8, 64);
  if (!Number.isInteger(count))
    throw new RangeError("Angular samples must be an integer");
  if (
    ![
      "rubber-duck",
      "vertical",
      "dipole",
      "yagi",
      "dish",
      "custom",
      "loop",
    ].includes(type)
  )
    throw new RangeError("Unknown antenna type");
  const directional = type === "yagi" || type === "dish";
  const points: { x: number; y: number; z: number }[] = [];
  for (let t = 0; t <= count; t++)
    for (let p = 0; p <= count; p++) {
      const theta = (Math.PI * t) / count;
      const phi = (2 * Math.PI * p) / count;
      const radius = directional
        ? Math.max(0, Math.cos(theta)) ** (type === "dish" ? 8 : 3)
        : Math.sin(theta);
      points.push({
        x: radius * Math.sin(theta) * Math.cos(phi),
        y: radius * Math.cos(theta),
        z: radius * Math.sin(theta) * Math.sin(phi),
      });
    }
  return points;
}
