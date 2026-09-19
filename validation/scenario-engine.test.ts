import { describe, expect, it } from 'vitest';
import { simulateScenario, ScenarioValidationError, type Scenario } from '../packages/simulation/src';
import { loadExampleScenario, scenarioIds } from '../packages/simulation/examples/scenarios';

function checkFiniteNumbers(value: unknown): void {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(checkFiniteNumbers);
  else if (value && typeof value === 'object') Object.values(value).forEach(checkFiniteNumbers);
}

function exampleResult(id: string) {
  return simulateScenario(loadExampleScenario(id));
}

describe('public simulator acceptance', () => {
  it.each(scenarioIds)('returns finite, deterministic, independent data for %s', id => {
    const input = loadExampleScenario(id);
    const before = structuredClone(input);
    const result = simulateScenario(input);
    checkFiniteNumbers(result);
    expect(input).toEqual(before);
    expect(result.schemaVersion).toBe(1);
    expect(result.snrDb).toBeCloseTo(result.receivedPowerDbm - result.noiseFloorDbm, 10);
    expect(result.linkMarginDb).toBeCloseTo(result.snrDb - result.requiredSnrDb, 10);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    const repeated = simulateScenario(input);
    expect(repeated).toEqual(result);
    expect(repeated).not.toBe(result);
    expect(repeated.calculations).not.toBe(result.calculations);
    result.calculations[0].value = -123;
    result.warnings.push('caller mutation');
    expect(simulateScenario(input)).toEqual(repeated);
    input.transmitter.antenna.heightM = 1234;
    expect(loadExampleScenario(id)).toEqual(before);
  });

  it('exercises the ridge failure, tenfold power, and antenna-height recovery loop', () => {
    const ridge = exampleResult('vhf-ridge');
    const power = exampleResult('vhf-ridge-power');
    const height = exampleResult('vhf-ridge-height');
    expect(ridge.success).toBe('failed');
    expect(power.success).toBe('marginal');
    expect(height.success).toBe('good');
    expect(power.receivedPowerDbm - ridge.receivedPowerDbm).toBeCloseTo(10, 10);
    expect(power.linkMarginDb - ridge.linkMarginDb).toBeCloseTo(10, 10);
    expect(power.noiseFloorDbm).toBe(ridge.noiseFloorDbm);
    expect(height.linkMarginDb - ridge.linkMarginDb).toBeGreaterThan(10);
    expect(ridge.limitingFactors[0].id).toBe('height');
    expect(ridge.limitingFactors[0].possibleImprovementDb).toBeGreaterThan(10);
    expect(ridge.propagationPaths[0].type).toBe('diffracted');
    expect(height.propagationPaths[0].type).toBe('direct');
  });

  it('does not call a positive hypothetical budget successful beyond the radio horizon', () => {
    const result = exampleResult('vhf-horizon');
    expect(result.linkMarginDb).toBeGreaterThan(0);
    expect(result.success).toBe('failed');
    expect(result.propagationAvailable).toBe(false);
    expect(result.propagationPaths).toEqual([]);
    expect(result.limitingFactors).toEqual([]);
    expect(result.warnings.join(' ')).toContain('hypothetical');
  });

  it('returns a usable daytime HF path to the actual receiving antenna', () => {
    const input = loadExampleScenario('hf-day');
    const result = simulateScenario(input);
    expect(result.success).toBe('good');
    expect(result.propagationAvailable).toBe(true);
    expect(result.confidence.level).toBe('low');
    expect(result.propagationPaths[0].type).toBe('skywave');
    expect(result.propagationPaths[0].points.at(-1)).toEqual({
      lat: input.receiver.position.latitudeDeg,
      lon: input.receiver.position.longitudeDeg,
      altitudeM: input.receiver.position.altitudeM + input.receiver.antenna.heightM,
    });
  });

  it.each(['hf-night', 'hf-above-muf'])('renders an escaping ray and fails %s despite positive margin', id => {
    const input = loadExampleScenario(id);
    const result = simulateScenario(input);
    expect(result.success).toBe('failed');
    expect(result.propagationAvailable).toBe(false);
    expect(result.explanationKeys).toContain('hf-above-muf');
    expect(result.linkMarginDb).toBeGreaterThan(0);
    for (const path of result.propagationPaths) {
      const endpoint = path.points.at(-1)!;
      expect(endpoint.altitudeM).toBeGreaterThan(input.environment.model === 'hf-skywave' ? input.environment.effectiveHeightM : 0);
      expect(endpoint).not.toEqual({ lat: input.receiver.position.latitudeDeg, lon: input.receiver.position.longitudeDeg, altitudeM: input.receiver.position.altitudeM + input.receiver.antenna.heightM });
    }
    expect(result.limitingFactors.map(item => item.id)).toContain('frequency');
    expect(result.limitingFactors.map(item => item.id)).not.toContain('power');
  });

  it('separates absorption failure from an absent skywave path', () => {
    const result = exampleResult('hf-absorption');
    expect(result.success).toBe('failed');
    expect(result.propagationAvailable).toBe(true);
    expect(result.linkMarginDb).toBeLessThan(0);
    expect(result.explanationKeys).toContain('hf-absorption');
    expect(result.calculations.find(item => item.id === 'hf-absorption')!.value).toBeGreaterThan(100);
  });

  it('accounts for every hop and ground reflection on the long HF circuit', () => {
    const result = exampleResult('hf-multihop');
    const hops = result.calculations.find(item => item.id === 'hf-hops')!.value;
    expect(hops).toBe(3);
    expect(result.propagationAvailable).toBe(true);
    expect(result.propagationPaths[0].points).toHaveLength(2 * hops + 1);
    expect(result.calculations.find(item => item.id === 'hf-ground-loss')!.value).toBe(6);
    const input = loadExampleScenario('hf-multihop');
    if (input.environment.model !== 'hf-skywave') throw new Error('Expected HF fixture');
    input.environment.maxHops = 2;
    const limited = simulateScenario(input);
    expect(limited.propagationAvailable).toBe(false);
    expect(limited.success).toBe('failed');
    expect(limited.propagationPaths).toEqual([]);
    expect(limited.explanationKeys).toContain('hf-hop-limit');
  });

  it('normalizes FT8 SNR without manufacturing sensitivity by reducing bandwidth', () => {
    const input = loadExampleScenario('hf-ft8');
    const wide = simulateScenario(input);
    input.receiver.bandwidthHz = 50;
    const narrow = simulateScenario(input);
    expect(narrow.linkMarginDb).toBeCloseTo(wide.linkMarginDb, 10);
    expect(narrow.receivedPowerDbm).toBe(wide.receivedPowerDbm);
    expect(narrow.requiredSnrDb - wide.requiredSnrDb).toBeCloseTo(10 * Math.log10(50), 10);
    expect(narrow.success).toBe(wide.success);
    input.receiver.bandwidthHz = 49;
    const invalidBandwidth = simulateScenario(input);
    expect(invalidBandwidth.propagationAvailable).toBe(true);
    expect(invalidBandwidth.success).toBe('failed');
    expect(invalidBandwidth.limitingFactors.map(item => item.id)).toEqual(['bandwidth']);
    expect(invalidBandwidth.limitingFactors[0].possibleImprovementDb).toBe(0);
  });

  it('applies the documented linear and circular polarization losses', () => {
    const input = loadExampleScenario('vhf-clear');
    input.transmitter.antenna.polarization = 'vertical';
    input.receiver.antenna.polarization = 'vertical';
    const matched = simulateScenario(input);
    input.receiver.antenna.polarization = 'horizontal';
    const crossed = simulateScenario(input);
    expect(matched.receivedPowerDbm - crossed.receivedPowerDbm).toBeCloseTo(30, 10);
    expect(crossed.limitingFactors[0].id).toBe('polarization');
    input.receiver.antenna.polarization = 'circular';
    expect(matched.receivedPowerDbm - simulateScenario(input).receivedPowerDbm).toBeCloseTo(10 * Math.log10(2), 10);
  });

  it('combines antenna noise and receiver equivalent noise temperatures', () => {
    const input = loadExampleScenario('vhf-clear');
    input.environment.temperatureK = 290;
    input.environment.externalNoiseDb = 0;
    input.receiver.noiseFigureDb = 0;
    const baseline = simulateScenario(input);
    input.environment.temperatureK = 580;
    input.receiver.noiseFigureDb = 10 * Math.log10(2);
    const changed = simulateScenario(input);
    expect(changed.noiseFloorDbm - baseline.noiseFloorDbm).toBeCloseTo(10 * Math.log10(3), 10);
    expect(changed.linkMarginDb - baseline.linkMarginDb).toBeCloseTo(-10 * Math.log10(3), 10);
    input.environment.temperatureK = 290;
    input.receiver.noiseFigureDb = 0;
    input.environment.externalNoiseDb = 20;
    input.receiver.feedline.lossDb = 0;
    expect(simulateScenario(input).noiseFloorDbm - baseline.noiseFloorDbm).toBeCloseTo(20, 10);
  });

  it('attenuates external noise through a warm receive cable before adding receiver noise', () => {
    const input = loadExampleScenario('vhf-clear');
    input.environment.temperatureK = 290;
    input.environment.externalNoiseDb = 20;
    input.receiver.feedline.lossDb = 20;
    input.receiver.noiseFigureDb = 5;
    const lossy = simulateScenario(input);
    const receiverTemperature = 290 * (Math.sqrt(10) - 1);
    const expectedNoise = 10 * Math.log10(1000 * 1.380649e-23 * input.receiver.bandwidthHz * (577.1 + receiverTemperature));
    expect(lossy.noiseFloorDbm).toBeCloseTo(expectedNoise, 10);
    input.receiver.feedline.lossDb = 0;
    const lossless = simulateScenario(input);
    const expectedImprovement = 20 - 10 * Math.log10((29000 + receiverTemperature) / (577.1 + receiverTemperature));
    expect(lossless.receivedPowerDbm - lossy.receivedPowerDbm).toBeCloseTo(20, 10);
    expect(lossless.linkMarginDb - lossy.linkMarginDb).toBeCloseTo(expectedImprovement, 10);
    expect(expectedImprovement).toBeGreaterThan(6);
    expect(expectedImprovement).toBeLessThan(6.2);
  });

  it('preserves 290 K antenna noise through a cable at 290 K while attenuating the signal', () => {
    const input = loadExampleScenario('vhf-clear');
    input.environment.temperatureK = 290;
    input.environment.externalNoiseDb = 0;
    input.receiver.feedline.lossDb = 0;
    const lossless = simulateScenario(input);
    input.receiver.feedline.lossDb = 20;
    const lossy = simulateScenario(input);
    expect(lossy.noiseFloorDbm).toBeCloseTo(lossless.noiseFloorDbm, 10);
    expect(lossless.linkMarginDb - lossy.linkMarginDb).toBeCloseTo(20, 10);
  });

  it.each([null, {}, { ...loadExampleScenario('hf-day'), frequencyHz: NaN }, { ...loadExampleScenario('vhf-clear'), modeId: 'toString' }])('rejects malformed external input with structured errors', input => {
    expect(() => simulateScenario(input as Scenario)).toThrow(ScenarioValidationError);
  });
});
