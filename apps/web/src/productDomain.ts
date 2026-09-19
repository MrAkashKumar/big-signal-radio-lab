import type {
  EnvironmentConfig,
  Scenario,
  SimulationResult,
} from "../../../packages/contracts";
import type { TeacherChallenge } from "../../../packages/missions/product";
import { dbmToWatts } from "../../../packages/units/src";
import type { PhysicsSettings } from "../../../packages/simulation/src";
import {
  BAND_EXTERNAL_NOISE_DEFAULTS,
  defaultExternalNoiseDbForFrequency,
} from "../../../packages/simulation/src/bandNoise";
import { createMission } from "./missions";

export interface ChallengeCheck {
  id: string;
  label: string;
  status: "passed" | "failed" | "not-assessed";
  detail: string;
}
export interface TeacherAssessment {
  status: "passed" | "failed" | "incomplete";
  checks: ChallengeCheck[];
  planningNotes: string[];
}
const antennaNames: Record<
  Scenario["transmitter"]["antenna"]["type"],
  string[]
> = {
  "rubber-duck": ["rubber duck", "handheld", "rubber-duck"],
  vertical: ["vertical", "quarter-wave vertical", "quarter wave vertical"],
  dipole: ["dipole"],
  yagi: ["yagi"],
  dish: ["dish"],
  custom: ["custom"],
};
const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export function evaluateTeacherChallenge(
  scenario: Scenario,
  result: SimulationResult,
  teacher: TeacherChallenge,
): TeacherAssessment {
  const check = (
    id: string,
    label: string,
    passed: boolean,
    detail: string,
  ): ChallengeCheck => ({
    id,
    label,
    status: passed ? "passed" : "failed",
    detail,
  });
  const allowedEquipment = teacher.equipment.map(normalize).filter(Boolean);
  const hasEquipment = (antenna: Scenario["transmitter"]["antenna"]) =>
    !allowedEquipment.length ||
    [antenna.id, ...antennaNames[antenna.type]].some((name) =>
      allowedEquipment.includes(normalize(name)),
    );
  const powerW = dbmToWatts(scenario.transmitter.powerDbm);
  const checks: ChallengeCheck[] = [
    check(
      "physical-model",
      "Real physics",
      !result.warnings.some((warning) => warning.startsWith("FANTASY PHYSICS")),
      "Classroom engineering requirements are assessed in the ordinary physical model.",
    ),
    check(
      "available-path",
      "Usable simulated path",
      result.propagationAvailable && result.success !== "failed",
      "The selected route must reach the receiver and support the selected mode. This result evaluates TX → RX only.",
    ),
    check(
      "margin",
      "Link margin",
      Number.isFinite(result.linkMarginDb) &&
        result.linkMarginDb >= teacher.success.minimumMarginDb,
      `Requires at least ${teacher.success.minimumMarginDb} dB; measured ${result.linkMarginDb.toFixed(1)} dB.`,
    ),
    check(
      "power",
      "Transmitter power budget",
      Number.isFinite(powerW) &&
        powerW <= teacher.success.maximumPowerW * (1 + 1e-12),
      `Requires at most ${teacher.success.maximumPowerW} W; configured ${Number(powerW.toPrecision(6))} W.`,
    ),
    check(
      "frequency",
      "Allowed frequency",
      !teacher.frequencyOptionsHz.length ||
        teacher.frequencyOptionsHz.some(
          (frequency) => Math.abs(frequency - scenario.frequencyHz) <= 0.001,
        ),
      teacher.frequencyOptionsHz.length
        ? "The configured frequency must match one of the teacher’s listed frequencies."
        : "The teacher has not restricted frequency.",
    ),
    check(
      "equipment",
      "Available equipment at both stations",
      hasEquipment(scenario.transmitter.antenna) &&
        hasEquipment(scenario.receiver.antenna),
      allowedEquipment.length
        ? "Both TX and RX antenna families or identifiers must appear in the available-equipment list."
        : "The teacher has not restricted equipment.",
    ),
  ];
  if (teacher.success.maximumHeightM !== undefined)
    checks.push(
      check(
        "height",
        "Antenna height limit",
        Math.max(
          scenario.transmitter.antenna.heightM,
          scenario.receiver.antenna.heightM,
        ) <= teacher.success.maximumHeightM,
        `Both antennas must be at most ${teacher.success.maximumHeightM} m above their station ground.`,
      ),
    );
  if (teacher.success.minimumRuntimeHours !== undefined)
    checks.push({
      id: "endurance",
      label: "Battery endurance",
      status: "not-assessed",
      detail: `Requires ${teacher.success.minimumRuntimeHours} hours. This portable link does not include a station battery and duty-cycle configuration. Evaluate endurance in Disaster Lab.`,
    });
  return {
    status: checks.some((item) => item.status === "failed")
      ? "failed"
      : checks.some((item) => item.status === "not-assessed")
        ? "incomplete"
        : "passed",
    checks,
    planningNotes: [
      "The automated checks cover only the structured limits above. The communication goal and written planning constraints need separate discussion or a network exercise.",
      `Communication goal: ${teacher.communicationGoal}`,
      ...teacher.constraints,
    ],
  };
}

