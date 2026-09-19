import { describe, expect, it } from "vitest";
import { lessons, getLessonScenario } from "../../content/lessons";
import { disasters } from "../../content/disasters";
import { explanations } from "../../content/explanations";
import { simulateScenario, validateScenario } from "../simulation/src";
import {
  assessQuestion,
  hasAppliedDesign,
  controlIds,
  decodeExperiment,
  emptyLessonProgress,
  encodeExperiment,
  getMastery,
  isLessonUnlocked,
  parseExperiment,
  type PortableExperiment,
} from "./product";

function experiment(): PortableExperiment {
  return {
    format: "bigsignal",
    version: 1,
    title: "School rooftop exercise",
    scenario: getLessonScenario("what-is-radio"),
    settings: { graphics: "POTATO", mode: "learn" },
    lesson: {
      id: "what-is-radio",
      notes: "Explain how this route avoids the failed backhaul.",
    },
    teacher: {
      objective: "Connect the school and shelter.",
      environment: "Nearby buildings",
      frequencyOptionsHz: [145e6],
      equipment: ["Portable radio", "Vertical antenna"],
      communicationGoal: "Short status reports",
      constraints: ["No more than 5 W"],
      targetConcepts: ["independent communications"],
      hints: ["Inspect clearance"],
      success: {
        minimumMarginDb: 10,
        maximumPowerW: 5,
        maximumHeightM: 15,
        minimumRuntimeHours: 8,
      },
    },
  };
}

describe("authored learning course", () => {
  it("has the complete beginner and intermediate course and explicit advanced coverage", () => {
    expect(lessons.filter((lesson) => lesson.tier === "beginner")).toHaveLength(
      10,
    );
    expect(
      lessons.filter((lesson) => lesson.tier === "intermediate"),
    ).toHaveLength(8);
    expect(lessons.filter((lesson) => lesson.tier === "advanced")).toHaveLength(
      14,
    );
    expect(new Set(lessons.map((lesson) => lesson.id)).size).toBe(
      lessons.length,
    );
    const concepts = new Set(lessons.flatMap((lesson) => lesson.concepts));
    for (const topic of [
      "impedance",
      "resistance",
      "reactance",
      "resonance",
      "SWR",
      "return loss",
      "mismatch loss",
      "radiation resistance",
      "efficiency",
      "complex impedance",
      "Smith chart",
      "antenna height",
      "ground effects",
      "noise figure",
      "receiver sensitivity",
      "dynamic range",
      "AGC",
      "ADC clipping",
      "front-end overload",
      "intermodulation",
      "uncertainty",
      "model validity",
      "multi-hop HF",
      "NVIS",
      "ground wave",
      "sporadic-E",
      "multipath",
      "fading",
      "Doppler",
      "satellite link",
    ])
      expect(concepts.has(topic), topic).toBe(true);
  });

  for (const lesson of lessons) {
    it(`${lesson.id} is a complete lesson backed by a valid deterministic scenario`, () => {
      expect(lesson.objective.length).toBeGreaterThan(30);
      expect(lesson.experiment.length).toBeGreaterThanOrEqual(3);
      expect(lesson.explanation.length).toBeGreaterThan(150);
      expect(lesson.misconception.length).toBeGreaterThan(30);
      expect(lesson.observation.length).toBeGreaterThan(40);
      expect(lesson.minutes).toBeGreaterThanOrEqual(3);
      expect(lesson.minutes).toBeLessThanOrEqual(8);
      expect(
        lesson.controls.every((control) => controlIds.includes(control)),
      ).toBe(true);
      if (lesson.simulationStatus === "conceptual")
        expect(lesson.modelNote?.length).toBeGreaterThan(30);
      const scenario = validateScenario(getLessonScenario(lesson.id));
      expect(scenario.difficulty).toBe(lesson.tier);
      expect(simulateScenario(scenario)).toEqual(simulateScenario(scenario));
      for (const key of simulateScenario(scenario).explanationKeys)
        expect(explanations[key], key).toBeDefined();
      for (const question of [lesson.prediction, lesson.transfer]) {
        expect(question.choices.length).toBeGreaterThanOrEqual(2);
        expect(assessQuestion(question, question.correctIndex).correct).toBe(
          true,
        );
        const wrongIndex =
          (question.correctIndex + 1) % question.choices.length;
        expect(assessQuestion(question, wrongIndex).correct).toBe(false);
        expect(assessQuestion(question, wrongIndex).feedback).toContain(
          question.explanation,
        );
      }
      for (const id of lesson.prerequisites) {
        const index = lessons.findIndex((candidate) => candidate.id === id);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(lessons.indexOf(lesson));
      }
    });
  }

  it("returns independent scenarios and rejects unknown lessons", () => {
    const first = getLessonScenario("what-is-radio");
    first.transmitter.powerDbm = 100;
    expect(getLessonScenario("what-is-radio").transmitter.powerDbm).not.toBe(
      100,
    );
    expect(() => getLessonScenario("made-up")).toThrow("Unknown lesson");
  });

  it("actually demonstrates first contact, geometry over power, and loss of a skywave path", () => {
    expect(simulateScenario(getLessonScenario("what-is-radio")).success).toBe(
      "good",
    );
    const baseline = getLessonScenario("hill-exists");
    const power = structuredClone(baseline);
    const height = structuredClone(baseline);
    power.transmitter.powerDbm += 10;
    height.transmitter.antenna.heightM = 15;
    expect(simulateScenario(height).linkMarginDb).toBeGreaterThan(
      simulateScenario(power).linkMarginDb,
    );
    const skywave = getLessonScenario("sky-declined");
    expect(simulateScenario(skywave).propagationAvailable).toBe(true);
    skywave.frequencyHz = 30e6;
    expect(simulateScenario(skywave).propagationAvailable).toBe(false);
  });

  it("does not promise free margin when CW bandwidth is narrowed", () => {
    const wide = getLessonScenario("noise-too");
    const narrow = structuredClone(wide);
    narrow.receiver.bandwidthHz = 500;
    expect(simulateScenario(narrow).snrDb).toBeGreaterThan(
      simulateScenario(wide).snrDb,
    );
    expect(simulateScenario(narrow).linkMarginDb).toBeCloseTo(
      simulateScenario(wide).linkMarginDb,
      8,
    );
  });

  it("explains the people and infrastructure tradeoffs in every disaster", () => {
    expect(disasters).toHaveLength(6);
    for (const disaster of disasters) {
      expect(disaster.whyRadio.length).toBeGreaterThan(180);
      expect(disaster.participants.length).toBeGreaterThanOrEqual(2);
      expect(disaster.whatFailed.length).toBeGreaterThanOrEqual(2);
      expect(disaster.information.length).toBeGreaterThanOrEqual(2);
      expect(disaster.constraints.length).toBeGreaterThanOrEqual(2);
      expect(disaster.hints).toHaveLength(3);
    }
  });
});

