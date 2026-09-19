import { describe, expect, it } from "vitest";
import { getLessonScenario } from "../../content/lessons";
import { createDisasterNetwork, simulateLaboratory } from "../simulation/src";
import { applyTutorAction, tutorActionJsonSchema } from "./actions";
import type { TutorContext } from "./context";

const lab = (): TutorContext => ({
  mode: "lab",
  scenario: getLessonScenario("what-is-radio"),
});
const network = (): TutorContext => ({
  mode: "disaster",
  network: createDisasterNetwork("internet-gone"),
});
const action = (
  target: string,
  field: string,
  value: number | string,
  targetId: string | null = null,
) => ({ target, field, value, targetId });

describe("tutor workspace actions", () => {
  it("changes power and engine result without mutating the original", () => {
    const before = lab();
    const original = structuredClone(before);
    const after = applyTutorAction(
      before,
      action(
        "transmitter",
        "powerDbm",
        before.scenario!.transmitter.powerDbm + 3,
      ),
    );
    expect(before).toEqual(original);
    expect(
      simulateLaboratory(after.scenario!).linkMarginDb -
        simulateLaboratory(before.scenario!).linkMarginDb,
    ).toBeCloseTo(3);
  });
  it("swaps an antenna and its modeled gain while preserving height and polarization", () => {
    const before = lab();
    const after = applyTutorAction(
      before,
      action("receiver", "antennaType", "yagi"),
    );
    expect(after.scenario!.receiver.antenna).toMatchObject({
      type: "yagi",
      gainDbi: 9,
      heightM: before.scenario!.receiver.antenna.heightM,
      polarization: before.scenario!.receiver.antenna.polarization,
    });
  });
  it("changes feedline losses and receiver bandwidth", () => {
    const after = applyTutorAction(
      applyTutorAction(lab(), action("transmitter", "feedlineLossDb", 4)),
      action("receiver", "bandwidthHz", 25000),
    );
    expect(after.scenario!.transmitter.feedline.lossDb).toBe(4);
    expect(after.scenario!.receiver.bandwidthHz).toBe(25000);
  });
  it.each([
    action("transmitter", "powerDbm", 1e10),
    action("transmitter", "powerDbm", "40"),
    action("transmitter", "bandwidthHz", 1000),
    action("receiver", "powerDbm", 40),
    action("receiver", "antennaType", "magic"),
    action("scenario", "modeId", "magic"),
    action("scenario", "frequencyHz", -1),
    action("receiver", "polarization", "magic"),
    action("transmitter", "powerDbm", Infinity),
    action("transmitter", "powerDbm", 40, "base"),
    action("transmitter", "__proto__", "oops"),
  ])("rejects invalid changes atomically: %j", (invalid) => {
    const before = lab();
    const copy = structuredClone(before);
    expect(() => applyTutorAction(before, invalid)).toThrow();
    expect(before).toEqual(copy);
  });
  it("rejects extra keys and missing IDs", () => {
    expect(() =>
      applyTutorAction(lab(), {
        ...action("transmitter", "powerDbm", 40),
        scenario: {},
      }),
    ).toThrow();
    expect(() =>
      applyTutorAction(network(), action("network-node", "powerDbm", 40)),
    ).toThrow();
  });
  it("changes only the specified network node", () => {
    const before = network();
    const after = applyTutorAction(
      before,
      action("network-node", "antennaHeightM", 20, "shelter"),
    );
    expect(
      after.network!.nodes.find((n) => n.id === "shelter")!.antenna.heightM,
    ).toBe(20);
    expect(after.network!.nodes.find((n) => n.id === "base")).toEqual(
      before.network!.nodes.find((n) => n.id === "base"),
    );
    expect(
      before.network!.nodes.find((n) => n.id === "shelter")!.antenna.heightM,
    ).not.toBe(20);
  });
  it("changes a network link and communication requirement", () => {
    const before = network();
    const after = applyTutorAction(
      applyTutorAction(
        before,
        action(
          "network-link",
          "frequencyHz",
          146e6,
          before.network!.links[0].id,
        ),
      ),
      action("network", "requirement", "text"),
    );
    expect(after.network!.links[0].frequencyHz).toBe(146e6);
    expect(after.network!.requirement).toBe("text");
  });
  it("rejects unknown nodes and out-of-range network values", () => {
    expect(() =>
      applyTutorAction(
        network(),
        action("network-node", "powerDbm", 40, "missing"),
      ),
    ).toThrow();
    expect(() =>
      applyTutorAction(network(), action("network", "targetRuntimeHours", -1)),
    ).toThrow();
    expect(() =>
      applyTutorAction(
        network(),
        action("network-node", "powerDbm", 1e10, "base"),
      ),
    ).toThrow();
  });
  it("rejects edits to an inactive hidden experiment", () => {
    const both = { ...lab(), ...network() };
    expect(() =>
      applyTutorAction(both, action("transmitter", "powerDbm", 40)),
    ).toThrow();
    expect(() =>
      applyTutorAction(
        { ...both, mode: "lab" },
        action("network-node", "powerDbm", 40, "base"),
      ),
    ).toThrow();
  });
  it("provides a strict tool schema with all fields required", () => {
    expect(tutorActionJsonSchema.additionalProperties).toBe(false);
    expect(tutorActionJsonSchema.required).toEqual([
      "target",
      "targetId",
      "field",
      "value",
    ]);
  });
});
