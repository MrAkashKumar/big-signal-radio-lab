import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lessons, getLessonScenario } from "../../../content/lessons";
import {
  parseExperiment,
  type PortableExperiment,
} from "../../../packages/missions/product";
import { DEFAULT_FANTASY } from "../../../packages/simulation/src";
import { defaultSettings } from "./missions";
import { defaultExperiment, loadProduct, STORAGE_KEY } from "./productStorage";

let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
  });
});
afterEach(() => vi.unstubAllGlobals());
const working = (): PortableExperiment => ({
  ...defaultExperiment(),
  title: "Rooftop notebook",
  settings: { mode: "lab", graphics: "POTATO" },
});
const validProgress = () => ({
  predictionIndex: 0,
  transferIndex: lessons[0].transfer.correctIndex,
  attempts: 2,
  applied: true,
});
const persist = (value: unknown) =>
  storage.set(STORAGE_KEY, JSON.stringify(value));

describe("product persistence recovery", () => {
  it("provides an untouched first-run lesson without creating storage", () => {
    const result = loadProduct();
    expect(result.onboarded).toBe(false);
    expect(result.experiment).toEqual(defaultExperiment());
    expect(result.saved).toEqual([]);
    expect(result.progress).toEqual({});
    expect(storage.size).toBe(0);
  });
  it("recovers saved experiments and learning evidence when the working scenario is damaged", () => {
    const saved = working();
    const broken = working();
    broken.scenario.frequencyHz = -1;
    persist({
      onboarded: true,
      experiment: broken,
      saved: [saved],
      progress: { [lessons[0].id]: validProgress() },
      activeLesson: lessons[0].id,
    });
    const result = loadProduct();
    expect(result.experiment).toEqual(defaultExperiment());
    expect(result.saved).toEqual([parseExperiment(saved)]);
    expect(result.progress[lessons[0].id]).toEqual(validProgress());
    expect(result.onboarded).toBe(true);
  });
  it("drops only corrupted notebook entries and keeps their valid neighbors", () => {
    persist({
      experiment: working(),
      saved: [
        { broken: true },
        working(),
        null,
        { ...working(), title: "Second valid design" },
      ],
      progress: {},
    });
    expect(loadProduct().saved.map((item) => item.title)).toEqual([
      "Rooftop notebook",
      "Second valid design",
    ]);
  });
  it("bounds the notebook to its 50 most recent entries", () => {
    persist({
      experiment: working(),
      saved: Array.from({ length: 70 }, (_, i) => ({
        ...working(),
        title: `Experiment ${i}`,
      })),
    });
    expect(loadProduct().saved).toHaveLength(50);
    expect(loadProduct().saved.at(-1)!.title).toBe("Experiment 49");
  });
  it.each(["not json", "null", "42"])(
    "recovers from invalid root storage %s",
    (raw) => {
      storage.set(STORAGE_KEY, raw);
      expect(() => loadProduct()).not.toThrow();
      expect(loadProduct().experiment).toEqual(defaultExperiment());
    },
  );
  it("falls back safely when browser storage is inaccessible", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Storage denied");
      },
    });
    expect(loadProduct().experiment).toEqual(defaultExperiment());
  });
});

describe("legacy settings migration", () => {
  it("imports existing valid radio settings and graphics into the free lab", () => {
    const legacy = defaultSettings();
    legacy.graphics = "POTATO";
    legacy.scenario.transmitter.powerDbm = 40;
    storage.set("bigsignal-v1", JSON.stringify(legacy));
    const result = loadProduct();
    expect(result.onboarded).toBe(true);
    expect(result.experiment.settings).toEqual({
      mode: "lab",
      graphics: "POTATO",
    });
    expect(result.experiment.scenario).toEqual(legacy.scenario);
    expect(result.saved).toEqual([]);
  });
  it("prefers product state over older stored demo settings", () => {
    storage.set("bigsignal-v1", JSON.stringify(defaultSettings()));
    persist({ experiment: working(), onboarded: true });
    expect(loadProduct().experiment.title).toBe("Rooftop notebook");
  });
  it("does not import an incompatible legacy band/model pairing", () => {
    const legacy = defaultSettings();
    legacy.band = "HF";
    storage.set("bigsignal-v1", JSON.stringify(legacy));
    expect(loadProduct().onboarded).toBe(false);
    expect(loadProduct().experiment).toEqual(defaultExperiment());
  });
});

