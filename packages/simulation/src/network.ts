import type {
  AntennaConfig,
  EnvironmentConfig,
  FeedlineConfig,
  GeoPosition,
  Scenario,
  SimulationResult,
} from "../../contracts";
import { simulateScenario, validateScenario } from "./index";
import {
  defaultExternalNoiseDbForBand,
  quietRuralNoiseFactorDb,
} from "./bandNoise";
import {
  DEFAULT_BATTERY,
  estimateBattery,
  type BatteryInput,
  type BatteryEstimate,
} from "./laboratory";

export type CommunicationRequirement =
  "status" | "text" | "voice" | "image" | "video";
export interface NetworkNode {
  id: string;
  label: string;
  position: GeoPosition;
  antenna: AntennaConfig;
  feedline: FeedlineConfig;
  powerDbm: number;
  bandwidthHz: number;
  noiseFigureDb: number;
  battery: Omit<BatteryInput, "rfPowerW">;
}
export interface NetworkLink {
  id: string;
  from: string;
  to: string;
  frequencyHz: number;
  modeId: string;
  environment: EnvironmentConfig;
}
export interface NetworkScenario {
  nodes: NetworkNode[];
  links: NetworkLink[];
  timeUtcIso: string;
  requiredMarginDb: number;
  requirement: CommunicationRequirement;
  rootNodeId: string;
  targetRuntimeHours: number;
}
export interface RequirementAssessment {
  supported: boolean;
  explanationKey: string;
  assumptions: string[];
}
export interface NetworkLinkResult {
  id: string;
  from: string;
  to: string;
  forward: SimulationResult;
  reverse: SimulationResult;
  marginDb: number;
  usable: boolean;
  meetsRequirement: boolean;
  requirement: RequirementAssessment;
}
export interface NetworkResult {
  links: NetworkLinkResult[];
  connectedComponents: string[][];
  reachableNodeIds: string[];
  isolatedNodeIds: string[];
  coverageFraction: number;
  bridgeLinkIds: string[];
  hasRedundantPaths: boolean;
  weakestLink: NetworkLinkResult | null;
  nodeEnergy: Record<string, BatteryEstimate>;
  totalAveragePowerW: number;
  minimumRuntimeHours: number | null;
  meetsCoverage: boolean;
  meetsEndurance: boolean;
  enduranceAssessed: boolean;
  assumptions: string[];
}
export type DisasterPresetId =
  | "internet-gone"
  | "cellular-overload"
  | "power-outage"
  | "hill-relay"
  | "wide-area"
  | "emergency-network";

export function assessCommunicationRequirement(
  modeId: string,
  requirement: CommunicationRequirement,
): RequirementAssessment {
  const supportedModes: Record<CommunicationRequirement, string[]> = {
    status: ["fm-voice", "ssb", "cw", "ft8"],
    text: ["cw"],
    voice: ["fm-voice", "ssb"],
    image: [],
    video: [],
  };
  if (!Object.hasOwn(supportedModes, requirement))
    throw new RangeError("Unknown communication requirement");
  const supported = supportedModes[requirement].includes(modeId);
  return {
    supported,
    explanationKey: supported
      ? `requirement-${requirement}-supported`
      : `requirement-${requirement}-unsupported`,
    assumptions: [
      "Requirement support describes the implemented mode, not the theoretical capacity of a frequency band.",
      "Status includes a brief spoken or Morse report. FT8 supports only its constrained contact/status exchange, not arbitrary emergency text.",
      "Text means low-rate operator Morse text. Image and video waveforms, arbitrary packet telemetry, codecs and throughput are not implemented.",
      "Shared-channel scheduling and relay airtime are not resolved. Duty cycles must account for the traffic being relayed.",
    ],
  };
}

