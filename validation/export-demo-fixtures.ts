import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { simulateScenario } from '../packages/simulation/src';
import { loadExampleScenario, scenarioIds } from '../packages/simulation/examples/scenarios';

const scenarios = Object.fromEntries(scenarioIds.map(id => [id, loadExampleScenario(id)]));
const results = Object.fromEntries(scenarioIds.map(id => [id, simulateScenario(scenarios[id])]));
for (const [file, value] of [['demo-scenarios.json', scenarios], ['demo-results.json', results]] as const) {
  const path = fileURLToPath(new URL(`./fixtures/${file}`, import.meta.url));
  const text = JSON.stringify(value, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(path, 'utf8') !== text) throw new Error(`${file} is stale. Review changes and regenerate.`);
  } else writeFileSync(path, text);
}
console.log(process.argv.includes('--check') ? 'Demo fixtures match the current engine.' : 'Exported all demo scenarios and results.');
