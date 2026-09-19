import type { GeoPosition } from "../../contracts";

export const EARTH_RADIUS_M = 6_371_000;
type Vector = [number, number, number];
export function toCartesian(p: GeoPosition): Vector {
  const lat = p.latitudeDeg * Math.PI / 180;
  const lon = p.longitudeDeg * Math.PI / 180;
  const r = EARTH_RADIUS_M + p.altitudeM;
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat)];
}
export function chordDistanceM(a: GeoPosition, b: GeoPosition): number {
  const x = toCartesian(a), y = toCartesian(b);
  return Math.hypot(...x.map((v, i) => v - y[i]));
}
export function greatCircleDistanceM(a: GeoPosition, b: GeoPosition): number {
  const x = toCartesian({ ...a, altitudeM: 0 }).map(v => v / EARTH_RADIUS_M);
  const y = toCartesian({ ...b, altitudeM: 0 }).map(v => v / EARTH_RADIUS_M);
  const cross = Math.hypot(x[1]*y[2]-x[2]*y[1], x[2]*y[0]-x[0]*y[2], x[0]*y[1]-x[1]*y[0]);
  return EARTH_RADIUS_M * Math.atan2(cross, x.reduce((sum, v, i) => sum + v*y[i], 0));
}
export function interpolateGreatCircle(a: GeoPosition, b: GeoPosition, fraction: number): GeoPosition {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) throw new RangeError("fraction must be in [0, 1]");
  if (fraction === 0) return { ...a };
  if (fraction === 1) return { ...b };
  const x = toCartesian({ ...a, altitudeM: 0 }).map(v => v / EARTH_RADIUS_M);
  const y = toCartesian({ ...b, altitudeM: 0 }).map(v => v / EARTH_RADIUS_M);
  const dot = Math.max(-1, Math.min(1, x.reduce((sum, v, i) => sum + v*y[i], 0)));
  const angle = greatCircleDistanceM(a, b) / EARTH_RADIUS_M;
  let tangent = y.map((v, i) => v - dot*x[i]);
  let length = Math.hypot(...tangent);
  if (length < 1e-12) {
    if (dot > 0) return { ...a, altitudeM: a.altitudeM + fraction*(b.altitudeM-a.altitudeM) };
    // Antipodes have no unique shortest route. Choose a deterministic orthogonal plane.
    const axis = x.map(Math.abs).indexOf(Math.min(...x.map(Math.abs)));
    tangent = x.map((v, i) => Number(i === axis) - x[axis]*v);
    length = Math.hypot(...tangent);
  }
  const p = x.map((v, i) => v*Math.cos(angle*fraction) + tangent[i]/length*Math.sin(angle*fraction));
  return { latitudeDeg: Math.atan2(p[2], Math.hypot(p[0], p[1]))*180/Math.PI,
    longitudeDeg: Math.atan2(p[1], p[0])*180/Math.PI,
    altitudeM: a.altitudeM + fraction*(b.altitudeM-a.altitudeM) };
}
