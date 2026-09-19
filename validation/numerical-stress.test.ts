import { describe, expect, it } from 'vitest';
import { addDb, dbmToMilliwatts, dbmToWatts, milliwattsToDbm, wattsToDbm } from '../packages/units/src/index';
import { freeSpacePathLossDb, receivedPowerDbm, thermalNoiseDbm, type LinkBudgetInput } from '../packages/simulation/src/physics';

const link: LinkBudgetInput = {
  txPowerDbm: 43, txCableLossDb: 1.25, txGainDbi: -2.5,
  pathLossDb: 137, rxGainDbi: 19.75, rxCableLossDb: 3.5,
};
const sensitivity: Array<[keyof LinkBudgetInput, number]> = [
  ['txPowerDbm', 1], ['txGainDbi', 1], ['rxGainDbi', 1],
  ['txCableLossDb', -1], ['pathLossDb', -1], ['rxCableLossDb', -1],
];

// Relative error keeps tiny powers from passing merely because they round to zero.
const relativeTolerance = 2e-12;

describe('deterministic power sweeps', () => {
  it.each(Array.from({ length: 61 }, (_, index) => -300 + index * 10))(
    'round-trips linear powers near 10^%s with relative tolerance', exponent => {
      for (const mantissa of [1, 1.23456789, Math.PI, 9.99]) {
        const power = mantissa * 10 ** exponent;
        expect(Math.abs(dbmToWatts(wattsToDbm(power)) / power - 1)).toBeLessThan(relativeTolerance);
        expect(Math.abs(dbmToMilliwatts(milliwattsToDbm(power)) / power - 1)).toBeLessThan(relativeTolerance);
      }
    },
  );

  it('keeps watts and milliwatts consistent across receiver and transmitter power ranges', () => {
    for (let dbm = -300; dbm <= 300; dbm += 0.5) {
      expect(Math.abs(dbmToMilliwatts(dbm) / (1000 * dbmToWatts(dbm)) - 1)).toBeLessThan(relativeTolerance);
      expect(wattsToDbm(dbmToWatts(dbm))).toBeCloseTo(dbm, 10);
    }
  });
});

describe('free-space scaling invariants', () => {
  it.each([3e6, 7.1e6, 14.2e6, 28e6, 145e6, 435e6, 2.4e9, 10e9, 30e9])(
    'preserves inverse distance/frequency scaling at %s Hz', frequency => {
      for (const distance of [100, 10_000, 1e6, 4e7]) {
        const baseline = freeSpacePathLossDb(distance, frequency);
        for (const ratio of [0.1, 0.5, 2, 10, 100]) {
          expect(freeSpacePathLossDb(distance * ratio, frequency / ratio)).toBeCloseTo(baseline, 10);
          expect(freeSpacePathLossDb(distance * ratio, frequency) - baseline).toBeCloseTo(20 * Math.log10(ratio), 10);
          expect(freeSpacePathLossDb(distance, frequency * ratio) - baseline).toBeCloseTo(20 * Math.log10(ratio), 10);
        }
      }
    },
  );

  it.each([Number.MIN_VALUE, 1e-300, 1e300, Number.MAX_VALUE])(
    'avoids intermediate products overflowing or underflowing at %s', value => {
      expect(Number.isFinite(freeSpacePathLossDb(value, value))).toBe(true);
      expect(Number.isFinite(thermalNoiseDbm(value, 0, value))).toBe(true);
    },
  );
});

describe('link budget conservation and sensitivity', () => {
  it('is reciprocal when antenna and cable endpoints are exchanged at equal transmit power', () => {
    const reversed = {
      ...link, txGainDbi: link.rxGainDbi, rxGainDbi: link.txGainDbi,
      txCableLossDb: link.rxCableLossDb, rxCableLossDb: link.txCableLossDb,
    };
    expect(receivedPowerDbm(reversed)).toBe(receivedPowerDbm(link));
  });

  it.each(sensitivity)('responds independently to %s with sign %s', (term, sign) => {
    for (const change of [0.001, 0.5, 3, 10, 100]) {
      const modified = { ...link, [term]: link[term] + change };
      expect(receivedPowerDbm(modified) - receivedPowerDbm(link)).toBeCloseTo(sign * change, 10);
    }
  });

  it('cancels a gain increase with an equal cable loss increase', () => {
    for (const change of [0.1, 3, 30, 100]) {
      expect(receivedPowerDbm({ ...link, txGainDbi: link.txGainDbi + change, rxCableLossDb: link.rxCableLossDb + change }))
        .toBeCloseTo(receivedPowerDbm(link), 10);
    }
  });

  it.each(sensitivity)('rejects nonfinite %s terms', term => {
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(() => receivedPowerDbm({ ...link, [term]: value })).toThrow(RangeError);
    }
  });

  it('rejects an unrepresentable sum even when each input is finite', () => {
    expect(() => receivedPowerDbm({ ...link, txPowerDbm: Number.MAX_VALUE, txGainDbi: Number.MAX_VALUE })).toThrow(RangeError);
    expect(() => addDb(-Number.MAX_VALUE, -Number.MAX_VALUE)).toThrow(RangeError);
  });
});

describe('noise and SNR sensitivity', () => {
  it.each([50, 500, 2400, 12_500, 200_000, 20e6])('tracks bandwidth ratios from %s Hz', bandwidth => {
    const baseline = thermalNoiseDbm(bandwidth, 6);
    const received = receivedPowerDbm(link);
    for (const ratio of [0.01, 0.5, 2, 10, 100]) {
      const changed = thermalNoiseDbm(bandwidth * ratio, 6);
      expect(changed - baseline).toBeCloseTo(10 * Math.log10(ratio), 10);
      expect((received - changed) - (received - baseline)).toBeCloseTo(-10 * Math.log10(ratio), 10);
    }
  });

  it('adds noise figure at 290 K and scales antenna temperature with an ideal receiver', () => {
    expect(thermalNoiseDbm(2400, 8.75, 290) - thermalNoiseDbm(2400, 0, 290)).toBeCloseTo(8.75, 10);
    for (const temperature of [3, 77, 290, 1000]) {
      const baseline = thermalNoiseDbm(2400, 0, temperature);
      expect(thermalNoiseDbm(2400, 0, temperature * 10) - baseline).toBeCloseTo(10, 10);
    }
  });

  it('adds receiver equivalent temperature referenced to 290 K at other antenna temperatures', () => {
    const noise = thermalNoiseDbm(2400, 10 * Math.log10(2), 580);
    const reference = thermalNoiseDbm(2400, 0, 290);
    expect(noise - reference).toBeCloseTo(10 * Math.log10(3), 10);
  });

  it.each([NaN, Infinity, -Infinity])('rejects nonfinite noise inputs %s', value => {
    expect(() => thermalNoiseDbm(value)).toThrow(RangeError);
    expect(() => thermalNoiseDbm(2400, value)).toThrow(RangeError);
    expect(() => thermalNoiseDbm(2400, 0, value)).toThrow(RangeError);
    expect(() => freeSpacePathLossDb(value, 7.1e6)).toThrow(RangeError);
    expect(() => freeSpacePathLossDb(1000, value)).toThrow(RangeError);
  });
});
