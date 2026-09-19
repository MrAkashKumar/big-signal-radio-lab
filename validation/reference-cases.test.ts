import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/free-space-reference.json';
import { freeSpacePathLossDb, receivedPowerDbm, thermalNoiseDbm } from '../packages/simulation/src/physics';
import { wattsToDbm } from '../packages/units/src';

const toleranceDb = 1e-9;

describe('independent linear-power reference budgets, not skywave predictions', () => {
  it.each(fixtures)('$label', fixture => {
    const pathLossDb = freeSpacePathLossDb(fixture.distanceM, fixture.frequencyHz);
    const rx = receivedPowerDbm({
      txPowerDbm: wattsToDbm(fixture.txPowerW),
      txCableLossDb: fixture.txCableLossDb,
      txGainDbi: fixture.txGainDbi,
      pathLossDb,
      rxGainDbi: fixture.rxGainDbi,
      rxCableLossDb: fixture.rxCableLossDb,
    });
    const noise = thermalNoiseDbm(fixture.bandwidthHz, fixture.noiseFigureDb, fixture.temperatureK);
    expect(Math.abs(pathLossDb - fixture.expected.pathLossDb)).toBeLessThan(toleranceDb);
    expect(Math.abs(rx - fixture.expected.receivedPowerDbm)).toBeLessThan(toleranceDb);
    expect(Math.abs(noise - fixture.expected.noiseFloorDbm)).toBeLessThan(toleranceDb);
  });
});