export function simulateNetwork(input: NetworkScenario): NetworkResult {
  if (
    !input ||
    !Array.isArray(input.nodes) ||
    input.nodes.length < 2 ||
    input.nodes.length > 20
  )
    throw new RangeError("Network requires 2 to 20 nodes");
  if (!Array.isArray(input.links) || input.links.length > 190)
    throw new RangeError("Network supports at most 190 links");
  if (
    !Number.isFinite(input.requiredMarginDb) ||
    input.requiredMarginDb < 0 ||
    input.requiredMarginDb > 100
  )
    throw new RangeError("Required margin must be within 0 to 100 dB");
  if (
    !Number.isFinite(input.targetRuntimeHours) ||
    input.targetRuntimeHours < 0 ||
    input.targetRuntimeHours > 1e6
  )
    throw new RangeError("Target endurance must be within 0 to 1000000 hours");
  assessCommunicationRequirement("fm-voice", input.requirement);
  const nodes = new Map<string, NetworkNode>();
  for (const node of input.nodes) {
    if (
      !node ||
      typeof node.id !== "string" ||
      !node.id.trim() ||
      node.id.length > 100 ||
      nodes.has(node.id)
    )
      throw new RangeError("Node IDs must be unique nonempty strings");
    if (
      typeof node.label !== "string" ||
      !node.label.trim() ||
      node.label.length > 200
    )
      throw new RangeError(
        "Node labels must be nonempty strings of at most 200 characters",
      );
    const latitude =
      typeof node.position?.latitudeDeg === "number"
        ? node.position.latitudeDeg
        : 0;
    validateScenario({
      schemaVersion: 1,
      id: node.id,
      title: node.label,
      difficulty: "advanced",
      frequencyHz: 145e6,
      modeId: "fm-voice",
      transmitter: {
        position: node.position,
        antenna: node.antenna,
        feedline: node.feedline,
        powerDbm: node.powerDbm,
      },
      receiver: {
        position: {
          latitudeDeg: latitude > 0 ? -1 : 1,
          longitudeDeg: 0,
          altitudeM: 0,
        },
        antenna: node.antenna,
        feedline: node.feedline,
        bandwidthHz: node.bandwidthHz,
        noiseFigureDb: node.noiseFigureDb,
      },
      environment: { model: "free-space", temperatureK: 290 },
      time: { utcIso: input.timeUtcIso },
    });
    nodes.set(node.id, node);
  }
  if (!nodes.has(input.rootNodeId))
    throw new RangeError("Root node must be in network");
  const linkIds = new Set<string>();
  const pairIds = new Set<string>();
  const links = input.links.map((link) => {
    if (!link || typeof link !== "object")
      throw new RangeError("Every link must be an object");
    const from = nodes.get(link.from),
      to = nodes.get(link.to);
    if (!from || !to || from === to)
      throw new RangeError("Every link must join two distinct existing nodes");
    if (typeof link.id !== "string" || !link.id.trim() || linkIds.has(link.id))
      throw new RangeError("Link IDs must be unique and nonempty");
    const pairId = JSON.stringify([link.from, link.to].sort());
    if (pairIds.has(pairId))
      throw new RangeError(
        "Duplicate physical station pairs cannot be counted as independent redundant routes",
      );
    linkIds.add(link.id);
    pairIds.add(pairId);
    const scenario = (
      tx: NetworkNode,
      rx: NetworkNode,
      reverse: boolean,
    ): Scenario => {
      const environment = structuredClone(link.environment);
      if (
        reverse &&
        environment.model === "vhf-terrain" &&
        environment.obstruction
      )
        environment.obstruction.fraction = 1 - environment.obstruction.fraction;
      return {
        schemaVersion: 1,
        id: link.id,
        title: link.id,
        difficulty: "advanced",
        frequencyHz: link.frequencyHz,
        modeId: link.modeId,
        transmitter: {
          position: tx.position,
          antenna: tx.antenna,
          feedline: tx.feedline,
          powerDbm: tx.powerDbm,
        },
        receiver: {
          position: rx.position,
          antenna: rx.antenna,
          feedline: rx.feedline,
          bandwidthHz: rx.bandwidthHz,
          noiseFigureDb: rx.noiseFigureDb,
        },
        environment,
        time: { utcIso: input.timeUtcIso },
      };
    };
    const forward = simulateScenario(scenario(from, to, false));
    const reverse = simulateScenario(scenario(to, from, true));
    const marginDb = Math.min(forward.linkMarginDb, reverse.linkMarginDb);
    const usable =
      forward.success !== "failed" &&
      reverse.success !== "failed" &&
      marginDb >= input.requiredMarginDb;
    const requirement = assessCommunicationRequirement(
      link.modeId,
      input.requirement,
    );
    return {
      id: link.id,
      from: link.from,
      to: link.to,
      forward,
      reverse,
      marginDb,
      usable,
      meetsRequirement: usable && requirement.supported,
      requirement,
    };
  });
  const usableLinks = links.filter((link) => link.meetsRequirement);
  const components = (excludedLinkId?: string): string[][] => {
    const adjacency = new Map(
      input.nodes.map((node) => [node.id, [] as string[]]),
    );
    for (const link of usableLinks)
      if (link.id !== excludedLinkId) {
        adjacency.get(link.from)!.push(link.to);
        adjacency.get(link.to)!.push(link.from);
      }
    const unseen = new Set(nodes.keys());
    const groups: string[][] = [];
    while (unseen.size) {
      const first = unseen.values().next().value!;
      const group = [first];
      unseen.delete(first);
      for (let i = 0; i < group.length; i++)
        for (const next of adjacency.get(group[i])!)
          if (unseen.delete(next)) group.push(next);
      groups.push(group);
    }
    return groups;
  };
  const connectedComponents = components();
  const reachableNodeIds = connectedComponents.find((group) =>
    group.includes(input.rootNodeId),
  )!;
  const isolatedNodeIds = connectedComponents
    .filter((group) => group.length === 1)
    .flat();
  const bridgeLinkIds = usableLinks
    .filter((link) => components(link.id).length > connectedComponents.length)
    .map((link) => link.id);
  const nodeEnergy: Record<string, BatteryEstimate> = Object.create(null);
  for (const node of input.nodes) {
    if (
      !Number.isFinite(node.powerDbm) ||
      node.powerDbm < -200 ||
      node.powerDbm > 110
    )
      throw new RangeError("Node RF power must be within -200 to 110 dBm");
    nodeEnergy[node.id] = estimateBattery({
      ...node.battery,
      rfPowerW: 10 ** ((node.powerDbm - 30) / 10),
    });
  }
  const energies = Object.values(nodeEnergy);
  const runtimes = energies.flatMap((energy) =>
    energy.runtimeHours === null ? [] : [energy.runtimeHours],
  );
  const minimumRuntimeHours = runtimes.length ? Math.min(...runtimes) : null;
  const enduranceAssessed = input.nodes.every(
    (node) =>
      node.battery.transmitDutyCycle > 0 &&
      node.battery.receiveDutyCycle > 0 &&
      nodeEnergy[node.id].runtimeHours !== null,
  );
  const meetsCoverage = reachableNodeIds.length === input.nodes.length;
  return {
    links,
    connectedComponents,
    reachableNodeIds,
    isolatedNodeIds,
    coverageFraction: (reachableNodeIds.length - 1) / (input.nodes.length - 1),
    bridgeLinkIds,
    hasRedundantPaths: meetsCoverage && bridgeLinkIds.length === 0,
    weakestLink: links.length
      ? [...links].sort(
          (a, b) =>
            Number(a.meetsRequirement) - Number(b.meetsRequirement) ||
            a.marginDb - b.marginDb,
        )[0]
      : null,
    nodeEnergy,
    totalAveragePowerW: energies.reduce(
      (sum, energy) => sum + energy.averagePowerW,
      0,
    ),
    minimumRuntimeHours,
    meetsCoverage,
    enduranceAssessed,
    meetsEndurance:
      enduranceAssessed &&
      minimumRuntimeHours !== null &&
      minimumRuntimeHours >= input.targetRuntimeHours,
    assumptions: [
      "Each edge is simulated in both directions. A usable route must meet the margin target and carry the selected information in both directions.",
      "Coverage is the fraction of other nodes reachable from the coordination node through usable links. A relay means operator or compatible repeater forwarding, not a simulated protocol.",
      "Redundancy means every node remains reachable after any single usable edge fails. It does not prove resilience to a station failure or correlated terrain/weather failure.",
      "Margins are deterministic educational estimates, not measured reliability probabilities. Interference, contention, radio duplexing and throughput are not modeled.",
      "Endurance requires a positive transmit and receive workload at every station. Zero draw is unassessed, not unlimited communication. Energy uses the entered station duty cycles. Adding routes does not invent a traffic workload or automatically increase duty cycles.",
    ],
  };
}

