import { z } from "zod";
import type { AntennaConfig } from "../contracts";
import { parseTutorContext, type TutorContext } from "./context";

export const tutorActionSchema = z
  .object({
    target: z.enum([
      "transmitter",
      "receiver",
      "scenario",
      "network-node",
      "network-link",
      "network",
    ]),
    targetId: z.string().min(1).max(200).nullable(),
    field: z.enum([
      "powerDbm",
      "frequencyHz",
      "modeId",
      "antennaType",
      "antennaHeightM",
      "antennaGainDbi",
      "polarization",
      "feedlineLengthM",
      "feedlineLossDb",
      "bandwidthHz",
      "noiseFigureDb",
      "latitudeDeg",
      "longitudeDeg",
      "altitudeM",
      "temperatureK",
      "externalNoiseDb",
      "requirement",
      "targetRuntimeHours",
      "requiredMarginDb",
    ]),
    value: z.union([z.number().finite(), z.string().min(1).max(100)]),
  })
  .strict();
export type TutorAction = z.infer<typeof tutorActionSchema>;
export const tutorActionJsonSchema = z.toJSONSchema(tutorActionSchema);
export const tutorActionDescription =
  "Change one control in the learner's actual workspace, then recompute the authoritative simulation. Use targetId null for transmitter, receiver, scenario or network; use an existing node/link ID for network-node/network-link. Numeric units: powerDbm dBm, frequencyHz/bandwidthHz Hz, heights/lengths/altitude meters, gains/losses/noise/margin dB, temperatureK kelvin. antennaType selects rubber-duck (-2 dBi), vertical/dipole (2.15), yagi (9), dish (24), custom (-3); polarization stays unchanged. Antenna fields and feedline/position fields apply to transmitter/receiver/network-node; powerDbm only transmitter/node; bandwidthHz/noiseFigureDb receiver/node. frequencyHz/modeId apply to scenario/network-link. temperatureK/externalNoiseDb apply to scenario/network-link environment. requirement (status/text/voice/image/video), targetRuntimeHours and requiredMarginDb apply to network. Change one variable to demonstrate explanations; never claim a change succeeded if the tool returns an error.";

const antennaGains: Record<AntennaConfig["type"], number> = {
  "rubber-duck": -2,
  vertical: 2.15,
  dipole: 2.15,
  yagi: 9,
  dish: 24,
  custom: -3,
};
const endpointPaths: Partial<Record<TutorAction["field"], string[]>> = {
  antennaHeightM: ["antenna", "heightM"],
  antennaGainDbi: ["antenna", "gainDbi"],
  polarization: ["antenna", "polarization"],
  feedlineLengthM: ["feedline", "lengthM"],
  feedlineLossDb: ["feedline", "lossDb"],
  latitudeDeg: ["position", "latitudeDeg"],
  longitudeDeg: ["position", "longitudeDeg"],
  altitudeM: ["position", "altitudeM"],
};

export function applyTutorAction(
  context: TutorContext,
  input: unknown,
): TutorContext {
  const action = tutorActionSchema.parse(input);
  const next = structuredClone(context);
  const { target, field, value, targetId } = action;
  const indexed = target === "network-node" || target === "network-link";
  if (indexed !== (targetId !== null))
    throw new Error(
      "Provide a targetId only for an existing network node or link.",
    );
  let subject: object;
  if (
    target === "transmitter" ||
    target === "receiver" ||
    target === "scenario"
  ) {
    if (!next.scenario || next.mode === "disaster")
      throw new Error("No active single-link workspace is available.");
    subject = target === "scenario" ? next.scenario : next.scenario[target];
  } else {
    if (!next.network || next.mode !== "disaster")
      throw new Error("No active disaster network is available.");
    const found =
      target === "network"
        ? next.network
        : target === "network-node"
          ? next.network.nodes.find((node) => node.id === targetId)
          : next.network.links.find((link) => link.id === targetId);
    if (!found) throw new Error("Unknown network target ID.");
    subject = found;
  }
  const endpoint =
    target === "transmitter" ||
    target === "receiver" ||
    target === "network-node";
  const link = target === "scenario" || target === "network-link";
  const record = subject as Record<string, unknown>;
  let path: string[] | undefined;
  if (endpoint) {
    if (field === "antennaType") {
      if (typeof value !== "string" || !Object.hasOwn(antennaGains, value))
        throw new Error("Unknown antenna preset.");
      const antenna = record.antenna as AntennaConfig;
      antenna.type = value as AntennaConfig["type"];
      antenna.id = `tutor-${value}`;
      antenna.gainDbi = antennaGains[antenna.type];
      return parseTutorContext(next);
    }
    path = endpointPaths[field];
    if (field === "powerDbm" && target !== "receiver") path = [field];
    if (
      (field === "bandwidthHz" || field === "noiseFigureDb") &&
      target !== "transmitter"
    )
      path = [field];
  }
  if (link && (field === "frequencyHz" || field === "modeId")) path = [field];
  if (link && (field === "temperatureK" || field === "externalNoiseDb"))
    path = ["environment", field];
  if (
    target === "network" &&
    ["requirement", "targetRuntimeHours", "requiredMarginDb"].includes(field)
  )
    path = [field];
  if (!path) throw new Error(`Field ${field} cannot be changed on ${target}.`);
  const stringField =
    field === "polarization" || field === "modeId" || field === "requirement";
  if (typeof value !== (stringField ? "string" : "number"))
    throw new Error(`Invalid value type for ${field}.`);
  if (path.length === 1) record[path[0]] = value;
  else (record[path[0]] as Record<string, unknown>)[path[1]] = value;
  return parseTutorContext(next);
}
