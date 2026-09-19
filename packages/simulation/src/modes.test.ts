import { describe, expect, it } from 'vitest';
import { MODE_PROFILES, requiredSnrForBandwidth } from './modes';
import { thermalNoiseDbm } from './physics';

describe('mode profiles', () => {
  it('exposes four frozen profiles with explicit evidence and confidence', () => {
    expect(Object.keys(MODE_PROFILES).sort()).toEqual(['cw', 'fm-voice', 'ft8', 'ssb']);
    expect(Object.isFrozen(MODE_PROFILES)).toBe(true);
    for (const [id, mode] of Object.entries(MODE_PROFILES)) {
      expect(mode.id).toBe(id);
      expect(Object.isFrozen(mode)).toBe(true);
      expect(mode.reference).toContain('https://');
      expect(mode.minimumBandwidthHz).toBeLessThanOrEqual(mode.bandwidthHz);
    }
  });
  it('preserves FT8 reference bandwidth instead of treating -21 dB as a 50 Hz threshold', () => {
    const mode = MODE_PROFILES.ft8!;
    expect(mode.requiredSnrDb).toBe(-21);
    expect(mode.referenceBandwidthHz).toBe(2500);
    expect(requiredSnrForBandwidth(mode, 50)).toBeCloseTo(-4.01029995664, 8);
  });
  it.each(Object.values(MODE_PROFILES))('holds sensitivity constant when $id noise bandwidth changes', mode => {
    const referenceSensitivity = thermalNoiseDbm(mode.referenceBandwidthHz, 5) + mode.requiredSnrDb;
    for (const bandwidth of [0.01, mode.minimumBandwidthHz, mode.bandwidthHz, 1e9]) {
      expect(thermalNoiseDbm(bandwidth, 5) + requiredSnrForBandwidth(mode, bandwidth)).toBeCloseTo(referenceSensitivity, 10);
    }
  });
  it.each([0, -1, NaN, Infinity, -Infinity])('rejects invalid bandwidth %s', bandwidth => {
    expect(() => requiredSnrForBandwidth(MODE_PROFILES.ft8!, bandwidth)).toThrow(RangeError);
  });
});
