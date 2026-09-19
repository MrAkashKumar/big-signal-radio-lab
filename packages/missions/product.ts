import type { Difficulty, Scenario, SimulationResult } from "../contracts";
import { validateScenario } from "../simulation/src";
import type { PhysicsSettings } from "../simulation/src/laboratory";

export const controlIds = [
  "power",
  "frequency",
  "antenna",
  "height",
  "distance",
  "bandwidth",
  "mode",
  "feedline",
  "polarization",
  "noise",
  "time",
  "terrain",
] as const;
export type ControlId = (typeof controlIds)[number];
export type LessonScenarioId = "clear" | "ridge" | "hf" | "microwave";
export interface Question {
  question: string;
  choices: [string, string, ...string[]];
  correctIndex: number;
  explanation: string;
}
export interface Lesson {
  id: string;
  title: string;
  tier: Difficulty;
  number: number;
  minutes: number;
  objective: string;
  scenarioBrief: string;
  concepts: string[];
  prediction: Question;
  experiment: string[];
  observation: string;
  explanation: string;
  misconception: string;
  transfer: Question;
  controls: ControlId[];
  scenarioId: LessonScenarioId;
  simulationStatus: "modeled" | "conceptual";
  modelNote?: string;
  prerequisites: string[];
}
export type Mastery = "UNSEEN" | "ENCOUNTERED" | "DEMONSTRATED" | "APPLIED";
export interface LessonProgress {
  predictionIndex: number | null;
  attempts: number;
  transferIndex: number | null;
  applied: boolean;
}
export type CourseProgress = Record<string, LessonProgress>;
export function emptyLessonProgress(): LessonProgress {
  return {
    predictionIndex: null,
    attempts: 0,
    transferIndex: null,
    applied: false,
  };
}
export function assessQuestion(
  question: Question,
  index: number,
): { correct: boolean; feedback: string } {
  if (!Number.isInteger(index) || index < 0 || index >= question.choices.length)
    throw new RangeError("Choose an available answer.");
  const correct = index === question.correctIndex;
  return {
    correct,
    feedback: `${correct ? "You have it." : "Try this way of thinking."} ${question.explanation}`,
  };
}
export function getMastery(lesson: Lesson, progress?: LessonProgress): Mastery {
  if (
    !progress ||
    (progress.predictionIndex === null && progress.attempts === 0)
  )
    return "UNSEEN";
  if (
    progress.attempts > 0 &&
    progress.transferIndex === lesson.transfer.correctIndex
  )
    return progress.applied ? "APPLIED" : "DEMONSTRATED";
  return "ENCOUNTERED";
}
export function isLessonUnlocked(
  lesson: Lesson,
  allLessons: readonly Lesson[],
  progress: CourseProgress,
): boolean {
  return lesson.prerequisites.every((id) => {
    const prerequisite = allLessons.find((value) => value.id === id);
    if (!prerequisite) return false;
    return ["DEMONSTRATED", "APPLIED"].includes(
      getMastery(prerequisite, progress[id]),
    );
  });
}

function physicalConfiguration(scenario: Scenario): string {
  const antenna = (value: Scenario["transmitter"]["antenna"]) => ({
    gainDbi: value.gainDbi,
    heightM: value.heightM,
    polarization:
      scenario.environment.model === "hf-skywave" ? null : value.polarization,
  });
  const stable = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, stable(item)]),
      );
    return value;
  };
  return JSON.stringify(
    stable({
      frequencyHz: scenario.frequencyHz,
      modeId: scenario.modeId,
      transmitter: {
        position: scenario.transmitter.position,
        powerDbm: scenario.transmitter.powerDbm,
        antenna: antenna(scenario.transmitter.antenna),
        feedlineLossDb: scenario.transmitter.feedline.lossDb,
      },
      receiver: {
        position: scenario.receiver.position,
        antenna: antenna(scenario.receiver.antenna),
        feedlineLossDb: scenario.receiver.feedline.lossDb,
        bandwidthHz: scenario.receiver.bandwidthHz,
        noiseFigureDb: scenario.receiver.noiseFigureDb,
      },
      environment: scenario.environment,
      time: scenario.environment.model === "hf-skywave" ? scenario.time : null,
    }),
  );
}
export function hasAppliedDesign(
  lesson: Lesson,
  progress: LessonProgress,
  baseline: Scenario | undefined,
  current: Scenario,
  result: SimulationResult,
  physics: PhysicsSettings = { mode: "real" },
): boolean {
  return (
    baseline !== undefined &&
    ["DEMONSTRATED", "APPLIED"].includes(getMastery(lesson, progress)) &&
    physics.mode === "real" &&
    result.propagationAvailable &&
    result.success !== "failed" &&
    physicalConfiguration(baseline) !== physicalConfiguration(current)
  );
}

