import { describe, expect, it } from "vitest";
import {
  assessHospitalContact,
  createHospitalScenario,
  createHospitalOperatorScenario,
  hospitalReplyScenario,
} from "./tsunami";
import { simulateScenario } from "../simulation/src";
import { switchScenarioBand } from "../../apps/web/src/productDomain";

describe("hospital radio experiments", () => {
  it("uses the real engine for a regional voice message and reply", () => {
    const s = createHospitalScenario();
    expect(s.environment.externalNoiseDb).toBeCloseTo(29.33, 2);
    const result = simulateScenario(s);
    const contact = assessHospitalContact(s, result);
    expect(contact.outward).toEqual(result);
    expect(contact.reply).toEqual(simulateScenario(hospitalReplyScenario(s)));
    expect(contact.voiceReady).toBe(true);
  });
  it("cannot solve the Medan VHF horizon with more watts", () => {
    const s = switchScenarioBand(
      createHospitalScenario("meulaboh-medan"),
      "VHF",
    );
    expect(assessHospitalContact(s, simulateScenario(s)).voiceReady).toBe(
      false,
    );
    s.transmitter.powerDbm = 80;
    expect(assessHospitalContact(s, simulateScenario(s)).voiceReady).toBe(
      false,
    );
  });
  it("supports the regional HF experiment while above-MUF fails", () => {
    const s = switchScenarioBand(
      createHospitalScenario("meulaboh-medan"),
      "HF",
    );
    s.frequencyHz = 7.055e6;
    expect(assessHospitalContact(s, simulateScenario(s)).voiceReady).toBe(true);
    s.frequencyHz = 30e6;
    expect(assessHospitalContact(s, simulateScenario(s)).voiceReady).toBe(
      false,
    );
  });
  it("keeps UHF experimental and preserves endpoints when changing bands", () => {
    const s = createHospitalScenario();
    s.receiver.position = {
      ...s.transmitter.position,
      latitudeDeg: s.transmitter.position.latitudeDeg + 0.01,
    };
    const uhf = switchScenarioBand(s, "UHF");
    expect(uhf.transmitter.position).toEqual(s.transmitter.position);
    expect(uhf.receiver.position).toEqual(s.receiver.position);
    expect(assessHospitalContact(uhf, simulateScenario(uhf)).voiceReady).toBe(
      true,
    );
  });
  it("adds 10 dB with ten times the power, like Bigger signal", () => {
    const s = createHospitalScenario();
    const before = simulateScenario(s);
    s.transmitter.powerDbm += 10;
    expect(
      simulateScenario(s).receivedPowerDbm - before.receivedPowerDbm,
    ).toBeCloseTo(10, 8);
  });
  it("does not pass a voice request on a data-only mode", () => {
    const s = createHospitalScenario();
    s.modeId = "ft8";
    expect(assessHospitalContact(s, simulateScenario(s)).voiceReady).toBe(
      false,
    );
  });
  it("reverses terrain positions for the reply and leaves the original intact", () => {
    const s = createHospitalScenario();
    s.environment = {
      model: "vhf-terrain",
      temperatureK: 290,
      effectiveEarthRadiusFactor: 4 / 3,
      obstruction: { fraction: 0.2, altitudeM: 40 },
    };
    const reversed = hospitalReplyScenario(s);
    expect(reversed.transmitter.position).toEqual(s.receiver.position);
    expect(reversed.receiver.position).toEqual(s.transmitter.position);
    expect(
      reversed.environment.model === "vhf-terrain" &&
        reversed.environment.obstruction?.fraction,
    ).toBe(0.8);
    expect(s.environment.obstruction?.fraction).toBe(0.2);
  });
});

describe("geographic hospital routes", () => {
  it("uses the documented pair rather than a fixed Meulaboh transmitter", () => {
    const s = createHospitalScenario("melati-adam-malik");
    expect(s.transmitter.position.latitudeDeg).toBeCloseTo(3.56613);
    expect(s.receiver.position.longitudeDeg).toBeCloseTo(98.60863);
    expect(s.title).toContain("patient transfer");
  });
  it("preserves the historical hospital endpoints through band changes", () => {
    const s = createHospitalScenario("cut-meutia-medan");
    for (const band of ["VHF", "UHF", "HF"] as const) {
      const next = switchScenarioBand(s, band);
      expect(next.transmitter.position).toEqual(s.transmitter.position);
      expect(next.receiver.position).toEqual(s.receiver.position);
    }
  });
  it("rejects an unknown documented route at the scenario boundary", () => {
    expect(() => createHospitalScenario("missing" as never)).toThrow(
      "Unknown hospital route",
    );
  });
});

describe("the operator demo's limited equipment", () => {
  it("keeps the dipole and voice setup fixed across its four allowed settings", () => {
    for (const channel of [7055000, 7060000] as const) {
      for (const power of [5, 50] as const) {
        const s = createHospitalOperatorScenario(channel, power);
        expect(s.transmitter.antenna.type).toBe("dipole");
        expect(s.transmitter.antenna.heightM).toBe(10);
        expect(s.modeId).toBe("ssb");
        expect(assessHospitalContact(s, simulateScenario(s)).voiceReady).toBe(
          true,
        );
      }
    }
  });
  it("changes received power by 10 dB without changing the antenna or endpoints", () => {
    const low = createHospitalOperatorScenario(7055000, 5);
    const high = createHospitalOperatorScenario(7055000, 50);
    expect(high.transmitter.antenna).toEqual(low.transmitter.antenna);
    expect(high.transmitter.position).toEqual(low.transmitter.position);
    expect(high.receiver).toEqual(low.receiver);
    expect(
      simulateScenario(high).receivedPowerDbm -
        simulateScenario(low).receivedPowerDbm,
    ).toBeCloseTo(10, 8);
  });
});