describe("learning evidence", () => {
  const lesson = lessons[0]!;
  it("requires an experiment and a correct transfer answer before demonstration", () => {
    const initial = emptyLessonProgress();
    expect(getMastery(lesson, initial)).toBe("UNSEEN");
    expect(getMastery(lesson, { ...initial, predictionIndex: 0 })).toBe(
      "ENCOUNTERED",
    );
    expect(
      getMastery(lesson, {
        ...initial,
        transferIndex: lesson.transfer.correctIndex,
      }),
    ).toBe("UNSEEN");
    expect(
      getMastery(lesson, { ...initial, attempts: 1, transferIndex: 0 }),
    ).toBe("ENCOUNTERED");
    const demonstrated = {
      ...initial,
      attempts: 1,
      transferIndex: lesson.transfer.correctIndex,
    };
    expect(getMastery(lesson, demonstrated)).toBe("DEMONSTRATED");
    expect(getMastery(lesson, { ...demonstrated, applied: true })).toBe(
      "APPLIED",
    );
  });
  it("unlocks a successor from demonstrated evidence and rejects invalid choices", () => {
    expect(isLessonUnlocked(lesson, lessons, {})).toBe(true);
    expect(isLessonUnlocked(lessons[1]!, lessons, {})).toBe(false);
    expect(
      isLessonUnlocked(lessons[1]!, lessons, {
        [lesson.id]: {
          ...emptyLessonProgress(),
          attempts: 1,
          transferIndex: lesson.transfer.correctIndex,
        },
      }),
    ).toBe(true);
    expect(() => assessQuestion(lesson.transfer, -1)).toThrow();
    expect(() => assessQuestion(lesson.transfer, NaN)).toThrow();
    expect(() => assessQuestion(lesson.transfer, 100)).toThrow();
  });
});

