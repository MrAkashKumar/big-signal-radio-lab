export const DEFAULT_TEXT_MODEL = "gpt-5.4-mini";
export const DEFAULT_VOICE_MODEL = "gpt-realtime-2.1-mini";
export const DEFAULT_VOICE_TUNING = {
  threshold: 0.7,
  silenceMs: 1000,
  noiseReduction: "near_field" as "near_field" | "far_field",
};
export type VoiceTuning = typeof DEFAULT_VOICE_TUNING;

export function readVoiceTuning(
  env: Record<string, string | undefined>,
): VoiceTuning {
  function number(name: string, fallback: number, min: number, max: number) {
    const raw = env[name];
    if (!raw?.trim()) return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max)
      throw new Error(`${name} must be between ${min} and ${max}.`);
    return value;
  }
  const noiseReduction =
    env.OPENAI_VOICE_NOISE_REDUCTION?.trim() || "near_field";
  if (noiseReduction !== "near_field" && noiseReduction !== "far_field")
    throw new Error(
      "OPENAI_VOICE_NOISE_REDUCTION must be near_field or far_field.",
    );
  const silenceMs = number("OPENAI_VOICE_SILENCE_MS", 1000, 300, 3000);
  if (!Number.isInteger(silenceMs))
    throw new Error("OPENAI_VOICE_SILENCE_MS must be a whole number.");
  return {
    threshold: number("OPENAI_VOICE_THRESHOLD", 0.7, 0.1, 0.95),
    silenceMs,
    noiseReduction,
  };
}
