import type { Scenario } from "../../../packages/contracts";
import { loadExampleScenario } from "../../../packages/simulation/examples/scenarios";
import { validateScenario } from "../../../packages/simulation/src";

export type Prediction = "good" | "marginal" | "failed";
export type Graphics = "BIG" | "NORMAL" | "POTATO";
export type Band = "VHF" | "HF";
export type Settings = {
  band: Band;
  scenario: Scenario;
  graphics: Graphics;
  prediction: Prediction | null;
  attempts: number;
};

export function createMission(band: Band): Scenario {
  const scenario = loadExampleScenario(band === "VHF" ? "vhf-ridge" : "hf-day");
  if (band === "HF") {
    scenario.id = "hf-expedition";
    scenario.title = "Singapore to Tokyo";
    scenario.transmitter.position = { latitudeDeg: 1.35, longitudeDeg: 103.8, altitudeM: 0 };
    scenario.receiver.position = { latitudeDeg: 35.7, longitudeDeg: 139.7, altitudeM: 0 };
    scenario.time.utcIso = "2026-09-13T04:00:00.000Z";
  }
  return scenario;
}

export function defaultSettings(): Settings {
  return { band: "VHF", scenario: createMission("VHF"), graphics: "NORMAL", prediction: null, attempts: 0 };
}

export function parseSettings(input: unknown): Settings {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid settings");
  const value = input as Record<string, unknown>;
  if (
    (value.band !== "VHF" && value.band !== "HF") ||
    (value.graphics !== "BIG" && value.graphics !== "NORMAL" && value.graphics !== "POTATO") ||
    (value.prediction !== null && value.prediction !== "good" && value.prediction !== "marginal" && value.prediction !== "failed") ||
    typeof value.attempts !== "number" || !Number.isSafeInteger(value.attempts) || value.attempts < 0
  ) throw new Error("Invalid settings");
  const scenario = validateScenario(value.scenario);
  const expectedModel = value.band === "VHF" ? "vhf-terrain" : "hf-skywave";
  if (scenario.environment.model !== expectedModel) throw new Error("Saved experiment uses an outdated or mismatched propagation model");
  if (value.band === "VHF" ? scenario.frequencyHz < 30e6 || scenario.frequencyHz > 450e6 : scenario.frequencyHz < 3e6 || scenario.frequencyHz > 30e6) {
    throw new Error("Saved frequency is outside the selected band controls");
  }
  return { band: value.band, scenario, graphics: value.graphics, prediction: value.prediction, attempts: value.attempts };
}
