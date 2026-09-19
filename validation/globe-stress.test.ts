import { describe, expect, it } from 'vitest';
import type { GeoPosition, PropagationPath, Scenario } from '../packages/contracts';
import { greatCircleDistanceM, interpolateGreatCircle, solvePropagation } from '../packages/propagation/src';
import { loadExampleScenario } from '../packages/simulation/examples/scenarios';
import { simulateScenario, validateScenario } from '../packages/simulation/src';

const radius = 6_371_000;
const position = (latitudeDeg: number, longitudeDeg: number, altitudeM = 0): GeoPosition => ({ latitudeDeg, longitudeDeg, altitudeM });
const routes = [
  ['pole crossing', position(80, 0), position(80, 180)],
  ['antimeridian', position(20, 179), position(20, -179)],
  ['antipodes', position(0, 0), position(0, 180)],
  ['near antipodes', position(30, 20), position(-30.000001, -159.999999)],
  ['north to south', position(90, 0), position(-90, 0)],
  ['near coincident', position(10, 10), position(10, 10.00002)],
  ['elevated sites', position(-35, 149, 1500), position(51, -1, 8000)],
] as const;
type Point = PropagationPath['points'][number];
function xyz(p: Point): number[] {
  const lat = p.lat!*Math.PI/180, lon = p.lon!*Math.PI/180;
  return [(radius+p.altitudeM!)*Math.cos(lat)*Math.cos(lon), (radius+p.altitudeM!)*Math.cos(lat)*Math.sin(lon), (radius+p.altitudeM!)*Math.sin(lat)];
}
function expectGeographic(p: Point) {
  expect(Number.isFinite(p.lat)).toBe(true);
  expect(Number.isFinite(p.lon)).toBe(true);
  expect(Number.isFinite(p.altitudeM)).toBe(true);
  expect(Math.abs(p.lat!)).toBeLessThanOrEqual(90);
  expect(Math.abs(p.lon!)).toBeLessThanOrEqual(180);
}
function routeScenario(a: GeoPosition, b: GeoPosition): Scenario {
  const s = loadExampleScenario('hf-day');
  s.transmitter.position = { ...a }; s.receiver.position = { ...b };
  s.frequencyHz = 1e6;
  if (s.environment.model === 'hf-skywave') s.environment.maxHops = 10;
  return validateScenario(s);
}

