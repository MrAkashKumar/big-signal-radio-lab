import { describe, expect, it } from 'vitest';
import { addDb, dbmToMilliwatts, dbmToWatts, hzToMhz, kmToMeters, metersToKm, mhzToHz, milliwattsToDbm, wattsToDbm } from './index';

describe('power conversions', () => {
  it('uses a one milliwatt reference', () => {
    expect(milliwattsToDbm(1)).toBe(0);
    expect(wattsToDbm(1)).toBe(30);
    expect(dbmToWatts(30)).toBe(1);
    expect(dbmToMilliwatts(-30)).toBe(0.001);
    expect(wattsToDbm(5)).toBeCloseTo(36.9897000434, 8);
  });
  it('raises power by ten decibels for a tenfold increase', () => {
    expect(wattsToDbm(50) - wattsToDbm(5)).toBeCloseTo(10, 12);
    expect(dbmToWatts(-80) / dbmToWatts(-90)).toBeCloseTo(10, 12);
  });
  it.each([0, -1, NaN, Infinity, -Infinity])('rejects invalid linear power %s', value => {
    expect(() => wattsToDbm(value)).toThrow(RangeError);
    expect(() => milliwattsToDbm(value)).toThrow(RangeError);
  });
  it.each([NaN, Infinity, -Infinity, 1e6, -1e6])('rejects unrepresentable dBm conversions %s', value => {
    expect(() => dbmToWatts(value)).toThrow(RangeError);
    expect(() => dbmToMilliwatts(value)).toThrow(RangeError);
  });
});

describe('linear units and dB', () => {
  it('converts frequency and distance', () => {
    expect(hzToMhz(145e6)).toBe(145);
    expect(mhzToHz(145)).toBe(145e6);
    expect(metersToKm(1250)).toBe(1.25);
    expect(kmToMeters(1.25)).toBe(1250);
    expect(metersToKm(0)).toBe(0);
  });
  it('adds logarithmic gains and losses', () => {
    expect(addDb(37, -2, 6, -100, 6, -2)).toBe(-55);
    expect(addDb()).toBe(0);
    expect(() => addDb(NaN)).toThrow(RangeError);
    expect(() => addDb(Number.MAX_VALUE, Number.MAX_VALUE)).toThrow(RangeError);
  });
  it.each([hzToMhz, mhzToHz, metersToKm, kmToMeters])('rejects invalid quantities', convert => {
    for (const value of [-1, NaN, Infinity]) expect(() => convert(value)).toThrow(RangeError);
  });
});