export function createDisasterNetwork(id: DisasterPresetId): NetworkScenario {
  const valid: DisasterPresetId[] = [
    "internet-gone",
    "cellular-overload",
    "power-outage",
    "hill-relay",
    "wide-area",
    "emergency-network",
  ];
  if (!valid.includes(id)) throw new RangeError("Unknown disaster preset");
  const hf = id === "wide-area";
  const positions = hf
    ? [0, 9, 18]
    : id === "hill-relay"
      ? [0, 0.09, 0.18]
      : [0, 0.035, 0.07, 0.105];
  const count = id === "internet-gone" ? 2 : id === "emergency-network" ? 4 : 3;
  const nodes: NetworkNode[] = positions
    .slice(0, count)
    .map((longitudeDeg, i) => ({
      id: ["base", "shelter", "field", "clinic"][i],
      label: ["Coordination", "Shelter", "Field team", "Medical post"][i],
      position: {
        latitudeDeg: 1.3,
        longitudeDeg,
        altitudeM: id === "hill-relay" && i === 1 ? 80 : 0,
      },
      antenna: {
        id: `network-${i}`,
        type: hf ? "dipole" : "vertical",
        gainDbi: hf ? 2.15 : 2,
        heightM: hf ? 10 : 2,
        polarization: hf ? "horizontal" : "vertical",
      },
      feedline: { lengthM: 5, lossDb: 1 },
      powerDbm: hf ? 40 : id === "power-outage" ? 50 : 37,
      bandwidthHz: hf ? 2400 : 12500,
      noiseFigureDb: 5,
      battery: {
        ...DEFAULT_BATTERY,
        capacityWh: id === "power-outage" ? 48 : 120,
        transmitDutyCycle: id === "power-outage" ? 0.3 : 0.1,
        receiveDutyCycle: 0.5,
      },
    }));
  const environment: EnvironmentConfig = hf
    ? {
        model: "hf-skywave",
        temperatureK: 290,
        externalNoiseDb: quietRuralNoiseFactorDb(7.1e6),
        effectiveHeightM: 250000,
        criticalFrequencyMHzDay: 8,
        criticalFrequencyMHzNight: 4,
        absorptionDbAt10MHzDay: 3,
        absorptionDbAt10MHzNight: 1,
        groundReflectionLossDb: 3,
        maxHops: 5,
      }
    : {
        model: "vhf-terrain",
        temperatureK: 290,
        externalNoiseDb: defaultExternalNoiseDbForBand("VHF"),
        effectiveEarthRadiusFactor: 4 / 3,
      };
  const links: NetworkLink[] = [];
  for (let a = 0; a < nodes.length; a++)
    for (let b = a + 1; b < nodes.length; b++) {
      const linkEnvironment = structuredClone(environment);
      if (
        id === "hill-relay" &&
        a === 0 &&
        b === 2 &&
        linkEnvironment.model === "vhf-terrain"
      )
        linkEnvironment.obstruction = { fraction: 0.5, altitudeM: 80 };
      links.push({
        id: `${nodes[a].id}-${nodes[b].id}`,
        from: nodes[a].id,
        to: nodes[b].id,
        frequencyHz: hf ? 7.1e6 : 145e6,
        modeId: hf ? "ssb" : "fm-voice",
        environment: linkEnvironment,
      });
    }
  return {
    nodes,
    links,
    timeUtcIso: "2026-06-01T12:00:00Z",
    requiredMarginDb: 6,
    requirement: "voice",
    rootNodeId: "base",
    targetRuntimeHours: id === "power-outage" ? 12 : 8,
  };
}
