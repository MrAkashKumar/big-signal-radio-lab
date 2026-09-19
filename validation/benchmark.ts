import { performance } from 'node:perf_hooks';
import { simulateScenario } from '../packages/simulation/src';
import { loadExampleScenario, scenarioIds } from '../packages/simulation/examples/scenarios';

for (const id of scenarioIds) {
  const scenario = loadExampleScenario(id);
  for (let i = 0; i < 20; i++) simulateScenario(scenario);
  const samples = Array.from({ length: 100 }, () => {
    const start = performance.now();
    simulateScenario(scenario);
    return performance.now() - start;
  }).sort((a, b) => a - b);
  console.log(JSON.stringify({ id, runs: samples.length, medianMs: samples[50], p95Ms: samples[95], maxMs: samples[99] }));
}
