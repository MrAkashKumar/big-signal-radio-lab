import type { Scenario } from "./index";

export const exampleScenario: Scenario = {
  schemaVersion: 1,
  id: "vhf-bootstrap",
  title: "Base camp to remote team",
  difficulty: "beginner",
  frequencyHz: 145_000_000,
  modeId: "fm-voice",
  transmitter: {
    position: { latitudeDeg: 0, longitudeDeg: 0, altitudeM: 0 },
    powerDbm: 36.98970004336019,
    antenna: { id: "tx-vertical", type: "vertical", gainDbi: 2, heightM: 2, polarization: "vertical" },
    feedline: { lengthM: 2, lossDb: 1 },
  },
  receiver: {
    position: { latitudeDeg: 0, longitudeDeg: 0.01, altitudeM: 0 },
    antenna: { id: "rx-vertical", type: "vertical", gainDbi: 2, heightM: 2, polarization: "vertical" },
    feedline: { lengthM: 2, lossDb: 1 },
    bandwidthHz: 12_500,
    noiseFigureDb: 5,
  },
  environment: { model: "free-space", temperatureK: 290 },
  time: { utcIso: "2026-09-13T00:00:00.000Z" },
};