describe('deterministic globe geometry stress', () => {
  it.each(routes)('%s preserves reciprocal distance and great-circle subdivision', (_, a, b) => {
    const distance = greatCircleDistanceM(a,b);
    expect(distance).toBeCloseTo(greatCircleDistanceM(b,a),7);
    for (const f of [0,0.001,0.1,0.5,0.9,0.999,1]) {
      const p = interpolateGreatCircle(a,b,f);
      expectGeographic({lat:p.latitudeDeg,lon:p.longitudeDeg,altitudeM:p.altitudeM});
      expect(greatCircleDistanceM(a,p)).toBeCloseTo(distance*f,1);
      expect(greatCircleDistanceM(p,b)).toBeCloseTo(distance*(1-f),1);
    }
  });
  it('matches independent meridian arcs through a pole', () => {
    const a=position(80,0), b=position(80,180);
    expect(greatCircleDistanceM(a,b)).toBeCloseTo(radius*Math.PI/9,6);
    expect(interpolateGreatCircle(a,b,0.5).latitudeDeg).toBeCloseTo(90,10);
  });
  it.each(routes)('%s produces complete above-Earth HF rays with independently summed length', (_, a,b) => {
    const s=routeScenario(a,b), result=solvePropagation(s);
    expect(result.available).toBe(true);
    const points=result.paths[0].points;
    points.forEach(expectGeographic);
    expect(points[0]).toEqual({lat:a.latitudeDeg,lon:a.longitudeDeg,altitudeM:a.altitudeM+s.transmitter.antenna.heightM});
    expect(points.at(-1)).toEqual({lat:b.latitudeDeg,lon:b.longitudeDeg,altitudeM:b.altitudeM+s.receiver.antenna.heightM});
    let length=0;
    for (let i=1;i<points.length;i++) {
      const start=xyz(points[i-1]), end=xyz(points[i]);
      const delta=end.map((v,j)=>v-start[j]);
      const square=delta.reduce((sum,v)=>sum+v*v,0);
      const t=Math.max(0,Math.min(1,-start.reduce((sum,v,j)=>sum+v*delta[j],0)/square));
      const nearest=start.map((v,j)=>v+t*delta[j]);
      const midpoint=start.map((v,j)=>(v+end[j])/2);
      expect(Math.hypot(...nearest)).toBeGreaterThanOrEqual(radius-1e-6);
      expect(Math.hypot(...midpoint)).toBeGreaterThan(radius);
      length+=Math.sqrt(square);
    }
    expect(result.spreadingDistanceM).toBeCloseTo(length,6);
    const output=simulateScenario(s);
    expect(Number.isFinite(output.receivedPowerDbm)).toBe(true);
    expect(output.propagationAvailable).toBe(true);
  });
  it('rejects insufficient hop allowance on an antipodal circuit', () => {
    const s=routeScenario(position(0,0),position(0,180));
    if(s.environment.model==='hf-skywave') { s.environment.effectiveHeightM=100000; s.environment.maxHops=1; }
    const result=solvePropagation(validateScenario(s));
    expect(result.available).toBe(false); expect(result.paths).toEqual([]);
    expect(result.calculations.find(n=>n.id==='hf-hops')!.value).toBe(9);
    expect(simulateScenario(s).success).toBe('failed');
  });
  it('escapes along a straight outgoing ray without a return vertex', () => {
    const s=loadExampleScenario('hf-above-muf'), result=solvePropagation(s);
    expect(result.available).toBe(false);
    const points=result.paths[0].points;
    expect(points).toHaveLength(3); points.forEach(expectGeographic);
    const [a,b,c]=points.map(xyz);
    for(let i=0;i<3;i++) expect(c[i]-b[i]).toBeCloseTo(b[i]-a[i],6);
    expect(points[2].altitudeM!).toBeGreaterThan(points[1].altitudeM!);
    expect(simulateScenario(s).success).toBe('failed');
  });
  it('changes local daylight with longitude while preserving reciprocity away from antipodes', () => {
    const s=routeScenario(position(20,179),position(20,-179));
    s.time.utcIso='2026-09-13T00:00:00Z'; const noon=solvePropagation(s);
    s.time.utcIso='2026-09-13T12:00:00Z'; const midnight=solvePropagation(s);
    const value=(result: ReturnType<typeof solvePropagation>,id:string)=>result.calculations.find(n=>n.id===id)!.value;
    expect(value(noon,'hf-local-hour')).toBeCloseTo(12);
    expect(value(midnight,'hf-local-hour')).toBeCloseTo(0);
    expect(value(noon,'hf-muf')).toBeGreaterThan(value(midnight,'hf-muf'));
    const oldTx=s.transmitter.position; s.transmitter.position=s.receiver.position; s.receiver.position=oldTx;
    expect(value(solvePropagation(s),'hf-muf')).toBeCloseTo(value(midnight,'hf-muf'),8);
  });
  it('returns no VHF route between distinct zero-height sea-level terminals', () => {
    const s=loadExampleScenario('vhf-clear');
    s.transmitter.antenna.heightM=0; s.receiver.antenna.heightM=0;
    const result=solvePropagation(validateScenario(s));
    expect(result.available).toBe(false); expect(result.paths).toEqual([]);
    expect(simulateScenario(s).success).toBe('failed');
  });
  it('does not bend a Fresnel-only encroachment into the Earth', () => {
    const s=loadExampleScenario('vhf-clear');
    s.receiver.position=position(0,0.09);
    if(s.environment.model==='vhf-terrain') s.environment.obstruction={ fraction:0.1, altitudeM:0 };
    const result=solvePropagation(validateScenario(s));
    expect(result.available).toBe(true);
    expect(result.excessLossDb).toBeGreaterThan(0);
    expect(result.paths[0].type).toBe('direct');
    expect(result.explanationKeys).toContain('fresnel-obstruction');
    for(const p of result.paths[0].points) expect(p.altitudeM!).toBeGreaterThan(0);
  });
  it('keeps VHF sampled paths bounded, above ground, and connected at elevated dateline sites', () => {
    const s=loadExampleScenario('vhf-clear');
    s.transmitter.position=position(0,179.99,1000); s.receiver.position=position(0,-179.99,2000);
    const result=solvePropagation(validateScenario(s));
    expect(result.available).toBe(true);
    const points=result.paths[0].points;
    expect(points.length).toBeGreaterThan(2); expect(points.length).toBeLessThanOrEqual(65);
    for(const p of points) { expectGeographic(p); expect(p.altitudeM!).toBeGreaterThan(0); expect(p.altitudeM!).toBeLessThanOrEqual(2002); }
    expect(points[0].altitudeM).toBe(1002); expect(points.at(-1)?.altitudeM).toBe(2002);
  });
});
