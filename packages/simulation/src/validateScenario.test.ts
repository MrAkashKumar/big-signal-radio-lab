import { describe, expect, it } from 'vitest';
import type { Scenario } from '../../contracts';
import { ScenarioValidationError, validateScenario } from './validateScenario';

function fixture(): Scenario {
  return {
    schemaVersion: 1, id: 'validation', title: 'Validation', difficulty: 'advanced', frequencyHz: 7.1e6, modeId: 'ssb',
    transmitter: {
      position: { latitudeDeg: 1, longitudeDeg: 103, altitudeM: 0 }, powerDbm: 50,
      antenna: { id: 'dipole', type: 'dipole', gainDbi: 2.15, heightM: 10, polarization: 'horizontal' },
      feedline: { lengthM: 10, lossDb: 1 },
    },
    receiver: {
      position: { latitudeDeg: 2, longitudeDeg: 104, altitudeM: 0 }, bandwidthHz: 2400, noiseFigureDb: 6,
      antenna: { id: 'wire', type: 'dipole', gainDbi: 2.15, heightM: 10, polarization: 'horizontal' },
      feedline: { lengthM: 10, lossDb: 1 },
    },
    environment: { model: 'free-space', temperatureK: 290 }, time: { utcIso: '2024-02-29T12:00:00Z' },
  };
}

function changed(path: string, value: unknown): unknown {
  const data = JSON.parse(JSON.stringify(fixture()));
  const keys = path.split('.');
  let target = data;
  for (const key of keys.slice(0, -1)) target = target[key];
  target[keys.at(-1)!] = value;
  return data;
}

describe('scenario boundary', () => {
  it('reconstructs a fresh typed scenario without mutating input', () => {
    const input = fixture();
    const output = validateScenario(input);
    expect(output).toEqual(input);
    expect(output).not.toBe(input);
    expect(output.transmitter.antenna).not.toBe(input.transmitter.antenna);
    output.transmitter.antenna.heightM = 100;
    expect(input.transmitter.antenna.heightM).toBe(10);
    expect(validateScenario({ ...input, unexpected: true })).not.toHaveProperty('unexpected');
  });
  it.each([null, undefined, [], 5, 'scenario', {}])('rejects missing or malformed scenario %s', input => {
    expect(() => validateScenario(input)).toThrow(ScenarioValidationError);
  });
  it('reports several invalid fields together', () => {
    try { validateScenario({}); } catch (error) {
      expect(error).toBeInstanceOf(ScenarioValidationError);
      expect((error as ScenarioValidationError).issues.length).toBeGreaterThan(10);
      return;
    }
    throw new Error('Expected validation failure');
  });
  it.each([
    ['schemaVersion', 2], ['id', ''], ['title', ' '.repeat(3)], ['id', 'a'.repeat(201)],
    ['difficulty', 'expert'], ['modeId', 'toString'], ['modeId', 'unknown'],
    ['transmitter.antenna.type', 'laser'], ['receiver.antenna.polarization', 'sideways'],
    ['environment.model', 'fantasy'], ['transmitter', null], ['receiver.position', []],
  ])('rejects malformed %s', (path, value) => {
    expect(() => validateScenario(changed(path as string, value))).toThrow(ScenarioValidationError);
  });
  it.each([
    ['frequencyHz', 100000, 1e11], ['transmitter.powerDbm', -200, 110],
    ['transmitter.position.latitudeDeg', -90, 90], ['receiver.position.longitudeDeg', -180, 180],
    ['receiver.position.altitudeM', -500, 10000], ['transmitter.antenna.heightM', 0, 20000],
    ['receiver.antenna.gainDbi', -100, 100], ['transmitter.feedline.lossDb', 0, 200],
    ['receiver.feedline.lengthM', 0, 1e6], ['receiver.bandwidthHz', 0.01, 1e9],
    ['receiver.noiseFigureDb', 0, 100], ['environment.temperatureK', 1, 10000],
    ['environment.externalNoiseDb', 0, 100],
  ] as const)('checks inclusive bounds and rejects nonfinite values for %s', (path, min, max) => {
    expect(() => validateScenario(changed(path, min))).not.toThrow();
    expect(() => validateScenario(changed(path, max))).not.toThrow();
    for (const invalid of [min - 1, max + 1, NaN, Infinity, -Infinity, null, '1']) {
      expect(() => validateScenario(changed(path, invalid))).toThrow(ScenarioValidationError);
    }
  });
  it.each(['2023-02-29T12:00:00Z', '2024-02-30T12:00:00Z', '2024-13-01T00:00:00Z', '2024-01-01T24:00:00Z', '2024-01-01', '2024-01-01T00:00:00+00:00', '2024-01-01T00:00:60Z'])('rejects invalid UTC calendar %s', value => {
    expect(() => validateScenario(changed('time.utcIso', value))).toThrow(ScenarioValidationError);
  });
  it.each(['2024-02-29T00:00:00Z', '2024-01-01T00:00:00.1Z', '2024-01-01T00:00:00.123Z'])('accepts strict UTC calendar %s', value => {
    expect(() => validateScenario(changed('time.utcIso', value))).not.toThrow();
  });
  it('accepts positive narrow bandwidth for the engine to mark as unsupported', () => {
    expect(validateScenario(changed('receiver.bandwidthHz', 0.01)).receiver.bandwidthHz).toBe(0.01);
  });
});

