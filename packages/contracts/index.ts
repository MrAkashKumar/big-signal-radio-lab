export type Difficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export interface GeoPosition {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeM: number;
}

export interface AntennaConfig {
  id: string;
  type:
    | "rubber-duck"
    | "vertical"
    | "dipole"
    | "yagi"
    | "dish"
    | "custom";

  gainDbi: number;
  heightM: number;

  polarization:
    | "vertical"
    | "horizontal"
    | "circular"
    | "unknown";
}

export interface FeedlineConfig {
  lengthM: number;
  lossDb: number;
}

export interface Scenario {
  schemaVersion: 1;

  id: string;
  title: string;

  difficulty: Difficulty;

  frequencyHz: number;
  modeId: string;

  transmitter: {
    position: GeoPosition;
    powerDbm: number;
    antenna: AntennaConfig;
    feedline: FeedlineConfig;
  };

  receiver: {
    position: GeoPosition;
    antenna: AntennaConfig;
    feedline: FeedlineConfig;

    bandwidthHz: number;
    noiseFigureDb: number;
  };

  environment: EnvironmentConfig;

  time: SimulationTime;
}


export interface CalculationNode {
  id: string;
  label: string;

  value: number;
  unit: string;

  equation?: string;

  assumptions?: string[];

  children?: CalculationNode[];
}


export interface LimitingFactor {
  id: string;

  label: string;

  impactDb: number;

  possibleImprovementDb: number;

  confidence: number;

  explanationKey: string;
}


export interface PropagationPath {
  type:
    | "direct"
    | "diffracted"
    | "skywave"
    | "groundwave";

  points: {
    lat?: number;
    lon?: number;
    altitudeM?: number;

    localX?: number;
    localY?: number;
    localZ?: number;
  }[];
}


export interface SimulationResult {
  schemaVersion: 1;

  receivedPowerDbm: number;

  noiseFloorDbm: number;

  snrDb: number;

  requiredSnrDb: number;

  linkMarginDb: number;

  probabilityOfSuccess?: number;

  propagationAvailable: boolean;

  success:
    | "good"
    | "marginal"
    | "failed";

  confidence: {
    level:
      | "high"
      | "medium"
      | "low";

    reasons: string[];
  };

  calculations: CalculationNode[];

  limitingFactors: LimitingFactor[];

  propagationPaths: PropagationPath[];

  warnings: string[];

  explanationKeys: string[];
}


export interface EnvironmentBase {
  temperatureK: number;
  externalNoiseDb?: number;
}

export interface TerrainObstruction {
  fraction: number;
  altitudeM: number;
}

export type EnvironmentConfig = EnvironmentBase & (
  | { model: "free-space" }
  | {
      model: "vhf-terrain";
      effectiveEarthRadiusFactor: number;
      obstruction?: TerrainObstruction;
    }
  | {
      model: "hf-skywave";
      effectiveHeightM: number;
      criticalFrequencyMHzDay: number;
      criticalFrequencyMHzNight: number;
      absorptionDbAt10MHzDay: number;
      absorptionDbAt10MHzNight: number;
      groundReflectionLossDb: number;
      maxHops: number;
    }
);

export interface SimulationTime {
  utcIso: string;
}
