import type { CalculationNode, GeoPosition, PropagationPath, Scenario } from "../../contracts";
import { chordDistanceM, EARTH_RADIUS_M, greatCircleDistanceM, interpolateGreatCircle, toCartesian } from "./geometry";
export { EARTH_RADIUS_M, greatCircleDistanceM, interpolateGreatCircle } from "./geometry";

export interface PropagationSolution {
  surfaceDistanceM: number;
  spreadingDistanceM: number;
  excessLossDb: number;
  available: boolean;
  paths: PropagationPath[];
  calculations: CalculationNode[];
  warnings: string[];
  explanationKeys: string[];
}
const point = (p: GeoPosition) => ({ lat: p.latitudeDeg, lon: p.longitudeDeg, altitudeM: p.altitudeM });
const node = (id: string, label: string, value: number, unit: string, equation?: string): CalculationNode => ({ id, label, value, unit, equation });
export function knifeEdgeLossDb(v: number): number {
  if (!Number.isFinite(v)) throw new RangeError("Diffraction parameter must be finite");
  return v <= -0.78 ? 0 : 6.9 + (20/Math.LN10)*Math.asinh(v-0.1);
}

export interface PropagationOverrides { disableEarthCurvature?: boolean; removeIonosphere?: boolean; speedOfLightMultiplier?: number }

