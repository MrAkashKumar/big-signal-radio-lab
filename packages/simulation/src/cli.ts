import { readFileSync } from 'node:fs';
import { simulateScenario, validateScenario, ScenarioValidationError } from './index';
import { loadExampleScenario, scenarioIds } from '../examples/scenarios';

const args = process.argv.slice(2);
try {
  if (args.length === 0 || (args.length === 1 && args[0] === '--help')) {
    console.log('Usage: bun run packages/simulation/src/cli.ts --list | --example <id> | --input <scenario.json>');
  } else if (args.length === 1 && args[0] === '--list') {
    console.log(JSON.stringify(scenarioIds, null, 2));
  } else if (args.length === 2 && (args[0] === '--example' || args[0] === '--input')) {
    const scenario = args[0] === '--example'
      ? loadExampleScenario(args[1])
      : validateScenario(JSON.parse(readFileSync(args[1], 'utf8')));
    console.log(JSON.stringify(simulateScenario(scenario), null, 2));
  } else {
    throw new Error('Use --help, --list, --example <id>, or --input <scenario.json>.');
  }
} catch (error) {
  console.error(JSON.stringify({
    error: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
    ...(error instanceof ScenarioValidationError ? { issues: error.issues } : {}),
  }));
  process.exitCode = 1;
}
