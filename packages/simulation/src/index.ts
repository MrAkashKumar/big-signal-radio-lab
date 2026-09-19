import type { CalculationNode, LimitingFactor, Scenario, SimulationResult } from '../../contracts';
import { solvePropagation } from '../../propagation/src';
import { freeSpacePathLossDb, receivedPowerDbm, thermalNoiseDbm } from './physics';
import { MODE_PROFILES, requiredSnrForBandwidth } from './modes';
import { validateScenario, ScenarioValidationError } from './validateScenario';
import type { PhysicsSettings } from './laboratory';

export * from './laboratory';
export * from './network';
export * from './bandNoise';

export { MODE_PROFILES, requiredSnrForBandwidth } from './modes';
export { validateScenario, ScenarioValidationError } from './validateScenario';
export type { Scenario, SimulationResult } from '../../contracts';

function node(id: string, label: string, value: number, unit: string, equation?: string, children?: CalculationNode[]): CalculationNode {
  return { id, label, value, unit, ...(equation ? { equation } : {}), ...(children ? { children } : {}) };
}

function calculate(scenario: Scenario, physics: PhysicsSettings = { mode: 'real' }): SimulationResult {
  const fantasy = physics.mode === 'fantasy' ? physics : undefined;
  const propagation = solvePropagation(scenario, fantasy);
  const mode = MODE_PROFILES[scenario.modeId];
  const tx = scenario.transmitter;
  const rx = scenario.receiver;
  const warnings = [...propagation.warnings];
  const keys = [...propagation.explanationKeys];
  const txPol = tx.antenna.polarization;
  const rxPol = rx.antenna.polarization;
  let polarizationLossDb = 0;
  if (scenario.environment.model === 'hf-skywave') {
    warnings.push('HF polarization rotation is not resolved by this educational model. No fixed polarization loss is applied.');
  } else if (txPol === 'unknown' || rxPol === 'unknown') {
    warnings.push('Unknown polarization. The budget assumes matching polarization.');
  } else if (txPol !== rxPol) {
    polarizationLossDb = txPol === 'circular' || rxPol === 'circular' ? 3.010299956639812 : 30;
    keys.push('polarization-mismatch');
    warnings.push('Crossed linear polarizations use a 30 dB educational cap. Ideal orthogonal antennas have zero coupling. Circular handedness is not represented.');
  }
  const fspl = fantasy?.disableFreeSpaceSpreading ? 0 : freeSpacePathLossDb(propagation.spreadingDistanceM, scenario.frequencyHz) - 20 * Math.log10(fantasy?.speedOfLightMultiplier ?? 1);
  if (fantasy) {
    warnings.push('FANTASY PHYSICS — THIS IS NOT THE REAL UNIVERSE.');
    if (fantasy.disableFreeSpaceSpreading) warnings.push('Free-space spreading loss is forced to zero. This violates energy conservation; terrain and antenna losses still apply.');
    if (fantasy.disableEarthCurvature) warnings.push(scenario.environment.model === 'vhf-terrain' ? 'Earth curvature is disabled for the terrestrial horizon, bulge and ray profile. Terrain remains.' : 'Earth-curvature switch applies only to the terrestrial model. This selected model retains its defined geometry.');
    if (fantasy.removeIonosphere && scenario.environment.model !== 'hf-skywave') warnings.push('Removing the ionosphere does not change this non-skywave model.');
    if (fantasy.speedOfLightMultiplier !== 1) warnings.push(`Wave speed is ${fantasy.speedOfLightMultiplier} times c. Spreading, wavelength, diffraction and travel time use that speed. Configured HF critical frequencies remain phenomenological inputs.`);
    keys.push('fantasy-physics');
  }
  const power = receivedPowerDbm({
    txPowerDbm: tx.powerDbm, txCableLossDb: tx.feedline.lossDb, txGainDbi: tx.antenna.gainDbi,
    pathLossDb: fspl + propagation.excessLossDb + polarizationLossDb,
    rxGainDbi: rx.antenna.gainDbi, rxCableLossDb: rx.feedline.lossDb,
  });
  const externalNoiseDb = scenario.environment.externalNoiseDb ?? 0;
  const antennaTemperature = scenario.environment.temperatureK * 10 ** (externalNoiseDb / 10);
  const cableTransmission = 10 ** (-rx.feedline.lossDb / 10);
  const receiverInputTemperature = antennaTemperature * cableTransmission
    + scenario.environment.temperatureK * (1 - cableTransmission);
  const noise = thermalNoiseDbm(rx.bandwidthHz, rx.noiseFigureDb, receiverInputTemperature);
  const requiredSnrDb = requiredSnrForBandwidth(mode, rx.bandwidthHz);
  const snrDb = power - noise;
  const linkMarginDb = snrDb - requiredSnrDb;
  const sufficientBandwidth = rx.bandwidthHz >= mode.minimumBandwidthHz;
  if (!sufficientBandwidth) {
    warnings.push(`Receiver bandwidth is below the ${mode.minimumBandwidthHz} Hz minimum for ${mode.label}. Signal truncation is not modeled numerically.`);
    keys.push('bandwidth-too-narrow');
  }
  if (!propagation.available) warnings.push('No supported propagation path reaches the receiver. Numeric power, SNR, and margin are hypothetical budgets, not a prediction of reception.');
  if ((scenario.environment.model === 'hf-skywave' || scenario.frequencyHz < 30e6) && externalNoiseDb === 0) warnings.push('HF atmospheric and man-made noise are not supplied. Thermal noise alone can greatly overestimate reception quality.');
  const success = !propagation.available || !sufficientBandwidth || linkMarginDb < 0
    ? 'failed' : linkMarginDb < 6 ? 'marginal' : 'good';
  keys.push(success === 'failed' ? 'link-failed' : success === 'marginal' ? 'link-marginal' : 'link-good');
  const calculations: CalculationNode[] = [
    ...propagation.calculations,
    node('fspl', 'Free-space spreading loss', fspl, 'dB', fantasy?.disableFreeSpaceSpreading ? '0 (fantasy override)' : '20 log10(4πdf/c)', [
      node('wave-speed', 'Wave speed', 299792458 * (fantasy?.speedOfLightMultiplier ?? 1), 'm/s'),
      node('frequency', 'Frequency', scenario.frequencyHz, 'Hz'),
      node('spreading-distance', 'Ray path distance', propagation.spreadingDistanceM, 'm'),
    ]),
    node('link-budget', 'Received power', power, 'dBm', 'Ptx - Ltx + Gtx - Lfs - Lexcess - Lpol + Grx - Lrx', [
      node('tx-power', 'Transmitter power', tx.powerDbm, 'dBm'),
      node('tx-feedline', 'Transmitter cable loss', tx.feedline.lossDb, 'dB'),
      node('tx-gain', 'Transmitter antenna gain', tx.antenna.gainDbi, 'dBi'),
      node('path-loss', 'Free-space loss', fspl, 'dB'),
      node('excess-loss', 'Excess propagation loss', propagation.excessLossDb, 'dB'),
      node('polarization-loss', 'Polarization loss', polarizationLossDb, 'dB'),
      node('rx-gain', 'Receiver antenna gain', rx.antenna.gainDbi, 'dBi'),
      node('rx-feedline', 'Receiver cable loss', rx.feedline.lossDb, 'dB'),
    ]),
    node('noise-floor', 'Receiver noise floor', noise, 'dBm', '10 log10(1000 k B [Ta/Lrx + Tcable(1 - 1/Lrx) + 290(F - 1)])', [
      node('bandwidth', 'Receiver noise bandwidth', rx.bandwidthHz, 'Hz'),
      node('noise-figure', 'Receiver noise figure at 290 K', rx.noiseFigureDb, 'dB'),
      node('temperature', 'Ambient temperature', scenario.environment.temperatureK, 'K'),
      node('external-noise', 'External antenna noise excess', externalNoiseDb, 'dB'),
      node('antenna-temperature', 'Equivalent antenna noise temperature before cable', antennaTemperature, 'K'),
      node('receiver-input-temperature', 'Noise temperature after receiver cable', receiverInputTemperature, 'K', 'Ta/Lrx + Tcable(1 - 1/Lrx)'),
    ]),
    node('travel-time', 'Candidate path travel time', propagation.spreadingDistanceM / (299792458 * (fantasy?.speedOfLightMultiplier ?? 1)), 's', 'distance / wave speed'),
    node('snr', 'Signal-to-noise ratio', snrDb, 'dB', 'Received power - noise floor'),
    { ...node('required-snr', `${mode.label} required SNR`, requiredSnrDb, 'dB', 'SNRref + 10 log10(Bref / B)'), assumptions: [mode.reference, 'Educational threshold. Receiver filtering and implementation loss are simplified.'] },
    node('link-margin', 'Link margin', linkMarginDb, 'dB', 'SNR - required SNR'),
  ];
  calculations.find(item => item.id === 'fspl')!.assumptions = ['Isotropic free-space spreading with antenna gains applied separately. Far-field approximation.'];
  if (!propagation.available) calculations.find(item => item.id === 'link-budget')!.assumptions = ['Diagnostic hypothetical budget only. No supported path reaches RX.'];
  return {
    schemaVersion: 1, propagationAvailable: propagation.available,
    receivedPowerDbm: power, noiseFloorDbm: noise, snrDb, requiredSnrDb, linkMarginDb, success,
    confidence: { level: scenario.environment.model === 'hf-skywave' || mode.confidence === 'low' ? 'low' : 'medium', reasons: [
      'Educational model with configured antenna gains and losses. Not a field measurement.',
      `${mode.label} threshold confidence: ${mode.confidence}.`,
      ...(scenario.environment.model === 'hf-skywave' ? ['Single effective ionospheric shell with synthetic time variation. No live space-weather data.'] : []),
      ...(!propagation.available ? ['The chosen propagation model has no usable return path.'] : []),
    ] },
    calculations, limitingFactors: [], propagationPaths: propagation.paths,
    warnings: [...new Set(warnings)], explanationKeys: [...new Set(keys)],
  };
}

