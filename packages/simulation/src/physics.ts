const SPEED_OF_LIGHT_M_PER_S = 299_792_458;
const BOLTZMANN_J_PER_K = 1.380649e-23;

function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function positive(value: number, name: string): void {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be greater than zero`);
}

export function freeSpacePathLossDb(distanceM: number, frequencyHz: number): number {
  positive(distanceM, 'distanceM');
  positive(frequencyHz, 'frequencyHz');
  return 20 * (Math.log10(distanceM) + Math.log10(frequencyHz)
    + Math.log10(4 * Math.PI / SPEED_OF_LIGHT_M_PER_S));
}

export function thermalNoiseDbm(bandwidthHz: number, noiseFigureDb = 0, temperatureK = 290): number {
  positive(bandwidthHz, 'bandwidthHz');
  positive(temperatureK, 'temperatureK');
  finite(noiseFigureDb, 'noiseFigureDb');
  if (noiseFigureDb < 0) throw new RangeError('noiseFigureDb must be nonnegative');
  const receiverTemperatureK = 290 * (10 ** (noiseFigureDb / 10) - 1);
  const result = 10 * (Math.log10(BOLTZMANN_J_PER_K)
    + Math.log10(temperatureK + receiverTemperatureK) + Math.log10(bandwidthHz)) + 30;
  finite(result, 'noise floor');
  return result;
}

export interface LinkBudgetInput {
  txPowerDbm: number;
  txCableLossDb: number;
  txGainDbi: number;
  pathLossDb: number;
  rxGainDbi: number;
  rxCableLossDb: number;
}

export function receivedPowerDbm(input: LinkBudgetInput): number {
  const { txPowerDbm, txCableLossDb, txGainDbi, pathLossDb, rxGainDbi, rxCableLossDb } = input;
  for (const [name, value] of Object.entries({ txPowerDbm, txCableLossDb, txGainDbi, pathLossDb, rxGainDbi, rxCableLossDb })) {
    finite(value, name);
  }
  if (txCableLossDb < 0 || rxCableLossDb < 0) throw new RangeError('Cable losses must be nonnegative');
  const result = txPowerDbm - txCableLossDb + txGainDbi - pathLossDb + rxGainDbi - rxCableLossDb;
  finite(result, 'received power');
  return result;
}
