import { describe, expect, it } from "vitest";
import {
  assessCommunicationRequirement,
  createDisasterNetwork,
  simulateNetwork,
  type DisasterPresetId,
} from "../packages/simulation/src";

const presets: DisasterPresetId[] = [
  "internet-gone",
  "cellular-overload",
  "power-outage",
  "hill-relay",
  "wide-area",
  "emergency-network",
];

describe("bidirectional disaster networks", () => {
  it("uses sourced band-noise defaults for authored networks", () => {
    const hf = createDisasterNetwork("wide-area");
    expect(hf.links[0].frequencyHz).toBe(7.1e6);
    expect(hf.links[0].environment.externalNoiseDb).toBeCloseTo(29.25, 2);

    const vhf = createDisasterNetwork("internet-gone");
    expect(vhf.links[0].frequencyHz).toBe(145e6);
    expect(vhf.links[0].environment.externalNoiseDb).toBe(6);
  });

  it.each(presets)(
    "simulates deterministic preset %s without mutating it",
    (id) => {
      const input = createDisasterNetwork(id),
        snapshot = structuredClone(input);
      const result = simulateNetwork(input);
      expect(result.links.length).toBe(input.links.length);
      expect(input).toEqual(snapshot);
      expect(result.totalAveragePowerW).toBeGreaterThan(0);
      expect(simulateNetwork(input)).toEqual(result);
      expect(result.links.every((link) => Number.isFinite(link.marginDb))).toBe(
        true,
      );
    },
  );
  it("a one-way link cannot count as two-way coverage", () => {
    const input = createDisasterNetwork("internet-gone");
    input.nodes[1].powerDbm = -150;
    const result = simulateNetwork(input);
    expect(result.links[0].forward.success).not.toBe("failed");
    expect(result.links[0].reverse.success).toBe("failed");
    expect(result.coverageFraction).toBe(0);
    expect(result.reachableNodeIds).toEqual(["base"]);
    expect(result.isolatedNodeIds).toHaveLength(2);
  });
  it("reverses obstruction fraction without changing the physical path", () => {
    const input = createDisasterNetwork("internet-gone");
    input.nodes[0].antenna.heightM = 3;
    input.nodes[1].antenna.heightM = 15;
    input.links[0].environment = {
      model: "vhf-terrain",
      temperatureK: 290,
      effectiveEarthRadiusFactor: 4 / 3,
      obstruction: { fraction: 0.1, altitudeM: 9 },
    };
    const link = simulateNetwork(input).links[0];
    expect(link.forward.receivedPowerDbm).toBeCloseTo(
      link.reverse.receivedPowerDbm,
      8,
    );
  });
  it("hill relay restores an otherwise unavailable direct path", () => {
    const input = createDisasterNetwork("hill-relay");
    const result = simulateNetwork(input);
    expect(result.links.find((link) => link.id === "base-field")!.usable).toBe(
      false,
    );
    expect(result.meetsCoverage).toBe(true);
    expect(result.bridgeLinkIds.sort()).toEqual([
      "base-shelter",
      "shelter-field",
    ]);
    expect(result.hasRedundantPaths).toBe(false);
    input.links = input.links.filter((link) => link.id !== "shelter-field");
    expect(simulateNetwork(input).meetsCoverage).toBe(false);
  });
  it("a triangle survives any one edge failure but a chain does not", () => {
    const input = createDisasterNetwork("cellular-overload");
    expect(simulateNetwork(input).hasRedundantPaths).toBe(true);
    input.links.pop();
    const result = simulateNetwork(input);
    expect(result.meetsCoverage).toBe(true);
    expect(result.hasRedundantPaths).toBe(false);
    expect(result.bridgeLinkIds).toHaveLength(2);
  });
  it("coverage obeys the selected communication requirement", () => {
    const input = createDisasterNetwork("internet-gone");
    input.requirement = "video";
    const result = simulateNetwork(input);
    expect(result.links[0].usable).toBe(true);
    expect(result.links[0].meetsRequirement).toBe(false);
    expect(result.meetsCoverage).toBe(false);
  });
  it("constrained FT8 exchanges are not treated as arbitrary text or voice", () => {
    expect(assessCommunicationRequirement("ft8", "status").supported).toBe(
      true,
    );
    expect(assessCommunicationRequirement("ft8", "text").supported).toBe(false);
    expect(assessCommunicationRequirement("ft8", "voice").supported).toBe(
      false,
    );
  });
  it("rejects duplicate station pairs as false redundancy", () => {
    const input = createDisasterNetwork("internet-gone");
    input.links.push({ ...input.links[0], id: "duplicate" });
    expect(() => simulateNetwork(input)).toThrow(/Duplicate/);
  });
  it("rejects nonexistent nodes and duplicate identifiers", () => {
    const input = createDisasterNetwork("internet-gone");
    input.links[0].to = "missing";
    expect(() => simulateNetwork(input)).toThrow(/existing nodes/);
    const duplicate = createDisasterNetwork("internet-gone");
    duplicate.nodes[1].id = "base";
    expect(() => simulateNetwork(duplicate)).toThrow(/unique/);
  });
  it("validates orphan node equipment, coordinates and labels at import", () => {
    const badPosition = createDisasterNetwork("internet-gone");
    badPosition.links = [];
    badPosition.nodes[1].position.latitudeDeg = 100;
    expect(() => simulateNetwork(badPosition)).toThrow();
    const badLabel = createDisasterNetwork("internet-gone");
    badLabel.links = [];
    badLabel.nodes[1].label = "";
    expect(() => simulateNetwork(badLabel)).toThrow();
    const badAntenna = createDisasterNetwork("internet-gone");
    badAntenna.links = [];
    badAntenna.nodes[1].antenna.heightM = -1;
    expect(() => simulateNetwork(badAntenna)).toThrow();
  });
  it("handles no links explicitly with zero coverage and zero redundancy", () => {
    const input = createDisasterNetwork("internet-gone");
    input.links = [];
    const result = simulateNetwork(input);
    expect(result.coverageFraction).toBe(0);
    expect(result.weakestLink).toBeNull();
    expect(result.hasRedundantPaths).toBe(false);
  });
  it.each(["all", "one", "idle-only"])(
    "does not pass endurance for a missing communication workload (%s)",
    (mode) => {
      const input = createDisasterNetwork("internet-gone");
      for (const node of mode === "one"
        ? input.nodes.slice(0, 1)
        : input.nodes) {
        Object.assign(node.battery, {
          capacityWh: mode === "idle-only" ? 100 : 0,
          transmitDutyCycle: 0,
          receiveDutyCycle: 0,
          idleW: mode === "idle-only" ? 1 : 0,
          receiveW: 0,
          transmitCircuitW: 0,
        });
      }
      const result = simulateNetwork(input);
      expect(result.meetsCoverage).toBe(true);
      expect(result.enduranceAssessed).toBe(false);
      expect(result.meetsEndurance).toBe(false);
    },
  );
  it("battery exhaustion is separate from geometric connectivity", () => {
    const input = createDisasterNetwork("internet-gone");
    input.nodes[0].battery.capacityWh = 0;
    const result = simulateNetwork(input);
    expect(result.meetsCoverage).toBe(true);
    expect(result.meetsEndurance).toBe(false);
    expect(result.minimumRuntimeHours).toBe(0);
  });
});