function improvements(scenario: Scenario, base: SimulationResult, physics: PhysicsSettings): LimitingFactor[] {
  const candidates: { id: string; label: string; key: string; edit: (candidate: Scenario) => void }[] = [
    { id: 'power', label: scenario.transmitter.powerDbm <= 100 ? 'Increase transmitter power tenfold' : 'Increase transmitter power to the 110 dBm model limit', key: 'more-power', edit: s => { s.transmitter.powerDbm = Math.min(110, s.transmitter.powerDbm + 10); } },
    { id: 'feedline', label: 'Remove feedline loss', key: 'feedline-loss', edit: s => { s.transmitter.feedline.lossDb = 0; s.receiver.feedline.lossDb = 0; } },
  ];
  const profile = MODE_PROFILES[scenario.modeId];
  const bandwidthInvalid = scenario.receiver.bandwidthHz < profile.minimumBandwidthHz;
  if (bandwidthInvalid) candidates.push({ id: 'bandwidth', label: `Set receiver bandwidth to ${profile.bandwidthHz} Hz`, key: 'bandwidth-too-narrow', edit: s => { s.receiver.bandwidthHz = profile.bandwidthHz; } });
  if (scenario.environment.model === 'vhf-terrain') candidates.push(
    { id: 'height', label: 'Raise low antennas to 15 m', key: 'antenna-height', edit: s => { s.transmitter.antenna.heightM = Math.max(15, s.transmitter.antenna.heightM); s.receiver.antenna.heightM = Math.max(15, s.receiver.antenna.heightM); } },
    { id: 'terrain', label: 'Relocate to clear the modeled obstruction', key: 'terrain-obstruction', edit: s => { if (s.environment.model === 'vhf-terrain') delete s.environment.obstruction; } },
  );
  if (scenario.environment.model !== 'hf-skywave' && scenario.transmitter.antenna.polarization !== 'unknown') candidates.push(
    { id: 'polarization', label: 'Match antenna polarizations', key: 'polarization-mismatch', edit: s => { s.receiver.antenna.polarization = s.transmitter.antenna.polarization; } },
  );
  if (scenario.environment.model === 'hf-skywave') {
    const muf = base.calculations.find(item => item.id === 'hf-muf')?.value;
    if (muf) candidates.push({ id: 'frequency', label: 'Try 80% of modeled MUF', key: 'hf-frequency', edit: s => { s.frequencyHz = Math.max(1e6, Math.min(30e6, muf * 0.8e6)); } });
  }
  return candidates.flatMap(candidate => {
    const changed = structuredClone(scenario);
    candidate.edit(changed);
    try { validateScenario(changed); } catch (error) {
      if (error instanceof ScenarioValidationError) return [];
      throw error;
    }
    const after = calculate(changed, physics);
    const restoresPath = !base.propagationAvailable && after.propagationAvailable;
    const repairsBandwidth = bandwidthInvalid && changed.receiver.bandwidthHz >= profile.minimumBandwidthHz;
    const repairsConstraint = restoresPath || repairsBandwidth;
    const delta = after.linkMarginDb - base.linkMarginDb;
    if (!repairsConstraint && (bandwidthInvalid || !base.propagationAvailable || !after.propagationAvailable || delta < 0.01)) return [];
    return [{
      id: candidate.id, label: restoresPath ? `${candidate.label} to restore a path` : candidate.label,
      impactDb: repairsConstraint ? 0 : -delta,
      possibleImprovementDb: repairsConstraint ? 0 : delta,
      confidence: repairsConstraint || scenario.environment.model === 'hf-skywave' ? 0.3 : 0.8,
      explanationKey: candidate.key,
    }];
  }).sort((a, b) => b.possibleImprovementDb - a.possibleImprovementDb || a.id.localeCompare(b.id));
}

export function simulateScenario(scenario: Scenario, physics: PhysicsSettings = { mode: 'real' }): SimulationResult {
  if (!physics || (physics.mode !== 'real' && physics.mode !== 'fantasy')) throw new RangeError('Unknown physics mode');
  if (physics.mode === 'fantasy') {
    for (const key of ['disableEarthCurvature', 'removeIonosphere', 'disableFreeSpaceSpreading'] as const) if (typeof physics[key] !== 'boolean') throw new RangeError(`${key} must be a boolean`);
    if (!Number.isFinite(physics.speedOfLightMultiplier) || physics.speedOfLightMultiplier < 0.01 || physics.speedOfLightMultiplier > 100) throw new RangeError('Wave speed multiplier must be within 0.01 to 100');
  }
  const parsed = validateScenario(scenario);
  const result = calculate(parsed, physics);
  result.limitingFactors = improvements(parsed, result, physics);
  return result;
}
