import { wattsToDbm } from "../units/src";
import type { Scenario, SimulationResult } from "../contracts";
import { loadExampleScenario } from "../simulation/examples/scenarios";
import { simulateScenario } from "../simulation/src";
import { quietRuralNoiseFactorDb } from "../simulation/src/bandNoise";

import {
  hospitalNetworkLinks,
  hospitalNetworkNodes,
} from "../../content/explanations/hospital-network";

export type HospitalRoute =
  | "meulaboh-medan"
  | "meulaboh-banda"
  | "meulaboh-lhoknga"
  | "cut-meutia-medan"
  | "melati-adam-malik";
export const hospitalRoutes = hospitalNetworkLinks;

export function createHospitalScenario(
  route: HospitalRoute = "meulaboh-medan",
): Scenario {
  const link = hospitalRoutes.find((r) => r.id === route);
  if (!link) throw new RangeError("Unknown hospital route");
  const from = hospitalNetworkNodes.find((n) => n.id === link.from)!;
  const to = hospitalNetworkNodes.find((n) => n.id === link.to)!;
  const s = loadExampleScenario("hf-day");
  s.id = `tsunami-hospital-${route}`;
  s.title = link.label;
  s.difficulty = "beginner";
  s.frequencyHz = 7.055e6;
  s.environment.externalNoiseDb = quietRuralNoiseFactorDb(s.frequencyHz);
  s.transmitter.powerDbm = wattsToDbm(5);
  s.transmitter.position = {
    latitudeDeg: from.latitudeDeg,
    longitudeDeg: from.longitudeDeg,
    altitudeM: 0,
  };
  s.receiver.position = {
    latitudeDeg: to.latitudeDeg,
    longitudeDeg: to.longitudeDeg,
    altitudeM: 0,
  };
  s.time.utcIso = "2005-01-15T05:00:00.000Z";
  return s;
}

export type HospitalOperatorChannel = 7055000 | 7060000;
export type HospitalOperatorPower = 5 | 50;

export function createHospitalOperatorScenario(
  channel: HospitalOperatorChannel = 7055000,
  powerW: HospitalOperatorPower = 5,
): Scenario {
  const scenario = createHospitalScenario("meulaboh-medan");
  scenario.frequencyHz = channel;
  scenario.environment.externalNoiseDb = quietRuralNoiseFactorDb(channel);
  scenario.transmitter.powerDbm = wattsToDbm(powerW);
  return scenario;
}

export function hospitalReplyScenario(s: Scenario): Scenario {
  return {
    ...structuredClone(s),
    id: `${s.id}-reply`,
    transmitter: {
      position: { ...s.receiver.position },
      antenna: { ...s.receiver.antenna },
      feedline: { ...s.receiver.feedline },
      powerDbm: s.transmitter.powerDbm,
    },
    receiver: {
      ...structuredClone(s.receiver),
      position: { ...s.transmitter.position },
      antenna: { ...s.transmitter.antenna },
      feedline: { ...s.transmitter.feedline },
    },
    environment:
      s.environment.model === "vhf-terrain" && s.environment.obstruction
        ? {
            ...s.environment,
            obstruction: {
              ...s.environment.obstruction,
              fraction: 1 - s.environment.obstruction.fraction,
            },
          }
        : structuredClone(s.environment),
  };
}

export interface HospitalContact {
  outward: SimulationResult;
  reply: SimulationResult;
  voiceReady: boolean;
}
export function assessHospitalContact(
  s: Scenario,
  outward: SimulationResult,
): HospitalContact {
  const reply = simulateScenario(hospitalReplyScenario(s));
  return {
    outward,
    reply,
    voiceReady:
      (s.modeId === "fm-voice" || s.modeId === "ssb") &&
      [outward, reply].every(
        (r) => r.propagationAvailable && r.success !== "failed",
      ),
  };
}
