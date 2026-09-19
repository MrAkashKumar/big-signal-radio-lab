export type NoiseEnvironmentClass =
  | "quiet-rural"
  | "rural"
  | "thermal-baseline";
export type RadioNoiseBand = "HF" | "VHF" | "UHF" | "MICROWAVE";

export const ITU_R_P372_17_SOURCE_URL =
  "https://www.itu.int/rec/R-REC-P.372-17-202408-I/en";

export const ITU_R_P372_17_QUIET_RURAL = Object.freeze({
  environmentClass: "quiet-rural" as const,
  referenceTemperatureK: 290,
  validFrequencyRangeHz: [0.3e6, 30e6] as const,
  coefficientC: 53.6,
  coefficientD: 28.6,
  sourceUrl: ITU_R_P372_17_SOURCE_URL,
});

export function quietRuralNoiseFactorDb(frequencyHz: number): number {
  const [minimumHz, maximumHz] =
    ITU_R_P372_17_QUIET_RURAL.validFrequencyRangeHz;
  if (
    !Number.isFinite(frequencyHz) ||
    frequencyHz < minimumHz ||
    frequencyHz > maximumHz
  )
    throw new RangeError(
      `frequencyHz must be within [${minimumHz}, ${maximumHz}] for the ITU-R P.372-17 quiet-rural model`,
    );
  return (
    ITU_R_P372_17_QUIET_RURAL.coefficientC -
    ITU_R_P372_17_QUIET_RURAL.coefficientD *
      Math.log10(frequencyHz / 1e6)
  );
}

interface BandExternalNoiseDefaultBase {
  readonly band: RadioNoiseBand;
  readonly frequencyHz: number;
  readonly noiseFactorDb: number;
  readonly sourceUrl: string;
}

export type BandExternalNoiseDefault = BandExternalNoiseDefaultBase &
  (
    | {
        readonly environmentClass: Exclude<
          NoiseEnvironmentClass,
          "thermal-baseline"
        >;
        readonly basis: "itu-formula" | "itu-published-value";
      }
    | {
        readonly environmentClass: "thermal-baseline";
        readonly basis: "thermal-baseline";
      }
  );

export const BAND_EXTERNAL_NOISE_DEFAULTS: Readonly<
  Record<RadioNoiseBand, BandExternalNoiseDefault>
> = Object.freeze({
  HF: {
    band: "HF",
    frequencyHz: 7e6,
    environmentClass: "quiet-rural",
    noiseFactorDb: 29.43,
    basis: "itu-formula",
    sourceUrl: ITU_R_P372_17_SOURCE_URL,
  },
  VHF: {
    band: "VHF",
    frequencyHz: 146e6,
    environmentClass: "rural",
    noiseFactorDb: 6,
    basis: "itu-published-value",
    sourceUrl: ITU_R_P372_17_SOURCE_URL,
  },
  UHF: {
    band: "UHF",
    frequencyHz: 433e6,
    environmentClass: "thermal-baseline",
    noiseFactorDb: 0,
    basis: "thermal-baseline",
    sourceUrl: ITU_R_P372_17_SOURCE_URL,
  },
  MICROWAVE: {
    band: "MICROWAVE",
    frequencyHz: 2.4e9,
    environmentClass: "thermal-baseline",
    noiseFactorDb: 0,
    basis: "thermal-baseline",
    sourceUrl: ITU_R_P372_17_SOURCE_URL,
  },
});

export function defaultExternalNoiseDbForBand(band: RadioNoiseBand): number {
  return BAND_EXTERNAL_NOISE_DEFAULTS[band].noiseFactorDb;
}

export function defaultExternalNoiseDbForFrequency(
  frequencyHz: number,
): number | undefined {
  if (!Number.isFinite(frequencyHz)) return undefined;
  if (frequencyHz >= 1e6 && frequencyHz <= 30e6)
    return quietRuralNoiseFactorDb(frequencyHz);
  if (frequencyHz > 30e6 && frequencyHz < 300e6)
    return defaultExternalNoiseDbForBand("VHF");
  if (frequencyHz >= 300e6 && frequencyHz < 1e9)
    return defaultExternalNoiseDbForBand("UHF");
  if (frequencyHz >= 1e9)
    return defaultExternalNoiseDbForBand("MICROWAVE");
  return undefined;
}
