export interface ModeProfile {
  readonly id: string;
  readonly label: string;
  readonly bandwidthHz: number;
  readonly requiredSnrDb: number;
  readonly referenceBandwidthHz: number;
  readonly minimumBandwidthHz: number;
  readonly reference: string;
  readonly confidence: 'high' | 'medium' | 'low';
}

export const MODE_PROFILES: Readonly<Record<string, Readonly<ModeProfile>>> = Object.freeze({
  'fm-voice': Object.freeze({
    id: 'fm-voice', label: 'FM voice', bandwidthHz: 12500, requiredSnrDb: 12,
    referenceBandwidthHz: 12500, minimumBandwidthHz: 12500,
    reference: 'Educational 12 dB input-SNR threshold, not a measured receiver limit. Icom specifies FM sensitivity using 12 dB SINAD, which is not input SNR: https://www.icomjapan.com/lineup/products/IC-2730A/',
    confidence: 'low',
  }),
  ssb: Object.freeze({
    id: 'ssb', label: 'SSB voice', bandwidthHz: 2400, requiredSnrDb: 10,
    referenceBandwidthHz: 2400, minimumBandwidthHz: 2400,
    reference: 'Educational 10 dB threshold at 2400 Hz, not a universal intelligibility limit. Receiver specification context: https://www.icomjapan.com/lineup/products/IC-7300_USA/?open=2',
    confidence: 'low',
  }),
  cw: Object.freeze({
    id: 'cw', label: 'CW', bandwidthHz: 500, requiredSnrDb: 3,
    referenceBandwidthHz: 500, minimumBandwidthHz: 250,
    reference: 'Educational 3 dB threshold, not a measured decoding limit. The 500 Hz receive filter context comes from ARRL training: https://www.arrl.org/files/file/Instructor%20resources/Technician%20Class/AD7FO%20Technician%20rev%202_05%20pdf.pdf',
    confidence: 'low',
  }),
  ft8: Object.freeze({
    id: 'ft8', label: 'FT8', bandwidthHz: 2500, requiredSnrDb: -21,
    referenceBandwidthHz: 2500, minimumBandwidthHz: 50,
    reference: 'WSJT-X User Guide protocol summary gives approximate FT8 threshold -21 dB referenced to 2500 Hz; decoding depends on timing, interference and implementation: https://wsjt.sourceforge.io/wsjtx-main_en.html',
    confidence: 'medium',
  }),
});

export function requiredSnrForBandwidth(mode: ModeProfile, bandwidthHz: number): number {
  if (!Number.isFinite(bandwidthHz) || bandwidthHz <= 0) throw new RangeError('bandwidthHz must be finite and positive');
  return mode.requiredSnrDb + 10 * (Math.log10(mode.referenceBandwidthHz) - Math.log10(bandwidthHz));
}
