import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { simulateScenario } from '../../../packages/simulation/src';
import { loadExampleScenario } from '../../../packages/simulation/examples/scenarios';
import { CandidatePathDiagnostics, Results } from './Results';

describe('result availability', () => {
  it('withholds primary signal metrics when the HF path is unavailable, retaining noise and explaining engine inputs', () => {
    const scenario = loadExampleScenario('hf-night');
    scenario.frequencyHz = 7e6;
    scenario.receiver.position.longitudeDeg = 0.9;
    scenario.time.utcIso = '2026-09-13T00:00:00.000Z';
    const result = simulateScenario(scenario);
    expect(result.propagationAvailable).toBe(false);
    expect(result.linkMarginDb).toBeGreaterThan(0);
    const html = renderToStaticMarkup(<Results result={result} scenario={scenario} />);
    expect(html.match(/Unavailable/g)).toHaveLength(3);
    expect(html).toContain(result.noiseFloorDbm.toFixed(1));
    expect(html).not.toContain(result.receivedPowerDbm.toFixed(1));
    expect(html).not.toContain(result.snrDb.toFixed(1));
    expect(html).toContain('7 MHz exceeds');
    expect(html).toContain('3.04 MHz path limit');
    expect(html).toContain('local solar hour 0.03');
    expect(html).toContain('critical frequency of 3.00 MHz');
    expect(html).toContain('not a statement about real-world HF conditions');
    const diagnostic = renderToStaticMarkup(<CandidatePathDiagnostics result={result} />);
    expect(diagnostic).toContain('Hypothetical candidate-path diagnostics');
    expect(diagnostic).toContain(result.receivedPowerDbm.toFixed(1));
    expect(diagnostic).toContain(result.snrDb.toFixed(1));
    expect(diagnostic).toContain(result.linkMarginDb.toFixed(1));
    expect(diagnostic).toContain('Modeled maximum usable frequency');
  });

  it('retains physical metrics for an available path with insufficient link margin', () => {
    const scenario = loadExampleScenario('vhf-clear');
    scenario.transmitter.powerDbm = -60;
    const result = simulateScenario(scenario);
    expect(result.propagationAvailable).toBe(true);
    expect(result.linkMarginDb).toBeLessThan(0);
    const html = renderToStaticMarkup(<Results result={result} scenario={scenario} />);
    expect(html).not.toContain('Unavailable');
    expect(html).toContain(result.receivedPowerDbm.toFixed(1));
    expect(html).toContain(result.snrDb.toFixed(1));
    expect(html).toContain(result.linkMarginDb.toFixed(1));
  });

  it('withholds metrics for a non-HF unavailable path without inventing HF conditions', () => {
    const scenario = loadExampleScenario('vhf-horizon');
    const result = simulateScenario(scenario);
    expect(result.propagationAvailable).toBe(false);
    const html = renderToStaticMarkup(<Results result={result} scenario={scenario} />);
    expect(html.match(/Unavailable/g)).toHaveLength(3);
    expect(html).not.toContain('MHz path limit');
  });
});