export type RadioBand = "HF" | "VHF" | "UHF" | "MICROWAVE";
const bandFrequencies: Record<RadioBand, number> = {
  HF: BAND_EXTERNAL_NOISE_DEFAULTS.HF.frequencyHz,
  VHF: BAND_EXTERNAL_NOISE_DEFAULTS.VHF.frequencyHz,
  UHF: BAND_EXTERNAL_NOISE_DEFAULTS.UHF.frequencyHz,
  MICROWAVE: BAND_EXTERNAL_NOISE_DEFAULTS.MICROWAVE.frequencyHz,
};

export function switchScenarioBand(
  scenario: Scenario,
  band: RadioBand,
): Scenario {
  const next = structuredClone(scenario);
  next.frequencyHz = bandFrequencies[band];
  if (band === "HF") {
    next.environment =
      scenario.environment.model === "hf-skywave"
        ? structuredClone(scenario.environment)
        : {
            ...createMission("HF").environment,
            temperatureK: scenario.environment.temperatureK,
          };
    next.modeId = "ssb";
    next.receiver.bandwidthHz = 2400;
  } else {
    next.environment =
      scenario.environment.model === "vhf-terrain"
        ? structuredClone(scenario.environment)
        : {
            model: "vhf-terrain",
            temperatureK: scenario.environment.temperatureK,
            effectiveEarthRadiusFactor: 4 / 3,
            ...(scenario.environment.externalNoiseDb === undefined
              ? {}
              : { externalNoiseDb: scenario.environment.externalNoiseDb }),
          };
    next.modeId = "fm-voice";
    next.receiver.bandwidthHz = 12500;
  }
  next.environment.externalNoiseDb =
    BAND_EXTERNAL_NOISE_DEFAULTS[band].noiseFactorDb;
  return next;
}

export function switchPropagationModel(
  scenario: Scenario,
  model: EnvironmentConfig["model"],
): Scenario {
  if (model === scenario.environment.model) return structuredClone(scenario);
  if (model === "hf-skywave") {
    const next = switchScenarioBand(scenario, "HF");
    if (scenario.frequencyHz >= 1e6 && scenario.frequencyHz <= 30e6)
      next.frequencyHz = scenario.frequencyHz;
    next.environment.externalNoiseDb =
      defaultExternalNoiseDbForFrequency(next.frequencyHz) ??
      next.environment.externalNoiseDb ??
      0;
    return next;
  }
  return {
    ...structuredClone(scenario),
    environment: {
      model,
      temperatureK: scenario.environment.temperatureK,
      externalNoiseDb:
        defaultExternalNoiseDbForFrequency(scenario.frequencyHz) ??
        scenario.environment.externalNoiseDb ??
        0,
      ...(model === "vhf-terrain" ? { effectiveEarthRadiusFactor: 4 / 3 } : {}),
    } as EnvironmentConfig,
  };
}

export interface ComparisonMeaning {
  samePhysics: boolean;
  bothPathsAvailable: boolean;
  quantitativeComparison: boolean;
  label: string;
  explanation: string;
}
export function compareExperimentMeaning(
  a: { physics?: PhysicsSettings; result: SimulationResult },
  b: { physics?: PhysicsSettings; result: SimulationResult },
): ComparisonMeaning {
  const settings = (physics?: PhysicsSettings) =>
    physics?.mode === "fantasy"
      ? [
          "fantasy",
          physics.disableEarthCurvature,
          physics.removeIonosphere,
          physics.disableFreeSpaceSpreading,
          physics.speedOfLightMultiplier,
        ]
      : ["real"];
  const samePhysics =
    JSON.stringify(settings(a.physics)) === JSON.stringify(settings(b.physics));
  const bothPathsAvailable =
    a.result.propagationAvailable && b.result.propagationAvailable;
  return {
    samePhysics,
    bothPathsAvailable,
    quantitativeComparison: samePhysics && bothPathsAvailable,
    label: !samePhysics
      ? "Different universes"
      : !bothPathsAvailable
        ? "Hypothetical path budget"
        : a.physics?.mode === "fantasy"
          ? "Same fantasy assumptions"
          : "Same physical model",
    explanation: !samePhysics
      ? "A and B use different physical assumptions. Their difference is a fictional model experiment, not a realizable engineering improvement."
      : !bothPathsAvailable
        ? "At least one route is unavailable. A numerical power or margin difference does not prove a received signal or a restored path."
        : a.physics?.mode === "fantasy"
          ? "Both designs use the same fictional rules. These comparisons do not predict our universe."
          : "Both routes exist under the same physical rules. Compare model assumptions as well as the numeric differences.",
  };
}