export interface TeacherChallenge {
  objective: string;
  environment: string;
  frequencyOptionsHz: number[];
  equipment: string[];
  communicationGoal: string;
  constraints: string[];
  targetConcepts: string[];
  hints: string[];
  success: {
    minimumMarginDb: number;
    maximumPowerW: number;
    minimumRuntimeHours?: number;
    maximumHeightM?: number;
  };
}
export interface PortableExperiment {
  format: "bigsignal";
  version: 1;
  title: string;
  scenario: Scenario;
  settings: {
    graphics: "BIG" | "NORMAL" | "POTATO";
    mode: "learn" | "lab" | "disaster" | "unreasonable";
  };
  lesson: { id: string; notes: string } | null;
  teacher: TeacherChallenge | null;
  physics?: PhysicsSettings;
}
function record(input: unknown, field: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error(`${field} must be an object.`);
  return Object.fromEntries(Object.entries(input));
}
function text(input: unknown, field: string, maximum = 2000): string {
  if (typeof input !== "string" || input.length > maximum)
    throw new Error(`${field} must be text of at most ${maximum} characters.`);
  return input;
}
function finite(
  input: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof input !== "number" ||
    !Number.isFinite(input) ||
    input < minimum ||
    input > maximum
  )
    throw new Error(`${field} is outside its allowed range.`);
  return input;
}
function strings(input: unknown, field: string): string[] {
  if (!Array.isArray(input) || input.length > 30)
    throw new Error(`${field} must contain at most 30 entries.`);
  return input.map((value) => text(value, field));
}
export function parseTeacherChallenge(input: unknown): TeacherChallenge {
  const value = record(input, "Teacher challenge");
  const success = record(value.success, "Success requirements");
  if (
    !Array.isArray(value.frequencyOptionsHz) ||
    value.frequencyOptionsHz.length > 30
  )
    throw new Error(
      "Frequency options must be an array of at most 30 entries.",
    );
  return {
    objective: text(value.objective, "Objective"),
    environment: text(value.environment, "Environment"),
    frequencyOptionsHz: value.frequencyOptionsHz.map((hz) =>
      finite(hz, "Frequency", 100000, 1e11),
    ),
    equipment: strings(value.equipment, "Equipment"),
    communicationGoal: text(value.communicationGoal, "Communication goal"),
    constraints: strings(value.constraints, "Constraints"),
    targetConcepts: strings(value.targetConcepts, "Target concepts"),
    hints: strings(value.hints, "Hints"),
    success: {
      minimumMarginDb: finite(
        success.minimumMarginDb,
        "Minimum margin",
        -100,
        200,
      ),
      maximumPowerW: finite(success.maximumPowerW, "Maximum power", 1e-6, 1e8),
      ...(success.minimumRuntimeHours === undefined
        ? {}
        : {
            minimumRuntimeHours: finite(
              success.minimumRuntimeHours,
              "Minimum runtime",
              0,
              100000,
            ),
          }),
      ...(success.maximumHeightM === undefined
        ? {}
        : {
            maximumHeightM: finite(
              success.maximumHeightM,
              "Maximum height",
              0,
              20000,
            ),
          }),
    },
  };
}
export function parsePhysicsSettings(input: unknown): PhysicsSettings {
  if (input === undefined) return { mode: "real" };
  const value = record(input, "Physics settings");
  if (value.mode === "real") return { mode: "real" };
  if (value.mode !== "fantasy") throw new Error("Unknown physics mode.");
  if (
    typeof value.disableEarthCurvature !== "boolean" ||
    typeof value.removeIonosphere !== "boolean" ||
    typeof value.disableFreeSpaceSpreading !== "boolean"
  )
    throw new Error("Fantasy switches must be boolean values.");
  return {
    mode: "fantasy",
    disableEarthCurvature: value.disableEarthCurvature,
    removeIonosphere: value.removeIonosphere,
    disableFreeSpaceSpreading: value.disableFreeSpaceSpreading,
    speedOfLightMultiplier: finite(
      value.speedOfLightMultiplier,
      "Speed of light multiplier",
      0.01,
      100,
    ),
  };
}
export function parseExperiment(input: unknown): PortableExperiment {
  const value = record(input, "Experiment");
  if (value.format !== "bigsignal" || value.version !== 1)
    throw new Error(
      "This file is not a supported B I G S I G N A L experiment.",
    );
  const settings = record(value.settings, "Settings");
  const graphics = settings.graphics;
  const mode = settings.mode;
  if (graphics !== "BIG" && graphics !== "NORMAL" && graphics !== "POTATO")
    throw new Error("Unknown graphics setting.");
  if (
    mode !== "learn" &&
    mode !== "lab" &&
    mode !== "disaster" &&
    mode !== "unreasonable"
  )
    throw new Error("Unknown product mode.");
  let lesson: PortableExperiment["lesson"] = null;
  if (value.lesson !== null && value.lesson !== undefined) {
    const metadata = record(value.lesson, "Lesson");
    lesson = {
      id: text(metadata.id, "Lesson ID", 100),
      notes: text(metadata.notes, "Lesson notes", 10000),
    };
  }
  return {
    format: "bigsignal",
    version: 1,
    title: text(value.title, "Title", 500),
    scenario: validateScenario(value.scenario),
    settings: { graphics, mode },
    lesson,
    physics: parsePhysicsSettings(value.physics),
    teacher:
      value.teacher === null || value.teacher === undefined
        ? null
        : parseTeacherChallenge(value.teacher),
  };
}
export function decodeExperiment(json: string): PortableExperiment {
  if (json.length > 1_000_000)
    throw new Error("Experiment files must be smaller than 1 MB.");
  return parseExperiment(JSON.parse(json));
}
export function encodeExperiment(experiment: PortableExperiment): string {
  return JSON.stringify(parseExperiment(experiment), null, 2);
}
