import type { Scenario } from '../../contracts';
import { exampleScenario } from '../../contracts/exampleScenario';
import { defaultExternalNoiseDbForBand, quietRuralNoiseFactorDb } from '../src/bandNoise';

function scenario(id: string, title: string): Scenario {
  const value = structuredClone(exampleScenario);
  value.id = id;
  value.title = title;
  return value;
}

const vhfClear = scenario('vhf-clear', 'VHF line of sight');
vhfClear.receiver.position.longitudeDeg = 0.04;
vhfClear.environment = { model: 'vhf-terrain', temperatureK: 290, externalNoiseDb: defaultExternalNoiseDbForBand('VHF'), effectiveEarthRadiusFactor: 4 / 3 };

const vhfRidge = structuredClone(vhfClear);
vhfRidge.id = 'vhf-ridge';
vhfRidge.title = 'A ridge and a noisy receiver';
vhfRidge.transmitter.antenna.gainDbi = -7;
vhfRidge.receiver.antenna.gainDbi = -7;
vhfRidge.environment = {
  model: 'vhf-terrain', temperatureK: 290,
  // This deliberate local-interference override preserves the adverse-noise recovery lesson. It is not a VHF average.
  externalNoiseDb: 47,
  effectiveEarthRadiusFactor: 4 / 3, obstruction: { fraction: 0.01, altitudeM: 9 },
};

const vhfPower = structuredClone(vhfRidge);
vhfPower.id = 'vhf-ridge-power';
vhfPower.title = 'Same ridge, ten times the power';
vhfPower.transmitter.powerDbm += 10;

const vhfHeight = structuredClone(vhfRidge);
vhfHeight.id = 'vhf-ridge-height';
vhfHeight.title = 'Same ridge, a 15 m antenna';
vhfHeight.transmitter.antenna.heightM = 15;

const vhfHorizon = structuredClone(vhfClear);
vhfHorizon.id = 'vhf-horizon';
vhfHorizon.title = 'Beyond the modeled radio horizon';
vhfHorizon.receiver.position.longitudeDeg = 1;

const hfDay = scenario('hf-day', 'HF daytime skywave');
hfDay.frequencyHz = 14e6;
hfDay.modeId = 'ssb';
hfDay.transmitter.powerDbm = 50;
hfDay.transmitter.antenna = { id: 'tx-dipole', type: 'dipole', gainDbi: 2.15, heightM: 10, polarization: 'horizontal' };
hfDay.receiver.antenna = { ...hfDay.transmitter.antenna, id: 'rx-dipole' };
hfDay.receiver.position.longitudeDeg = 20;
hfDay.receiver.bandwidthHz = 2400;
hfDay.environment = {
  model: 'hf-skywave', temperatureK: 290, externalNoiseDb: quietRuralNoiseFactorDb(hfDay.frequencyHz), effectiveHeightM: 300000,
  criticalFrequencyMHzDay: 7, criticalFrequencyMHzNight: 3,
  absorptionDbAt10MHzDay: 4, absorptionDbAt10MHzNight: 0.5,
  groundReflectionLossDb: 3, maxHops: 6,
};
hfDay.time.utcIso = '2026-09-13T11:20:00.000Z';

const hfNight = structuredClone(hfDay);
hfNight.id = 'hf-night';
hfNight.title = 'Same HF circuit at night';
hfNight.time.utcIso = '2026-09-13T23:20:00.000Z';

const hfAboveMuf = structuredClone(hfDay);
hfAboveMuf.id = 'hf-above-muf';
hfAboveMuf.title = 'The ionosphere has declined your request';
hfAboveMuf.frequencyHz = 30e6;
hfAboveMuf.environment.externalNoiseDb = quietRuralNoiseFactorDb(hfAboveMuf.frequencyHz);

const hfLow = structuredClone(hfDay);
hfLow.id = 'hf-absorption';
hfLow.title = 'Low-frequency daytime absorption';
hfLow.frequencyHz = 1.8e6;
hfLow.environment.externalNoiseDb = quietRuralNoiseFactorDb(hfLow.frequencyHz);

const hfMultiHop = structuredClone(hfDay);
hfMultiHop.id = 'hf-multihop';
hfMultiHop.title = 'HF across multiple hops';
hfMultiHop.frequencyHz = 7e6;
hfMultiHop.environment.externalNoiseDb = quietRuralNoiseFactorDb(hfMultiHop.frequencyHz);
hfMultiHop.receiver.position.longitudeDeg = 80;
hfMultiHop.time.utcIso = '2026-09-13T09:20:00.000Z';

const hfFt8 = structuredClone(hfMultiHop);
hfFt8.id = 'hf-ft8';
hfFt8.title = 'Weak-signal FT8 budget';
hfFt8.modeId = 'ft8';
hfFt8.receiver.bandwidthHz = 2500;
hfFt8.transmitter.powerDbm = 30;

const microwave = scenario('microwave-clear', '2.4 GHz directional link');
microwave.frequencyHz = 2.4e9;
microwave.transmitter.powerDbm = 30;
microwave.transmitter.antenna.gainDbi = 24;
microwave.receiver.antenna.gainDbi = 24;
microwave.transmitter.antenna.type = 'dish';
microwave.receiver.antenna.type = 'dish';
microwave.transmitter.antenna.heightM = 15;
microwave.receiver.antenna.heightM = 15;
microwave.receiver.position.longitudeDeg = 0.05;
microwave.environment = { model: 'vhf-terrain', temperatureK: 290, externalNoiseDb: defaultExternalNoiseDbForBand('MICROWAVE'), effectiveEarthRadiusFactor: 4 / 3, obstruction: { fraction: 0.5, altitudeM: 5 } };

const examples: Readonly<Record<string, Scenario>> = {
  'vhf-clear': vhfClear, 'vhf-ridge': vhfRidge, 'vhf-ridge-power': vhfPower,
  'vhf-ridge-height': vhfHeight, 'vhf-horizon': vhfHorizon,
  'hf-day': hfDay, 'hf-night': hfNight, 'hf-above-muf': hfAboveMuf,
  'hf-absorption': hfLow, 'hf-multihop': hfMultiHop, 'hf-ft8': hfFt8,
  'microwave-clear': microwave,
};

export const scenarioIds = Object.freeze(Object.keys(examples));

export function loadExampleScenario(id: string): Scenario {
  if (!Object.hasOwn(examples, id)) throw new RangeError(`Unknown example scenario: ${id}`);
  return structuredClone(examples[id]);
}
