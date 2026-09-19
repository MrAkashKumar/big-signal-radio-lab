import {
  decodeExperiment,
  parseExperiment,
  type CourseProgress,
  type PortableExperiment,
} from "../../../packages/missions/product";
import { lessons, getLessonScenario } from "../../../content/lessons";
import {
  validateScenario,
  type Scenario,
} from "../../../packages/simulation/src";
import { parseSettings } from "./missions";
export const STORAGE_KEY = "bigsignal-product-v1";
export interface ProductState {
  onboarded: boolean;
  experiment: PortableExperiment;
  saved: PortableExperiment[];
  progress: CourseProgress;
  activeLesson: string | null;
  applicationBaseline?: Scenario;
}
export function defaultExperiment(): PortableExperiment {
  return {
    format: "bigsignal",
    version: 1,
    title: "My first radio link",
    scenario: getLessonScenario(lessons[0].id),
    settings: { graphics: "NORMAL", mode: "learn" },
    lesson: null,
    teacher: null,
  };
}
export function loadProduct(): ProductState {
  const fallback: ProductState = {
    onboarded: false,
    experiment: defaultExperiment(),
    saved: [],
    progress: {},
    activeLesson: null,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const old = localStorage.getItem("bigsignal-v1");
      if (old) {
        const legacy = parseSettings(JSON.parse(old));
        fallback.experiment.scenario = legacy.scenario;
        fallback.experiment.settings.graphics = legacy.graphics;
        fallback.experiment.settings.mode = "lab";
        fallback.onboarded = true;
      }
      return fallback;
    }
    const value = JSON.parse(raw);
    let experiment = fallback.experiment;
    try {
      experiment = decodeExperiment(JSON.stringify(value.experiment));
    } catch {
      /* Recover the saved notebook independently of a damaged working experiment. */
    }
    const saved = Array.isArray(value.saved)
      ? value.saved.slice(0, 50).flatMap((s: unknown) => {
          try {
            return [parseExperiment(s)];
          } catch {
            return [];
          }
        })
      : [];
    const progress: CourseProgress = {};
    for (const l of lessons) {
      const p = value.progress?.[l.id];
      if (
        p &&
        Number.isSafeInteger(p.attempts) &&
        p.attempts >= 0 &&
        (p.predictionIndex === null ||
          (Number.isInteger(p.predictionIndex) &&
            p.predictionIndex >= 0 &&
            p.predictionIndex < l.prediction.choices.length)) &&
        (p.transferIndex === null ||
          (Number.isInteger(p.transferIndex) &&
            p.transferIndex >= 0 &&
            p.transferIndex < l.transfer.choices.length))
      )
        progress[l.id] = {
          predictionIndex: p.predictionIndex,
          attempts: p.attempts,
          transferIndex: p.transferIndex,
          applied: p.applied === true,
        };
    }
    let applicationBaseline: Scenario | undefined;
    try {
      if (value.applicationBaseline)
        applicationBaseline = validateScenario(value.applicationBaseline);
    } catch {}
    return {
      applicationBaseline,
      onboarded: value.onboarded === true,
      experiment,
      saved,
      progress,
      activeLesson: lessons.some((l) => l.id === value.activeLesson)
        ? value.activeLesson
        : null,
    };
  } catch {
    return fallback;
  }
}
export function downloadExperiment(experiment: PortableExperiment) {
  const blob = new Blob(
    [JSON.stringify(parseExperiment(experiment), null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    (experiment.title
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "experiment") + ".bigsignal.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
