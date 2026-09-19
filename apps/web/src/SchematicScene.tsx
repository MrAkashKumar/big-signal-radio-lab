import { useId } from "react";
import type {
  GeoPosition,
  PropagationPath,
  Scenario,
} from "../../../packages/contracts";
import { terrainProjection } from "./terrainProjection";
import "./schematic-scene.css";

type Point = [number, number];
export interface SchematicSceneProps {
  scenario: Scenario;
  paths: PropagationPath[];
  running: boolean;
  view?: "terrain" | "globe";
  fresnel?: { fraction: number; radiusM: number }[];
}
const line = (points: Point[]) =>
  points
    .map(
      ([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`,
    )
    .join(" ");
const positionLabel = (position: GeoPosition) =>
  `${Math.abs(position.latitudeDeg).toFixed(3)}° ${position.latitudeDeg < 0 ? "S" : "N"}, ${Math.abs(position.longitudeDeg).toFixed(3)}° ${position.longitudeDeg < 0 ? "W" : "E"}`;
const pathLabels: Record<PropagationPath["type"], string> = {
  direct: "Direct ray",
  diffracted: "Diffracted ray",
  skywave: "Skywave ray",
  groundwave: "Ground-wave ray",
};

export function SchematicScene({
  scenario,
  paths,
  running,
  view,
  fresnel,
}: SchematicSceneProps) {
  const id = useId().replaceAll(":", "");
  const globe =
    (view ??
      (scenario.environment.model === "hf-skywave" ? "globe" : "terrain")) ===
    "globe";
  const projection = terrainProjection(scenario);
  const obstruction =
    scenario.environment.model === "vhf-terrain"
      ? scenario.environment.obstruction
      : undefined;
  const x = (value: number) => 100 + (value + 4) * 75;
  const groundSamples = Array.from({ length: 65 }, (_, i) => {
    const sceneX = -4 + i / 8;
    return [sceneX, projection.ground(sceneX)] as Point;
  });
  const projected = paths
    .map((path) => ({
      type: path.type,
      points: path.points.flatMap((point) => {
        const value = projection.point(point);
        return value && value.every(Number.isFinite)
          ? [[value[0], value[1]] as Point]
          : [];
      }),
    }))
    .filter((path) => path.points.length >= 2);
  const terrainValues = [
    ...groundSamples.map((point) => point[1]),
    ...projection.stations.flatMap((station) => [station.ground, station.tip]),
    ...projected.flatMap((path) => path.points.map((point) => point[1])),
  ];
  const minHeight = Math.min(...terrainValues);
  const heightSpan = Math.max(3.4, Math.max(...terrainValues) - minHeight);
  const y = (value: number) => 304 - ((value - minHeight) / heightSpan) * 220;
  const surfaceRadius = 172;
  const globeCenter: Point = [400, 294];
  const altitudeRange = Math.max(
    1,
    scenario.environment.model === "hf-skywave"
      ? scenario.environment.effectiveHeightM
      : 100000,
    ...paths.flatMap((path) =>
      path.points.map((point) => point.altitudeM ?? 0),
    ),
  );
  const globePoint = (fraction: number, altitude: number): Point => {
    const angle = (fraction - 0.5) * 1.7;
    const radius = surfaceRadius + (altitude / altitudeRange) * 92;
    return [
      globeCenter[0] + Math.sin(angle) * radius,
      globeCenter[1] - Math.cos(angle) * radius,
    ];
  };
  const globePaths = paths
    .map((path) => ({
      type: path.type,
      points: path.points.flatMap((point) => {
        const value = projection.point(point);
        return value &&
          point.altitudeM !== undefined &&
          Number.isFinite(point.altitudeM)
          ? [globePoint((value[0] + 4) / 8, point.altitudeM)]
          : [];
      }),
    }))
    .filter((path) => path.points.length >= 2);
  const drawnPaths = globe
    ? globePaths
    : projected.map((path) => ({
        type: path.type,
        points: path.points.map(([px, py]) => [x(px), y(py)] as Point),
      }));
  const txTip = globe
    ? globePoint(
        0,
        scenario.transmitter.position.altitudeM +
          scenario.transmitter.antenna.heightM,
      )
    : ([x(projection.stations[0].x), y(projection.stations[0].tip)] as Point);
  const rxTip = globe
    ? globePoint(
        1,
        scenario.receiver.position.altitudeM +
          scenario.receiver.antenna.heightM,
      )
    : ([x(projection.stations[1].x), y(projection.stations[1].tip)] as Point);
  const stations = [scenario.transmitter, scenario.receiver];
  const description = `${globe ? "Earth cross-section with geographic station endpoints" : "Terrain profile with transmitter on the left and receiver on the right"}. ${drawnPaths.length ? `${drawnPaths.length} engine-supplied ${drawnPaths.map((path) => pathLabels[path.type].toLowerCase()).join(", ")}.` : "No engine path is currently available to draw."} Heights and horizontal spacing are exaggerated. The picture does not determine link success.`;
  const layerAltitude =
    scenario.environment.model === "hf-skywave"
      ? scenario.environment.effectiveHeightM
      : undefined;
  const layer =
    layerAltitude === undefined
      ? []
      : Array.from({ length: 49 }, (_, i) =>
          globePoint(-0.3 + i / 30, layerAltitude),
        );
  const horizontalFraction = (fraction: number) =>
    obstruction
      ? fraction <= obstruction.fraction
        ? -4 + (4 * fraction) / obstruction.fraction
        : (4 * (fraction - obstruction.fraction)) / (1 - obstruction.fraction)
      : -4 + 8 * fraction;
  return (
    <figure
      className={`schematic-scene ${running ? "schematic-running" : ""}`}
      aria-labelledby={`${id}-caption`}
    >
      <svg
        viewBox="0 0 800 370"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>
          {globe
            ? "Earth and ionosphere schematic"
            : "Radio path terrain schematic"}
        </title>
        <desc id={`${id}-description`}>{description}</desc>
        <defs>
          <linearGradient id={`${id}-land`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#293e2f" />
            <stop offset="1" stopColor="#122219" />
          </linearGradient>
          <linearGradient id={`${id}-earth`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#244c47" />
            <stop offset="1" stopColor="#132a2e" />
          </linearGradient>
          <pattern
            id={`${id}-grid`}
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M40 0H0V40"
              fill="none"
              stroke="#26372e"
              strokeWidth=".6"
            />
          </pattern>
          <clipPath id={`${id}-frame`}>
            <rect x="20" y="35" width="760" height="285" rx="12" />
          </clipPath>
        </defs>
        <rect
          x="20"
          y="35"
          width="760"
          height="285"
          rx="12"
          fill={`url(#${id}-grid)`}
        />
        <text x="34" y="24" className="schematic-kicker">
          {globe
            ? "GEOGRAPHIC PATH / EARTH CROSS-SECTION"
            : "TERRAIN PROFILE / HEIGHT EXAGGERATED"}
        </text>
        <text x="766" y="24" textAnchor="end" className="schematic-kicker">
          2D · NO GPU REQUIRED
        </text>
        <g clipPath={`url(#${id}-frame)`}>
          {globe ? (
            <>
              <circle
                cx={globeCenter[0]}
                cy={globeCenter[1]}
                r={surfaceRadius}
                fill={`url(#${id}-earth)`}
                stroke="#5a8275"
                strokeWidth="2"
              />
              <ellipse
                cx={globeCenter[0]}
                cy={globeCenter[1]}
                rx="93"
                ry={surfaceRadius}
                fill="none"
                stroke="#40695f"
                strokeDasharray="5 6"
              />
              <ellipse
                cx={globeCenter[0]}
                cy={globeCenter[1]}
                rx={surfaceRadius}
                ry="66"
                fill="none"
                stroke="#40695f"
                strokeDasharray="5 6"
              />
              <text
                x="400"
                y="270"
                textAnchor="middle"
                className="schematic-earth-label"
              >
                EARTH
              </text>
              {layer.length > 0 && (
                <>
                  <path
                    d={line(layer)}
                    fill="none"
                    stroke="#91bad7"
                    strokeWidth="2"
                    strokeDasharray="8 7"
                  />
                  <text
                    x="400"
                    y="63"
                    textAnchor="middle"
                    className="schematic-layer-label"
                  >
                    Effective ionosphere · {(layerAltitude! / 1000).toFixed(0)}{" "}
                    km
                  </text>
                </>
              )}
            </>
          ) : (
            <>
              <path
                d={`${line(groundSamples.map(([px, py]) => [x(px), y(py)]))} L700,322 L100,322 Z`}
                fill={`url(#${id}-land)`}
                stroke="#5d775b"
                strokeWidth="2"
              />
              {obstruction && (
                <>
                  <path
                    d={`M400 ${y(projection.ground(0)) + 10}V315`}
                    stroke="#75936e"
                    strokeDasharray="3 5"
                  />
                  <text
                    x="400"
                    y="339"
                    textAnchor="middle"
                    className="schematic-label"
                  >
                    Ridge · {obstruction.altitudeM.toFixed(1)} m AMSL
                  </text>
                </>
              )}
              {fresnel
                ?.filter((_, i) => i % 4 === 0)
                .map((sample) => {
                  const center =
                    projection.stations[0].tip +
                    sample.fraction *
                      (projection.stations[1].tip - projection.stations[0].tip);
                  const radius =
                    (projection.metresToScene(sample.radiusM) / heightSpan) *
                    220;
                  return (
                    <ellipse
                      key={sample.fraction}
                      cx={x(horizontalFraction(sample.fraction))}
                      cy={y(center)}
                      rx={Math.min(12, radius * 0.28)}
                      ry={radius}
                      fill="none"
                      stroke="#76bac5"
                      strokeOpacity=".5"
                      strokeWidth="1.2"
                    />
                  );
                })}
              {projection.stations.map((station, index) => (
                <g
                  key={index}
                  className={index ? "schematic-rx" : "schematic-tx"}
                >
                  <line
                    x1={x(station.x)}
                    y1={y(station.ground)}
                    x2={x(station.x)}
                    y2={y(station.tip)}
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    d={`M${x(station.x) - 13},${y(station.ground)}h26 M${x(station.x) - 9},${y(station.tip) + 7}l9,-7 9,7`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </g>
              ))}
            </>
          )}
          {drawnPaths.map((path, index) => (
            <g key={`${path.type}-${index}`}>
              <path
                d={line(path.points)}
                fill="none"
                stroke="#c9f479"
                strokeWidth="8"
                strokeOpacity=".09"
              />
              <path
                className="schematic-signal"
                d={line(path.points)}
                fill="none"
                stroke="#d1fa94"
                strokeWidth="2.6"
              />
              {path.points
                .slice(1, -1)
                .filter(
                  (_, i) =>
                    i % Math.max(1, Math.floor(path.points.length / 6)) === 0,
                )
                .map(([px, py], i) => (
                  <circle key={i} cx={px} cy={py} r="3" fill="#d1fa94" />
                ))}
            </g>
          ))}
          {[txTip, rxTip].map(([px, py], index) => (
            <g key={index} className={index ? "schematic-rx" : "schematic-tx"}>
              <circle
                cx={px}
                cy={py}
                r="11"
                fill="#13231c"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx={px} cy={py} r="4" fill="currentColor" />
              <text
                x={px + (globe ? (index ? 18 : -18) : 0)}
                y={py - (globe ? 1 : 20)}
                textAnchor={globe ? (index ? "start" : "end") : "middle"}
                className="schematic-station-label"
              >
                {index ? "RX" : "TX"}
              </text>
            </g>
          ))}
        </g>
        {!drawnPaths.length && (
          <g>
            <rect
              x="178"
              y={globe ? 76 : 62}
              width="444"
              height="38"
              rx="8"
              fill="#122018"
              stroke="#41523c"
            />
            <text
              x="400"
              y={globe ? 100 : 86}
              textAnchor="middle"
              className="schematic-empty"
            >
              No engine path to draw. SEND IT or inspect path availability.
            </text>
          </g>
        )}
        <text x="34" y="358" className="schematic-kicker">
          {drawnPaths.length
            ? `${drawnPaths.map((path) => pathLabels[path.type]).join(" · ")} / ENGINE GEOMETRY`
            : "STATION POSITIONS / NO ASSUMED CONNECTION"}
        </text>
      </svg>
      <div className="schematic-stations">
        {stations.map((station, index) => (
          <p key={index}>
            <b className={index ? "schematic-rx" : "schematic-tx"}>
              {index ? "RX" : "TX"}
            </b>
            <span>{positionLabel(station.position)}</span>
            <span>
              Antenna {station.antenna.heightM.toFixed(1)} m above local ground
            </span>
          </p>
        ))}
      </div>
      <figcaption id={`${id}-caption`}>
        <b>2D {globe ? "geographic" : "terrain"} schematic.</b> Engine-supplied
        rays; heights and spacing exaggerated.{" "}
        {globe
          ? "This is a path cross-section, not a geographic map."
          : fresnel?.length
            ? "Blue rings show the supplied first Fresnel zone."
            : "The profile shows the configured terrain, not surveyed elevations."}{" "}
        {drawnPaths.length
          ? "Check the result below for path availability and link margin."
          : "No connection is implied before an engine path is drawn."}
      </figcaption>
    </figure>
  );
}
