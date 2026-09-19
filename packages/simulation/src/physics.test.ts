import { describe, expect, it } from 'vitest';
import { freeSpacePathLossDb, receivedPowerDbm, thermalNoiseDbm, type LinkBudgetInput } from './physics';

const link: LinkBudgetInput = { txPowerDbm: 30, txCableLossDb: 2, txGainDbi: 6, pathLossDb: 100, rxGainDbi: 3, rxCableLossDb: 1 };

describe('free-space loss', () => {
  it('matches the canonical 1 km, 1 GHz reference', () => {
    expect(freeSpacePathLossDb(1000, 1e9)).toBeCloseTo(92.4477832219, 8);
  });
  it('adds 6.02 dB when distance or frequency doubles', () => {
    const baseline = freeSpacePathLossDb(1000, 145e6);
    expect(freeSpacePathLossDb(2000, 145e6) - baseline).toBeCloseTo(6.0205999133, 8);
    expect(freeSpacePathLossDb(1000, 290e6) - baseline).toBeCloseTo(6.0205999133, 8);
  });
  it.each([0, -1, Infinity, NaN])('rejects invalid physical input %s', value => {
    expect(() => freeSpacePathLossDb(value, 145e6)).toThrow(RangeError);
    expect(() => freeSpacePathLossDb(1000, value)).toThrow(RangeError);
  });
});

describe('thermal noise', () => {
  it('matches the room-temperature noise density reference', () => {
    expect(thermalNoiseDbm(1)).toBeCloseTo(-173.9751871942, 8);
    expect(thermalNoiseDbm(10_000, 5)).toBeCloseTo(-128.9751871942, 8);
  });
  it('scales with bandwidth and temperature', () => {
    expect(thermalNoiseDbm(10) - thermalNoiseDbm(1)).toBeCloseTo(10, 10);
    expect(thermalNoiseDbm(1, 0, 580) - thermalNoiseDbm(1)).toBeCloseTo(3.0102999566, 8);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid bandwidth or temperature %s', value => {
    expect(() => thermalNoiseDbm(value)).toThrow(RangeError);
    expect(() => thermalNoiseDbm(1, 0, value)).toThrow(RangeError);
  });
  it('rejects invalid noise figure', () => {
    expect(() => thermalNoiseDbm(1, -1)).toThrow(RangeError);
    expect(() => thermalNoiseDbm(1, NaN)).toThrow(RangeError);
  });
});

describe('link budget', () => {
  it('applies every gain and loss with its correct sign', () => {
    expect(receivedPowerDbm(link)).toBe(-64);
    expect(receivedPowerDbm({ ...link, txPowerDbm: 40 }) - receivedPowerDbm(link)).toBe(10);
  });
  it('rejects invalid terms', () => {
    for (const key of Object.keys(link)) expect(() => receivedPowerDbm({ ...link, [key]: NaN })).toThrow(RangeError);
    expect(() => receivedPowerDbm({ ...link, txCableLossDb: -1 })).toThrow(RangeError);
    expect(() => receivedPowerDbm({ ...link, rxCableLossDb: -1 })).toThrow(RangeError);
  });
});