describe('propagation environment validation', () => {
  const hf = {
    model: 'hf-skywave' as const, temperatureK: 290, effectiveHeightM: 300000,
    criticalFrequencyMHzDay: 7, criticalFrequencyMHzNight: 3,
    absorptionDbAt10MHzDay: 4, absorptionDbAt10MHzNight: 1,
    groundReflectionLossDb: 3, maxHops: 4,
  };
  it('accepts complete HF and terrain objects', () => {
    expect(validateScenario({ ...fixture(), environment: hf }).environment).toEqual(hf);
    const environment = { model: 'vhf-terrain', temperatureK: 290, effectiveEarthRadiusFactor: 4 / 3, obstruction: { fraction: 0.5, altitudeM: 1500 } };
    expect(validateScenario({ ...fixture(), environment }).environment).toEqual(environment);
  });
  it.each([0, 1, -1, Infinity, NaN])('rejects obstruction fraction %s', fraction => {
    expect(() => validateScenario({ ...fixture(), environment: { model: 'vhf-terrain', temperatureK: 290, effectiveEarthRadiusFactor: 4 / 3, obstruction: { fraction, altitudeM: 100 } } })).toThrow(ScenarioValidationError);
  });
  it.each([0, 2.1, NaN, Infinity])('rejects effective Earth radius factor %s', effectiveEarthRadiusFactor => {
    expect(() => validateScenario({ ...fixture(), environment: { model: 'vhf-terrain', temperatureK: 290, effectiveEarthRadiusFactor } })).toThrow(ScenarioValidationError);
  });
  it.each([
    ['effectiveHeightM', 99999], ['effectiveHeightM', 600001], ['criticalFrequencyMHzDay', 0],
    ['criticalFrequencyMHzNight', 31], ['absorptionDbAt10MHzDay', -1], ['absorptionDbAt10MHzNight', 101],
    ['groundReflectionLossDb', -1], ['maxHops', 1.5], ['maxHops', 0], ['maxHops', 11],
  ])('rejects invalid HF %s', (key, value) => {
    expect(() => validateScenario({ ...fixture(), environment: { ...hf, [key]: value } })).toThrow(ScenarioValidationError);
  });
  it.each([999999, 30000001])('rejects frequency %s outside the HF model', frequencyHz => {
    expect(() => validateScenario({ ...fixture(), frequencyHz, environment: hf })).toThrow(ScenarioValidationError);
  });
  it.each([1e6, 30e6])('accepts HF frequency endpoint %s', frequencyHz => {
    expect(() => validateScenario({ ...fixture(), frequencyHz, environment: hf })).not.toThrow();
  });
});