describe("learning evidence boundaries", () => {
  it.each([
    { predictionIndex: -1 },
    { predictionIndex: 1000 },
    { predictionIndex: 0.5 },
    { transferIndex: -1 },
    { transferIndex: 1000 },
    { transferIndex: "0" },
    { attempts: -1 },
    { attempts: 0.25 },
    { attempts: Number.MAX_SAFE_INTEGER + 1 },
  ])(
    "rejects malformed lesson progress %o without discarding the notebook",
    (broken) => {
      persist({
        experiment: working(),
        saved: [working()],
        progress: { [lessons[0].id]: { ...validProgress(), ...broken } },
      });
      const result = loadProduct();
      expect(result.progress[lessons[0].id]).toBeUndefined();
      expect(result.saved).toHaveLength(1);
    },
  );
  it("keeps unanswered valid lessons and treats applied as a strict boolean", () => {
    persist({
      experiment: working(),
      progress: {
        [lessons[0].id]: {
          predictionIndex: null,
          transferIndex: null,
          attempts: 0,
          applied: "true",
        },
      },
    });
    expect(loadProduct().progress[lessons[0].id]).toEqual({
      predictionIndex: null,
      transferIndex: null,
      attempts: 0,
      applied: false,
    });
  });
  it("does not retain removed or arbitrary lesson identifiers", () => {
    persist({
      experiment: working(),
      activeLesson: "unknown-lesson",
      progress: {
        "unknown-lesson": validProgress(),
        [lessons[0].id]: validProgress(),
      },
    });
    const result = loadProduct();
    expect(result.activeLesson).toBeNull();
    expect(Object.keys(result.progress)).toEqual([lessons[0].id]);
  });
  it("restores a validated application baseline after reload", () => {
    const applicationBaseline = getLessonScenario(lessons[0].id);
    applicationBaseline.transmitter.powerDbm = 30;
    persist({
      experiment: working(),
      applicationBaseline,
      progress: { [lessons[0].id]: validProgress() },
    });
    expect(loadProduct().applicationBaseline).toEqual(applicationBaseline);
  });
  it("discards an invalid application baseline independently", () => {
    const applicationBaseline = getLessonScenario(lessons[0].id);
    applicationBaseline.transmitter.antenna.heightM = -1;
    persist({ experiment: working(), applicationBaseline, saved: [working()] });
    const result = loadProduct();
    expect(result.applicationBaseline).toBeUndefined();
    expect(result.saved).toHaveLength(1);
    expect(result.experiment.title).toBe("Rooftop notebook");
  });
});

describe("portable modes and physics persist without reinterpretation", () => {
  it.each(["learn", "lab", "disaster", "unreasonable"] as const)(
    "retains a parsed %s experiment across storage",
    (mode) => {
      const experiment: PortableExperiment = {
        ...working(),
        settings: { mode, graphics: "BIG" },
        physics:
          mode === "unreasonable"
            ? { ...DEFAULT_FANTASY, disableFreeSpaceSpreading: true }
            : { mode: "real" },
      };
      persist({ experiment, saved: [experiment] });
      const result = loadProduct();
      expect(result.experiment.settings).toEqual(experiment.settings);
      expect(result.experiment.physics).toEqual(experiment.physics);
      expect(result.saved[0]).toEqual(parseExperiment(experiment));
    },
  );
  it("does not silently turn invalid fantasy laws into a valid saved experiment", () => {
    const invalid = {
      ...working(),
      physics: { ...DEFAULT_FANTASY, speedOfLightMultiplier: 0 },
    };
    persist({ experiment: working(), saved: [invalid, working()] });
    expect(loadProduct().saved).toHaveLength(1);
  });
  it("recovers independently from an unsupported current product mode", () => {
    persist({
      experiment: {
        ...working(),
        settings: { graphics: "NORMAL", mode: "admin" },
      },
      saved: [working()],
    });
    const result = loadProduct();
    expect(result.experiment).toEqual(defaultExperiment());
    expect(result.saved).toHaveLength(1);
  });
});
