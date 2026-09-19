import type { AntennaConfig, EnvironmentConfig, FeedlineConfig, GeoPosition, Scenario } from '../../contracts';
import { MODE_PROFILES } from './modes';
import { chordDistanceM, greatCircleDistanceM } from '../../propagation/src/geometry';

export class ScenarioValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid scenario: ${issues.join('; ')}`);
    this.name = 'ScenarioValidationError';
  }
}

export function validateScenario(input: unknown): Scenario {
  const issues: string[] = [];
  function object(value: unknown, path: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      issues.push(`${path} must be an object`);
      return {};
    }
    return Object.fromEntries(Object.entries(value));
  }
  function number(value: unknown, path: string, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      issues.push(`${path} must be finite within [${min}, ${max}]`);
      return min;
    }
    return value;
  }
  function string(value: unknown, path: string, max = 200): string {
    if (typeof value !== 'string' || !value.trim() || value.length > max) {
      issues.push(`${path} must be a nonempty string of at most ${max} characters`);
      return '';
    }
    return value;
  }
  function choice<const T extends string>(value: unknown, path: string, values: readonly T[]): T {
    const found = values.find(candidate => candidate === value);
    if (found !== undefined) return found;
    issues.push(`${path} must be one of ${values.join(', ')}`);
    return values[0]!;
  }
  function position(value: unknown, path: string): GeoPosition {
    const data = object(value, path);
    return {
      latitudeDeg: number(data.latitudeDeg, `${path}.latitudeDeg`, -90, 90),
      longitudeDeg: number(data.longitudeDeg, `${path}.longitudeDeg`, -180, 180),
      altitudeM: number(data.altitudeM, `${path}.altitudeM`, -500, 10000),
    };
  }
  function antenna(value: unknown, path: string): AntennaConfig {
    const data = object(value, path);
    return {
      id: string(data.id, `${path}.id`),
      type: choice(data.type, `${path}.type`, ['rubber-duck', 'vertical', 'dipole', 'yagi', 'dish', 'custom']),
      gainDbi: number(data.gainDbi, `${path}.gainDbi`, -100, 100),
      heightM: number(data.heightM, `${path}.heightM`, 0, 20000),
      polarization: choice(data.polarization, `${path}.polarization`, ['vertical', 'horizontal', 'circular', 'unknown']),
    };
  }
  function feedline(value: unknown, path: string): FeedlineConfig {
    const data = object(value, path);
    return {
      lengthM: number(data.lengthM, `${path}.lengthM`, 0, 1e6),
      lossDb: number(data.lossDb, `${path}.lossDb`, 0, 200),
    };
  }
  const root = object(input, 'scenario');
  const tx = object(root.transmitter, 'transmitter');
  const rx = object(root.receiver, 'receiver');
  const env = object(root.environment, 'environment');
  const time = object(root.time, 'time');
  if (root.schemaVersion !== 1) issues.push('schemaVersion must equal 1');
  const modeId = string(root.modeId, 'modeId');
  if (!Object.hasOwn(MODE_PROFILES, modeId)) issues.push('modeId must identify a supported mode');
  const frequencyHz = number(root.frequencyHz, 'frequencyHz', 100000, 1e11);
  const base = {
    temperatureK: number(env.temperatureK, 'environment.temperatureK', 1, 10000),
    ...(env.externalNoiseDb === undefined ? {} : { externalNoiseDb: number(env.externalNoiseDb, 'environment.externalNoiseDb', 0, 100) }),
  };
  const model = choice(env.model, 'environment.model', ['free-space', 'vhf-terrain', 'hf-skywave']);
  let environment: EnvironmentConfig;
  if (model === 'vhf-terrain') {
    const obstruction = env.obstruction === undefined ? undefined : object(env.obstruction, 'environment.obstruction');
    let parsedObstruction;
    if (obstruction) {
      const fraction = number(obstruction.fraction, 'environment.obstruction.fraction', 0, 1);
      if (fraction <= 0 || fraction >= 1) issues.push('environment.obstruction.fraction must be strictly between 0 and 1');
      parsedObstruction = { fraction, altitudeM: number(obstruction.altitudeM, 'environment.obstruction.altitudeM', -500, 30000) };
    }
    environment = {
      ...base, model,
      effectiveEarthRadiusFactor: number(env.effectiveEarthRadiusFactor, 'environment.effectiveEarthRadiusFactor', 1, 2),
      ...(parsedObstruction ? { obstruction: parsedObstruction } : {}),
    };
  } else if (model === 'hf-skywave') {
    if (frequencyHz < 1e6 || frequencyHz > 30e6) issues.push('frequencyHz must be within [1000000, 30000000] for hf-skywave');
    const maxHops = number(env.maxHops, 'environment.maxHops', 1, 10);
    if (!Number.isInteger(maxHops)) issues.push('environment.maxHops must be an integer');
    environment = {
      ...base, model, maxHops,
      effectiveHeightM: number(env.effectiveHeightM, 'environment.effectiveHeightM', 100000, 600000),
      criticalFrequencyMHzDay: number(env.criticalFrequencyMHzDay, 'environment.criticalFrequencyMHzDay', 0.1, 30),
      criticalFrequencyMHzNight: number(env.criticalFrequencyMHzNight, 'environment.criticalFrequencyMHzNight', 0.1, 30),
      absorptionDbAt10MHzDay: number(env.absorptionDbAt10MHzDay, 'environment.absorptionDbAt10MHzDay', 0, 100),
      absorptionDbAt10MHzNight: number(env.absorptionDbAt10MHzNight, 'environment.absorptionDbAt10MHzNight', 0, 100),
      groundReflectionLossDb: number(env.groundReflectionLossDb, 'environment.groundReflectionLossDb', 0, 100),
    };
  } else {
    environment = { ...base, model };
  }
  const utcIso = string(time.utcIso, 'time.utcIso', 30);
  const calendar = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(utcIso);
  const date = new Date(utcIso);
  if (!calendar || !Number.isFinite(date.getTime()) || date.toISOString() !== `${utcIso.slice(0, 19)}.${(calendar[7] ?? '').padEnd(3, '0')}Z`) {
    issues.push('time.utcIso must be a valid UTC calendar timestamp ending in Z');
  }
  const scenario: Scenario = {
    schemaVersion: 1, id: string(root.id, 'id'), title: string(root.title, 'title', 500),
    difficulty: choice(root.difficulty, 'difficulty', ['beginner', 'intermediate', 'advanced']),
    frequencyHz, modeId,
    transmitter: {
      position: position(tx.position, 'transmitter.position'), powerDbm: number(tx.powerDbm, 'transmitter.powerDbm', -200, 110),
      antenna: antenna(tx.antenna, 'transmitter.antenna'), feedline: feedline(tx.feedline, 'transmitter.feedline'),
    },
    receiver: {
      position: position(rx.position, 'receiver.position'), antenna: antenna(rx.antenna, 'receiver.antenna'),
      feedline: feedline(rx.feedline, 'receiver.feedline'), bandwidthHz: number(rx.bandwidthHz, 'receiver.bandwidthHz', 0.01, 1e9),
      noiseFigureDb: number(rx.noiseFigureDb, 'receiver.noiseFigureDb', 0, 100),
    },
    environment, time: { utcIso },
  };
  const txTip = { ...scenario.transmitter.position, altitudeM: scenario.transmitter.position.altitudeM + scenario.transmitter.antenna.heightM };
  const rxTip = { ...scenario.receiver.position, altitudeM: scenario.receiver.position.altitudeM + scenario.receiver.antenna.heightM };
  if (chordDistanceM(txTip, rxTip) < 1) issues.push('Antenna tips must be separated by at least 1 meter');
  if (environment.model === 'vhf-terrain' && environment.obstruction) {
    const surfaceDistance = greatCircleDistanceM(txTip, rxTip);
    const fraction = environment.obstruction.fraction;
    if (surfaceDistance * fraction < 1 || surfaceDistance * (1 - fraction) < 1) {
      issues.push('environment.obstruction must be at least 1 meter from each endpoint along the surface');
    }
  }
  if (issues.length) throw new ScenarioValidationError(issues);
  return scenario;
}
