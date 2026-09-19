import { describe, expect, it } from "vitest";
import {
  INITIAL_WIRE,
  parseWireGeometry,
  parseWireGeometryFile,
  decodeWireGeometryFile,
  type WireGeometryFile,
} from "./wireGeometry";
const file = (): WireGeometryFile => ({
  format: "bigsignal-wire",
  schemaVersion: 1,
  model: "geometry-only-no-nec-solve",
  frequencyHz: 145e6,
  ...structuredClone(INITIAL_WIRE),
});
describe("portable wire geometry", () => {
  it("round trips geometry without introducing solved RF properties", () => {
    const input = file();
    input.points.push({ id: "balcony", x: 3, y: -1, z: 4 });
    input.segments.push({ id: "extra", from: "P3", to: "balcony" });
    input.feedpoint = "extra";
    expect(decodeWireGeometryFile(JSON.stringify(input))).toEqual(input);
  });
  it("returns independent data so imported edits cannot mutate their source", () => {
    const input = file();
    const parsed = parseWireGeometryFile(input);
    parsed.points[0].x = 10;
    expect(input.points[0].x).toBe(-2.5);
  });
  it.each([
    [
      "duplicate point IDs",
      (v: WireGeometryFile) => {
        v.points[1].id = v.points[0].id;
      },
    ],
    [
      "duplicate segment IDs",
      (v: WireGeometryFile) => {
        v.segments[1].id = v.segments[0].id;
      },
    ],
    [
      "missing point",
      (v: WireGeometryFile) => {
        v.segments[0].from = "missing";
      },
    ],
    [
      "self connection",
      (v: WireGeometryFile) => {
        v.segments[0].to = v.segments[0].from;
      },
    ],
    [
      "reverse duplicate connection",
      (v: WireGeometryFile) => {
        v.segments.push({ id: "W3", from: "P2", to: "P1" });
      },
    ],
    [
      "missing feedpoint",
      (v: WireGeometryFile) => {
        v.feedpoint = "missing";
      },
    ],
    [
      "nonfinite coordinate",
      (v: WireGeometryFile) => {
        v.points[0].x = Infinity;
      },
    ],
    [
      "oversized coordinate",
      (v: WireGeometryFile) => {
        v.points[0].z = 1001;
      },
    ],
    [
      "invalid point ID",
      (v: WireGeometryFile) => {
        v.points[0].id = "<script>";
      },
    ],
    [
      "orientation out of range",
      (v: WireGeometryFile) => {
        v.orientationDeg = 181;
      },
    ],
    [
      "negative height",
      (v: WireGeometryFile) => {
        v.heightM = -1;
      },
    ],
    [
      "oversized height",
      (v: WireGeometryFile) => {
        v.heightM = 1001;
      },
    ],
    [
      "zero diameter",
      (v: WireGeometryFile) => {
        v.diameterMm = 0;
      },
    ],
    [
      "oversized diameter",
      (v: WireGeometryFile) => {
        v.diameterMm = 101;
      },
    ],
    [
      "invalid frequency",
      (v: WireGeometryFile) => {
        v.frequencyHz = 0;
      },
    ],
    [
      "empty geometry",
      (v: WireGeometryFile) => {
        v.points = [];
      },
    ],
  ])("rejects %s before replacing the working geometry", (_, mutate) => {
    const original = file();
    const input = file();
    mutate(input);
    expect(() => parseWireGeometryFile(input)).toThrow();
    expect(original).toEqual(file());
  });
  it("rejects solved properties and other unsupported fields", () => {
    expect(() => parseWireGeometryFile({ ...file(), gainDbi: 40 })).toThrow(
      /unsupported field/,
    );
    expect(() =>
      parseWireGeometryFile({ ...file(), schemaVersion: 2 }),
    ).toThrow(/version 1/);
  });
  it("retains an unfinished local drawing but requires a feedpoint in exported files", () => {
    const input = { ...file(), segments: [], feedpoint: "" };
    expect(parseWireGeometry(input).segments).toEqual([]);
    expect(() => parseWireGeometryFile(input)).toThrow(/at least one/);
  });
  it("rejects oversized files before JSON parsing", () => {
    expect(() => decodeWireGeometryFile("x".repeat(1_000_001))).toThrow(/1 MB/);
  });
});
