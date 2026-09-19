import { describe, expect, it } from "vitest";
import { DEFAULT_VOICE_TUNING, readVoiceTuning } from "./tuning";

describe("voice tuning configuration", () => {
  it("uses defaults when overrides are missing or blank", () => {
    expect(readVoiceTuning({})).toEqual(DEFAULT_VOICE_TUNING);
    expect(
      readVoiceTuning({
        OPENAI_VOICE_THRESHOLD: " ",
        OPENAI_VOICE_SILENCE_MS: "",
        OPENAI_VOICE_NOISE_REDUCTION: "\t",
      }),
    ).toEqual(DEFAULT_VOICE_TUNING);
  });

  it("parses explicit overrides and preserves supported boundary values", () => {
    expect(
      readVoiceTuning({
        OPENAI_VOICE_THRESHOLD: " 0.85 ",
        OPENAI_VOICE_SILENCE_MS: "1500",
        OPENAI_VOICE_NOISE_REDUCTION: " far_field ",
      }),
    ).toEqual({
      threshold: 0.85,
      silenceMs: 1500,
      noiseReduction: "far_field",
    });
    for (const [threshold, silenceMs] of [
      [0.1, 300],
      [0.95, 3000],
    ]) {
      expect(
        readVoiceTuning({
          OPENAI_VOICE_THRESHOLD: String(threshold),
          OPENAI_VOICE_SILENCE_MS: String(silenceMs),
        }),
      ).toMatchObject({ threshold, silenceMs });
    }
  });

  it.each([
    ["OPENAI_VOICE_THRESHOLD", "0.09"],
    ["OPENAI_VOICE_THRESHOLD", "0.96"],
    ["OPENAI_VOICE_THRESHOLD", "NaN"],
    ["OPENAI_VOICE_THRESHOLD", "Infinity"],
    ["OPENAI_VOICE_SILENCE_MS", "299"],
    ["OPENAI_VOICE_SILENCE_MS", "3001"],
    ["OPENAI_VOICE_SILENCE_MS", "1000.5"],
    ["OPENAI_VOICE_SILENCE_MS", "quiet"],
    ["OPENAI_VOICE_NOISE_REDUCTION", "off"],
  ])(
    "rejects invalid %s=%s instead of silently changing sensitivity",
    (name, value) => {
      expect(() => readVoiceTuning({ [name]: value })).toThrow(name);
    },
  );
});
