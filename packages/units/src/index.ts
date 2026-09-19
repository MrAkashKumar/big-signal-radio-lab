function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
}

function positive(value: number, name: string): number {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be greater than zero`);
  return value;
}

function scale(value: number, multiplier: number, name: string): number {
  finite(value, name);
  if (value < 0) throw new RangeError(`${name} must be nonnegative`);
  return finite(value * multiplier, name);
}

export function wattsToDbm(watts: number): number {
  return 10 * Math.log10(positive(watts, 'watts')) + 30;
}

export function dbmToWatts(dbm: number): number {
  return positive(10 ** ((finite(dbm, 'dBm') - 30) / 10), 'watts');
}

export function milliwattsToDbm(milliwatts: number): number {
  return 10 * Math.log10(positive(milliwatts, 'milliwatts'));
}

export function dbmToMilliwatts(dbm: number): number {
  return positive(10 ** (finite(dbm, 'dBm') / 10), 'milliwatts');
}

export function hzToMhz(hz: number): number { return scale(hz, 1e-6, 'Hz'); }
export function mhzToHz(mhz: number): number { return scale(mhz, 1e6, 'MHz'); }
export function metersToKm(meters: number): number { return scale(meters, 1e-3, 'meters'); }
export function kmToMeters(km: number): number { return scale(km, 1e3, 'km'); }

export function addDb(...terms: number[]): number {
  return finite(terms.reduce((sum, term) => sum + finite(term, 'dB'), 0), 'dB sum');
}