describe('minimum supported path geometry', () => {
  it.each([
    [{ latitudeDeg: 1, longitudeDeg: 103, altitudeM: 0 }, { latitudeDeg: 1, longitudeDeg: 103, altitudeM: 0 }],
    [{ latitudeDeg: 90, longitudeDeg: 0, altitudeM: 0 }, { latitudeDeg: 90, longitudeDeg: 180, altitudeM: 0 }],
    [{ latitudeDeg: 0, longitudeDeg: -180, altitudeM: 0 }, { latitudeDeg: 0, longitudeDeg: 180, altitudeM: 0 }],
  ])('rejects equivalent terminal locations with a structured error', (tx, rx) => {
    const input = fixture();
    input.transmitter.position = tx;
    input.receiver.position = rx;
    expect(() => validateScenario(input)).toThrow(ScenarioValidationError);
    expect(() => validateScenario(input)).toThrow('Antenna tips must be separated');
  });
  it('measures separation at antenna tips and accepts a one-meter vertical link', () => {
    const input = fixture();
    input.transmitter.position = { latitudeDeg: 0, longitudeDeg: 0, altitudeM: 0 };
    input.receiver.position = { ...input.transmitter.position };
    input.receiver.antenna.heightM = 11;
    expect(() => validateScenario(input)).not.toThrow();
    input.receiver.antenna.heightM = 10.5;
    expect(() => validateScenario(input)).toThrow(ScenarioValidationError);
  });
  it.each([Number.MIN_VALUE, 1e-20, 1 - Number.EPSILON])('rejects an obstruction effectively at an endpoint (%s)', fraction => {
    const input = fixture();
    input.environment = { model: 'vhf-terrain', temperatureK: 290, effectiveEarthRadiusFactor: 4 / 3, obstruction: { fraction, altitudeM: 1000 } };
    expect(() => validateScenario(input)).toThrow(ScenarioValidationError);
    expect(() => validateScenario(input)).toThrow('at least 1 meter from each endpoint');
  });
  it('accepts obstruction geometry just above one meter from either endpoint', () => {
    const input = fixture();
    input.transmitter.position = { latitudeDeg: 0, longitudeDeg: 0, altitudeM: 0 };
    input.receiver.position = { latitudeDeg: 0, longitudeDeg: 1, altitudeM: 0 };
    const distance = 6371000 * Math.PI / 180;
    for (const fraction of [1.000001 / distance, 1 - 1.000001 / distance]) {
      input.environment = { model: 'vhf-terrain', temperatureK: 290, effectiveEarthRadiusFactor: 4 / 3, obstruction: { fraction, altitudeM: 1 } };
      expect(() => validateScenario(input)).not.toThrow();
    }
    input.environment = { model: 'vhf-terrain', temperatureK: 290, effectiveEarthRadiusFactor: 4 / 3, obstruction: { fraction: 0.999999 / distance, altitudeM: 1 } };
    expect(() => validateScenario(input)).toThrow(ScenarioValidationError);
  });
  it('rejects a segment too short to place an obstruction one meter from both endpoints', () => {
    const input = fixture();
    input.transmitter.position = { latitudeDeg: 0, longitudeDeg: 0, altitudeM: 0 };
    input.receiver.position = { latitudeDeg: 0, longitudeDeg: 1.5 / 6371000 * 180 / Math.PI, altitudeM: 0 };
    input.environment = { model: 'vhf-terrain', temperatureK: 290, effectiveEarthRadiusFactor: 4 / 3, obstruction: { fraction: 0.5, altitudeM: 1 } };
    expect(() => validateScenario(input)).toThrow(ScenarioValidationError);
  });
});
