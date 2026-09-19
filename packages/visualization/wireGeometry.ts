export interface WirePoint {
  id: string;
  x: number;
  y: number;
  z: number;
}
export interface WireSegment {
  id: string;
  from: string;
  to: string;
}
export interface WireGeometry {
  points: WirePoint[];
  segments: WireSegment[];
  feedpoint: string;
  diameterMm: number;
  heightM: number;
  orientationDeg: number;
}
export interface WireGeometryFile extends WireGeometry {
  format: "bigsignal-wire";
  schemaVersion: 1;
  frequencyHz: number;
  model: "geometry-only-no-nec-solve";
}
export const INITIAL_WIRE: WireGeometry = {
  points: [
    { id: "P1", x: -2.5, y: 0, z: 0 },
    { id: "P2", x: 0, y: 0, z: 0 },
    { id: "P3", x: 2.5, y: 0, z: 0 },
  ],
  segments: [
    { id: "W1", from: "P1", to: "P2" },
    { id: "W2", from: "P2", to: "P3" },
  ],
  feedpoint: "W1",
  diameterMm: 2,
  heightM: 3,
  orientationDeg: 0,
};
function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${name} must be an object.`);
  return value as Record<string, unknown>;
}
function number(
  value: unknown,
  name: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`${name} must be between ${min} and ${max}.`);
  return value;
}
function id(value: unknown, name: string): string {
  if (typeof value !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(value))
    throw new Error(
      `${name} must start with a letter and contain at most 64 letters, digits, hyphens, or underscores.`,
    );
  return value;
}
function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  name: string,
) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error(`${name} contains an unsupported field.`);
}
export function parseWireGeometry(input: unknown): WireGeometry {
  const value = object(input, "Wire geometry");
  if (
    !Array.isArray(value.points) ||
    value.points.length < 2 ||
    value.points.length > 24
  )
    throw new Error("A wire geometry needs 2 to 24 points.");
  if (!Array.isArray(value.segments) || value.segments.length > 48)
    throw new Error("A wire geometry supports at most 48 segments.");
  const points = value.points.map((raw) => {
    const point = object(raw, "Point");
    exactKeys(point, ["id", "x", "y", "z"], "Point");
    return {
      id: id(point.id, "Point ID"),
      x: number(point.x, "Point X", -1000, 1000),
      y: number(point.y, "Point Y", -1000, 1000),
      z: number(point.z, "Point Z", -1000, 1000),
    };
  });
  const pointIds = new Set(points.map((point) => point.id));
  if (pointIds.size !== points.length)
    throw new Error("Point IDs must be unique.");
  const pairs = new Set<string>();
  const segments = value.segments.map((raw) => {
    const segment = object(raw, "Segment");
    exactKeys(segment, ["id", "from", "to"], "Segment");
    const parsed = {
      id: id(segment.id, "Segment ID"),
      from: id(segment.from, "Segment start"),
      to: id(segment.to, "Segment end"),
    };
    if (!pointIds.has(parsed.from) || !pointIds.has(parsed.to))
      throw new Error("Every wire segment must reference existing points.");
    if (parsed.from === parsed.to)
      throw new Error("A wire segment must join two different points.");
    const pair = JSON.stringify([parsed.from, parsed.to].sort());
    if (pairs.has(pair))
      throw new Error("The same two points cannot be connected twice.");
    pairs.add(pair);
    return parsed;
  });
  const segmentIds = new Set(segments.map((segment) => segment.id));
  if (segmentIds.size !== segments.length)
    throw new Error("Segment IDs must be unique.");
  const feedpoint = segments.length
    ? id(value.feedpoint, "Feedpoint segment")
    : value.feedpoint;
  if (segments.length ? !segmentIds.has(feedpoint as string) : feedpoint !== "")
    throw new Error("Feedpoint must reference an existing wire segment.");
  return {
    points,
    segments,
    feedpoint: feedpoint as string,
    diameterMm: number(value.diameterMm, "Conductor diameter in mm", 0.1, 100),
    heightM: number(value.heightM, "Base height in m", 0, 1000),
    orientationDeg: number(
      value.orientationDeg,
      "Orientation in degrees",
      -180,
      180,
    ),
  };
}
export function parseWireGeometryFile(input: unknown): WireGeometryFile {
  const value = object(input, "Wire file");
  exactKeys(
    value,
    [
      "format",
      "schemaVersion",
      "frequencyHz",
      "model",
      "points",
      "segments",
      "feedpoint",
      "diameterMm",
      "heightM",
      "orientationDeg",
    ],
    "Wire file",
  );
  if (
    value.format !== "bigsignal-wire" ||
    value.schemaVersion !== 1 ||
    value.model !== "geometry-only-no-nec-solve"
  )
    throw new Error("Choose a version 1 .bigsignal-wire.json geometry file.");
  const geometry = parseWireGeometry(value);
  if (!geometry.segments.length)
    throw new Error(
      "Add at least one wire segment and a feedpoint before exporting a wire file.",
    );
  return {
    format: "bigsignal-wire",
    schemaVersion: 1,
    model: "geometry-only-no-nec-solve",
    frequencyHz: number(
      value.frequencyHz,
      "Reference frequency in Hz",
      1e5,
      1e11,
    ),
    ...geometry,
  };
}
export function decodeWireGeometryFile(json: string): WireGeometryFile {
  if (json.length > 1_000_000)
    throw new Error("Wire files must be smaller than 1 MB.");
  return parseWireGeometryFile(JSON.parse(json));
}
