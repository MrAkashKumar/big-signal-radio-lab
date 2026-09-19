import { describe, expect, it } from "vitest";
import type { Scenario } from "../../contracts";
import { EARTH_RADIUS_M, greatCircleDistanceM, interpolateGreatCircle, knifeEdgeLossDb, solvePropagation } from "./index";
const pos = (longitudeDeg: number, latitudeDeg=0) => ({ latitudeDeg, longitudeDeg, altitudeM: 0 });
function scenario(): Scenario {
  const antenna = { id: "a", type: "dipole" as const, gainDbi: 0, heightM: 2, polarization: "horizontal" as const };
  return { schemaVersion: 1, id: "test", title: "Test", difficulty: "advanced", frequencyHz: 7e6, modeId: "ssb",
    transmitter: { position: pos(-10), powerDbm: 30, antenna: { ...antenna }, feedline: { lengthM: 0, lossDb: 0 } },
    receiver: { position: pos(10), antenna: { ...antenna }, feedline: { lengthM: 0, lossDb: 0 }, bandwidthHz: 2400, noiseFigureDb: 3 },
    environment: { model: "hf-skywave", temperatureK: 290, effectiveHeightM: 300000, criticalFrequencyMHzDay: 7, criticalFrequencyMHzNight: 3,
      absorptionDbAt10MHzDay: 5, absorptionDbAt10MHzNight: 1, groundReflectionLossDb: 3, maxHops: 8 }, time: { utcIso: "2026-09-13T12:00:00Z" } };
}
const calculation = (s: ReturnType<typeof solvePropagation>, id: string) => s.calculations.find(n=>n.id===id)!.value;
describe("spherical geographic geometry", () => {
  it("matches quarter and half circumference", () => {
    expect(greatCircleDistanceM(pos(0),pos(90))).toBeCloseTo(Math.PI*EARTH_RADIUS_M/2,6);
    expect(greatCircleDistanceM(pos(0),pos(180))).toBeCloseTo(Math.PI*EARTH_RADIUS_M,6);
  });
  it("takes the short dateline route", () => {
    expect(greatCircleDistanceM(pos(179),pos(-179))).toBeCloseTo(2*Math.PI*EARTH_RADIUS_M/180,6);
    expect(Math.abs(interpolateGreatCircle(pos(179),pos(-179),0.5).longitudeDeg)).toBeCloseTo(180);
  });
  it("handles coincident, polar and antipodal positions", () => {
    for (const [a,b] of [[pos(0),pos(0)],[pos(0,90),pos(90,90)],[pos(0),pos(180)]]) {
      const mid = interpolateGreatCircle(a,b,0.5);
      expect(Object.values(mid).every(Number.isFinite)).toBe(true);
      expect(greatCircleDistanceM(a,mid)).toBeCloseTo(greatCircleDistanceM(a,b)/2,5);
    }
  });
  it("interpolates altitude separately and rejects outside fractions", () => {
    expect(interpolateGreatCircle(pos(0),{...pos(1),altitudeM:100},0.25).altitudeM).toBe(25);
    expect(()=>interpolateGreatCircle(pos(0),pos(1),NaN)).toThrow(RangeError);
  });
});
describe("single obstruction diffraction", () => {
  it("matches independent ITU knife-edge reference values", () => {
    expect(knifeEdgeLossDb(0)).toBeCloseTo(6.0328522086,8);
    expect(knifeEdgeLossDb(1)).toBeCloseTo(13.92572893496,8);
    expect(knifeEdgeLossDb(-1)).toBe(0);
  });
  it("keeps large finite diffraction parameters finite and monotonic", () => {
    const values = [1, 1e10, 1e100, 1e308].map(knifeEdgeLossDb);
    expect(values.every(Number.isFinite)).toBe(true);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i-1]);
  });
  it("raising the antenna clears a near-transmitter ridge by more than 10 dB", () => {
    const s = scenario(); s.frequencyHz=146e6; s.transmitter.position=pos(0); s.receiver.position=pos(0.04);
    s.environment={ model:"vhf-terrain",temperatureK:290,effectiveEarthRadiusFactor:4/3,obstruction:{fraction:0.01,altitudeM:9} };
    const low = solvePropagation(s); s.transmitter.antenna.heightM=15; const high = solvePropagation(s);
    expect(low.available).toBe(true); expect(low.excessLossDb-high.excessLossDb).toBeGreaterThan(10);
  });
  it("does not claim a terrestrial route past the radio horizon", () => {
    const s = scenario(); s.environment={model:"vhf-terrain",temperatureK:290,effectiveEarthRadiusFactor:4/3};
    expect(solvePropagation(s).available).toBe(false);
  });
});
describe("educational HF shell", () => {
  it("returns a usable route and escapes above its own MUF", () => {
    const s = scenario(), good = solvePropagation(s);
    expect(good.available).toBe(true);
    expect(good.paths[0].points.at(-1)?.altitudeM).toBe(2);
    s.frequencyHz=calculation(good,"hf-muf")*1e6*1.001;
    const escaped=solvePropagation(s);
    expect(escaped.available).toBe(false);
    expect(escaped.paths[0].points.at(-1)!.altitudeM).toBeGreaterThan(300000);
    expect(escaped.excessLossDb).toBeLessThan(good.excessLossDb);
  });
  it("uses deterministic local daylight for MUF and absorption", () => {
    const s=scenario(), day=solvePropagation(s); s.time.utcIso="2026-09-13T00:00:00Z"; const night=solvePropagation(s);
    expect(calculation(day,"hf-local-hour")).toBe(12);
    expect(calculation(night,"hf-local-hour")).toBe(0);
    expect(calculation(day,"hf-muf")/calculation(night,"hf-muf")).toBeCloseTo(7/3);
    expect(day.excessLossDb/night.excessLossDb).toBeCloseTo(5);
  });
  it("uses inverse frequency squared absorption without an artificial lower cutoff", () => {
    const s=scenario(); s.frequencyHz=3e6; const low=solvePropagation(s); s.frequencyHz=6e6;
    expect(low.excessLossDb/solvePropagation(s).excessLossDb).toBeCloseTo(4);
  });
  it("counts spherical hops and ground bounces and enforces maxHops", () => {
    const s=scenario(); s.transmitter.position=pos(-60); s.receiver.position=pos(60);
    const result=solvePropagation(s), hops=calculation(result,"hf-hops");
    expect(hops).toBe(4); expect(result.paths[0].points).toHaveLength(9);
    expect(calculation(result,"hf-ground-loss")).toBe(9);
    expect(result.spreadingDistanceM).toBeGreaterThan(result.surfaceDistanceM);
    if(s.environment.model==="hf-skywave") s.environment.maxHops=3;
    expect(solvePropagation(s).available).toBe(false); expect(solvePropagation(s).paths).toEqual([]);
  });
  it("vertical incidence has MUF equal to the critical frequency", () => {
    const s=scenario(); s.transmitter.position=pos(0); s.receiver.position=pos(0);
    expect(calculation(solvePropagation(s),"hf-muf")).toBeCloseTo(7,10);
  });
});