describe("applied design evidence", () => {
  const lesson = lessons[0]!;
  const progress = {
    ...emptyLessonProgress(),
    attempts: 2,
    transferIndex: lesson.transfer.correctIndex,
  };
  const baseline = getLessonScenario(lesson.id);
  it("requires a supported real link after a physical change from the actual guided snapshot", () => {
    const current = structuredClone(baseline);
    current.transmitter.powerDbm += 3;
    const result = simulateScenario(current);
    expect(hasAppliedDesign(lesson, progress, baseline, current, result)).toBe(
      true,
    );
    expect(hasAppliedDesign(lesson, progress, undefined, current, result)).toBe(
      false,
    );
    expect(
      hasAppliedDesign(
        lesson,
        emptyLessonProgress(),
        baseline,
        current,
        result,
      ),
    ).toBe(false);
    expect(
      hasAppliedDesign(lesson, progress, baseline, current, {
        ...result,
        success: "failed",
      }),
    ).toBe(false);
    expect(
      hasAppliedDesign(lesson, progress, baseline, current, {
        ...result,
        propagationAvailable: false,
      }),
    ).toBe(false);
    expect(
      hasAppliedDesign(lesson, progress, baseline, current, result, {
        mode: "fantasy",
        disableEarthCurvature: false,
        removeIonosphere: false,
        disableFreeSpaceSpreading: false,
        speedOfLightMultiplier: 1,
      }),
    ).toBe(false);
  });
  it("does not credit replaying a completed guided design unchanged", () => {
    const guidedSolution = structuredClone(baseline);
    guidedSolution.transmitter.powerDbm += 6;
    expect(
      hasAppliedDesign(
        lesson,
        progress,
        guidedSolution,
        structuredClone(guidedSolution),
        simulateScenario(guidedSolution),
      ),
    ).toBe(false);
  });
  it("ignores metadata, unsolved geometry labels, passive cable length, and irrelevant time", () => {
    const metadataOnly = structuredClone(baseline);
    metadataOnly.id = "new-id";
    metadataOnly.title = "My clever new title";
    metadataOnly.difficulty = "advanced";
    metadataOnly.transmitter.antenna.id = "renamed";
    metadataOnly.transmitter.antenna.type = "custom";
    metadataOnly.transmitter.feedline.lengthM = 999;
    metadataOnly.time.utcIso = "2026-09-13T21:00:00.000Z";
    expect(
      hasAppliedDesign(
        lesson,
        progress,
        baseline,
        metadataOnly,
        simulateScenario(metadataOnly),
      ),
    ).toBe(false);
    metadataOnly.environment = {
      effectiveEarthRadiusFactor: 4 / 3,
      temperatureK: 290,
      model: "vhf-terrain",
      externalNoiseDb: 6,
    };
    expect(
      hasAppliedDesign(
        lesson,
        progress,
        baseline,
        metadataOnly,
        simulateScenario(metadataOnly),
      ),
    ).toBe(false);
  });
  it("recognizes an HF time change but ignores polarization the HF model does not resolve", () => {
    const hf = getLessonScenario("sky-bounce");
    const current = structuredClone(hf);
    current.transmitter.antenna.polarization = "vertical";
    expect(
      hasAppliedDesign(
        lesson,
        progress,
        hf,
        current,
        simulateScenario(current),
      ),
    ).toBe(false);
    current.time.utcIso = "2026-09-13T10:00:00.000Z";
    expect(
      hasAppliedDesign(
        lesson,
        progress,
        hf,
        current,
        simulateScenario(current),
      ),
    ).toBe(true);
  });
});

describe("portable classroom files", () => {
  it("roundtrips a complete teacher challenge with objectives and constraints", () => {
    const original = experiment();
    const decoded = decodeExperiment(encodeExperiment(original));
    expect(decoded).toEqual({ ...original, physics: { mode: "real" } });
    expect(decoded.scenario).not.toBe(original.scenario);
  });
  it("retains fantasy assumptions and never silently restores them as real physics", () => {
    const original: PortableExperiment = {
      ...experiment(),
      settings: { mode: "unreasonable", graphics: "NORMAL" },
      physics: {
        mode: "fantasy",
        disableEarthCurvature: true,
        removeIonosphere: false,
        disableFreeSpaceSpreading: true,
        speedOfLightMultiplier: 0.5,
      },
    };
    expect(decodeExperiment(encodeExperiment(original)).physics).toEqual(
      original.physics,
    );
    expect(() =>
      parseExperiment({
        ...original,
        physics: { ...original.physics, disableEarthCurvature: "yes" },
      }),
    ).toThrow();
    expect(() =>
      parseExperiment({
        ...original,
        physics: { ...original.physics, speedOfLightMultiplier: Infinity },
      }),
    ).toThrow();
    expect(() =>
      parseExperiment({
        ...original,
        physics: { ...original.physics, speedOfLightMultiplier: 0 },
      }),
    ).toThrow();
    expect(() =>
      parseExperiment({ ...original, physics: { mode: "mystery" } }),
    ).toThrow();
  });
  it("validates version, bounded input, scenario, and teacher requirements", () => {
    const original = experiment();
    expect(() => decodeExperiment("not json")).toThrow();
    expect(() => decodeExperiment(" ".repeat(1_000_001))).toThrow("1 MB");
    expect(() => parseExperiment({ ...original, version: 2 })).toThrow();
    expect(() =>
      parseExperiment({
        ...original,
        scenario: { ...original.scenario, frequencyHz: -1 },
      }),
    ).toThrow();
    expect(() =>
      parseExperiment({
        ...original,
        teacher: { ...original.teacher, frequencyOptionsHz: [NaN] },
      }),
    ).toThrow();
    expect(() =>
      parseExperiment({
        ...original,
        teacher: {
          ...original.teacher,
          success: { minimumMarginDb: 10, maximumPowerW: -1 },
        },
      }),
    ).toThrow();
    expect(() =>
      parseExperiment({
        ...original,
        settings: { graphics: "unknown", mode: "learn" },
      }),
    ).toThrow();
  });
});