export function solvePropagation(scenario: Scenario, overrides: PropagationOverrides = {}): PropagationSolution {
  const { transmitter: tx, receiver: rx, environment: env } = scenario;
  const a = { ...tx.position, altitudeM: tx.position.altitudeM + tx.antenna.heightM };
  const b = { ...rx.position, altitudeM: rx.position.altitudeM + rx.antenna.heightM };
  const distance = greatCircleDistanceM(a, b);
  const result: PropagationSolution = {
    surfaceDistanceM: distance, spreadingDistanceM: chordDistanceM(a, b), excessLossDb: 0, available: true,
    paths: [{ type: "direct", points: [point(a), point(b)] }],
    calculations: [node("surface-distance", "Great-circle surface distance", distance, "m", "R × central angle")],
    warnings: [], explanationKeys: [],
  };
  if (env.model === "free-space") {
    result.warnings.push("Free-space reference ignores Earth and terrain blockage; a chord through Earth is not a realizable terrestrial link.");
    result.explanationKeys.push("free-space-reference");
    return result;
  }
  if (env.model === "vhf-terrain") {
    const effectiveR = overrides.disableEarthCurvature ? Infinity : EARTH_RADIUS_M*env.effectiveEarthRadiusFactor;
    const sampleRay = (start: GeoPosition, end: GeoPosition) => {
      const span = greatCircleDistanceM(start,end);
      return Array.from({ length: 33 }, (_, i) => {
        const fraction = i/32;
        const p = interpolateGreatCircle(start,end,fraction);
        p.altitudeM -= span*span*fraction*(1-fraction)/(2*effectiveR);
        return point(p);
      });
    };
    result.paths = [{ type: "direct", points: sampleRay(a,b) }];
    const horizon = overrides.disableEarthCurvature ? Infinity : Math.sqrt(2*effectiveR*Math.max(0, a.altitudeM))+Math.sqrt(2*effectiveR*Math.max(0, b.altitudeM));
    result.spreadingDistanceM = Math.hypot(distance, b.altitudeM-a.altitudeM);
    if (!overrides.disableEarthCurvature) result.calculations.push(node("radio-horizon", "Effective-Earth radio horizon", horizon, "m", "sqrt(2kRhTX) + sqrt(2kRhRX)"));
    result.warnings.push("Educational effective-Earth and single knife-edge approximation; excludes terrain profiles, reflections, foliage and weather.");
    if (distance > horizon) {
      result.available = false;
      result.paths = [];
      result.warnings.push("Beyond the modeled radio horizon. Smooth-Earth diffraction and troposcatter are not modeled.");
      result.explanationKeys.push("beyond-radio-horizon");
    }
    if (env.obstruction && distance > 0) {
      const { fraction, altitudeM } = env.obstruction;
      const d1 = distance*fraction, d2 = distance-d1;
      const bulge = d1*d2/(2*effectiveR);
      const h = altitudeM+bulge-(a.altitudeM+(b.altitudeM-a.altitudeM)*fraction);
      if (Math.abs(h)/Math.min(d1,d2) > 0.2) result.warnings.push("Obstruction geometry exceeds the small-angle knife-edge approximation; diffraction loss has reduced reliability.");
      const wavelength = 299_792_458*(overrides.speedOfLightMultiplier ?? 1)/scenario.frequencyHz;
      const fresnel = Math.sqrt(wavelength*d1*d2/distance);
      const v = h*Math.sqrt(2)/fresnel;
      result.excessLossDb = knifeEdgeLossDb(v);
      result.calculations.push(node("earth-bulge", "Earth bulge at obstruction", bulge, "m", "d1 d2 / (2kR)"),
        node("obstruction-height", "Obstruction above effective LOS", h, "m"),
        node("fresnel-radius", "First Fresnel radius at obstruction", fresnel, "m", "sqrt(λ d1 d2 / (d1+d2))"),
        node("knife-edge-v", "Knife-edge diffraction parameter", v, "1", "h sqrt(2(d1+d2)/(λ d1 d2))"),
        node("diffraction-loss", "Single knife-edge loss", result.excessLossDb, "dB", "J(v)=6.9+20log10(sqrt((v−0.1)²+1)+v−0.1), v>−0.78; otherwise 0"));
      if (result.excessLossDb > 0) {
        const obstacle = { ...interpolateGreatCircle(a,b,fraction), altitudeM };
        if (result.available && h > 0) result.paths = [{ type: "diffracted", points: [...sampleRay(a,obstacle), ...sampleRay(obstacle,b).slice(1)] }];
        result.explanationKeys.push("terrain-obstruction");
        if (h <= 0) result.explanationKeys.push("fresnel-obstruction");
      }
    }
    if (result.available && result.excessLossDb === 0) result.explanationKeys.push("line-of-sight");
    return result;
  }
  if (overrides.removeIonosphere) {
    result.available = false;
    result.paths = [];
    result.warnings.push("The fantasy universe has no ionosphere. No HF skywave route is available; direct terrestrial HF is not modeled here.");
    result.explanationKeys.push("fantasy-no-ionosphere");
    return result;
  }
  const shell = EARTH_RADIUS_M+env.effectiveHeightM;
  const maxHopDistance = 2*EARTH_RADIUS_M*Math.acos(EARTH_RADIUS_M/shell);
  const hops = Math.max(1, Math.ceil(distance/maxHopDistance));
  const halfAngle = distance/(2*hops*EARTH_RADIUS_M);
  const leg = Math.sqrt((shell-EARTH_RADIUS_M)**2+4*shell*EARTH_RADIUS_M*Math.sin(halfAngle/2)**2);
  const cosIncidence = (shell-EARTH_RADIUS_M*Math.cos(halfAngle))/leg;
  const midpoint = interpolateGreatCircle(a,b,0.5);
  const utc = new Date(scenario.time.utcIso);
  const localHour = ((utc.getUTCHours()+utc.getUTCMinutes()/60+utc.getUTCSeconds()/3600+midpoint.longitudeDeg/15)%24+24)%24;
  const daylight = Math.max(0, Math.cos((localHour-12)*Math.PI/12));
  const critical = env.criticalFrequencyMHzNight+(env.criticalFrequencyMHzDay-env.criticalFrequencyMHzNight)*daylight;
  const muf = critical/cosIncidence;
  const absorption = (env.absorptionDbAt10MHzNight+(env.absorptionDbAt10MHzDay-env.absorptionDbAt10MHzNight)*daylight)*(10/(scenario.frequencyHz/1e6))**2*hops;
  const groundLoss = (hops-1)*env.groundReflectionLossDb;
  const vertices: GeoPosition[] = [a];
  for (let i=0;i<hops;i++) {
    vertices.push({ ...interpolateGreatCircle(a,b,(i+0.5)/hops), altitudeM: env.effectiveHeightM });
    vertices.push(i===hops-1 ? b : { ...interpolateGreatCircle(a,b,(i+1)/hops), altitudeM: 0 });
  }
  result.spreadingDistanceM = vertices.slice(1).reduce((sum,p,i)=>sum+chordDistanceM(vertices[i],p),0);
  result.excessLossDb = absorption+groundLoss;
  result.available = hops <= env.maxHops && scenario.frequencyHz/1e6 <= muf;
  result.paths = [{ type: "skywave", points: vertices.map(point) }];
  result.warnings.push("Low-confidence educational HF shell model, not an operational propagation forecast. MUF and maximum hop span use sea-level endpoints and equal hop spacing; ray lengths include endpoint heights. Secant-law reflection, cosine local daylight and inverse-square absorption are simplified; no ionosonde data, season, solar cycle, fading or magnetoionic effects.");
  if (scenario.frequencyHz/1e6 > muf) {
    result.explanationKeys.push("hf-above-muf");
    const start = toCartesian(a), shellPoint = toCartesian(vertices[1]);
    const escaped = shellPoint.map((v, i) => 2*v-start[i]);
    const escapePoint = { latitudeDeg: Math.atan2(escaped[2], Math.hypot(escaped[0], escaped[1]))*180/Math.PI,
      longitudeDeg: Math.atan2(escaped[1], escaped[0])*180/Math.PI, altitudeM: Math.hypot(...escaped)-EARTH_RADIUS_M };
    result.paths = [{ type: "skywave", points: [point(a), point(vertices[1]), point(escapePoint)] }];
    result.warnings.push("Frequency exceeds modeled MUF. The ray escapes; numeric loss is a diagnostic for the unavailable candidate route.");
  } else if (hops > env.maxHops) {
    result.explanationKeys.push("hf-hop-limit");
    result.paths = [];
    result.warnings.push("Required hop count exceeds maxHops; no supported route is rendered.");
  } else result.explanationKeys.push("hf-skywave");
  if (absorption > 10) result.explanationKeys.push("hf-absorption");
  result.calculations.push(node("earth-radius", "Spherical Earth radius", EARTH_RADIUS_M, "m"),
    node("hf-effective-height", "Effective ionosphere shell height", env.effectiveHeightM, "m"),
    node("hf-critical-day", "Configured daytime critical frequency", env.criticalFrequencyMHzDay, "MHz"),
    node("hf-critical-night", "Configured nighttime critical frequency", env.criticalFrequencyMHzNight, "MHz"),
    node("hf-absorption-day", "Configured daytime absorption at 10 MHz per hop", env.absorptionDbAt10MHzDay, "dB"),
    node("hf-absorption-night", "Configured nighttime absorption at 10 MHz per hop", env.absorptionDbAt10MHzNight, "dB"),
    node("hf-hops", "Required skywave hops", hops, "hops", "ceil(surface distance / maximum hop span)"),
    node("hf-max-hop-distance", "Maximum shell hop span", maxHopDistance, "m", "2R acos(R/(R+H))"),
    node("hf-local-hour", "Midpoint local solar hour", localHour, "h", "UTC hour + midpoint longitude / 15"),
    node("hf-critical-frequency", "Modeled critical frequency", critical, "MHz"),
    node("hf-muf", "Modeled maximum usable frequency", muf, "MHz", "foF2 / cos(shell incidence)"),
    node("hf-absorption", "Modeled absorption", absorption, "dB", "A10 × (10/fMHz)² × hops"),
    node("hf-ground-loss", "Ground reflection loss", groundLoss, "dB", "(hops−1) × reflection loss"),
    node("hf-ray-length", "Total candidate ray length", result.spreadingDistanceM, "m", "sum of spherical-shell chord legs"));
  return result;
}
