// Shared entity types used across frontend and backend
import { Types } from "mongoose";
import type { MongooseId, WithTimestamps } from "./common";
import type {
  SasMeters,
  MeterData,
  BillValidatorData,
  CollectionMetersHistoryEntry,
} from "./database";

// Location types
export type Location = {
  _id: string;
  locationName: string;
  name?: string;
  country: string;
  address?: Address;
  rel?: RelationshipInfo;
  profitShare: number;
  isLocalServer?: boolean;
  geoCoords?: GeoCoordinates;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  moneyIn?: number;
  moneyOut?: number;
  gross?: number;
  totalMachines?: number;
  onlineMachines?: number;
  hasSmib?: boolean;
  noSMIBLocation?: boolean;
};

export type Address = {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  [key: string]: string | undefined;
};

export type RelationshipInfo = {
  licencee?: string;
  [key: string]: string | undefined;
};

export type GeoCoordinates = {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: number | undefined;
};

export type AggregatedLocation = {
  location: string;
  locationName: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  totalMachines: number;
  onlineMachines: number;
  sasMachines: number;
  nonSasMachines: number;
  hasSasMachines: boolean;
  hasNonSasMachines: boolean;
  isLocalServer: boolean;
  noSMIBLocation: boolean;
  hasSmib: boolean;
};

// Location metrics for reports and analytics
export type LocationMetrics = {
  totalGross: number;
  totalDrop: number;
  totalCancelledCredits: number;
  onlineMachines: number;
  totalMachines: number;
};

// Top location for dashboard and reports
export type TopLocation = {
  locationId: string;
  locationName: string;
  gross: number;
  drop: number;
  cancelledCredits: number;
  onlineMachines: number;
  totalMachines: number;
  performance: "excellent" | "good" | "average" | "poor";
  sasEnabled: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  // Additional fields for the new card design
  holdPercentage: number;
};

// Machine types
export type Machine = {
  _id: string;
  serialNumber: string;
  game: string;
  gameType: string;
  isCronosMachine: boolean;
  gameConfig?: {
    accountingDenomination?: number;
    theoreticalRtp?: number;
    [key: string]: unknown;
  };
  cabinetType: string;
  assetStatus: string;
  gamingLocation: string;
  relayId: string;
  collectionTime?: string;
  collectionMeters?: {
    metersIn: number;
    metersOut: number;
  };
  billValidator?: BillValidatorData;
  lastActivity?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  collectionMetersHistory?: CollectionMetersHistoryEntry[];
};

export type MachineDocument = {
  _id: Types.ObjectId | string;
  machineId?: string;
  gamingLocation?: Types.ObjectId | string;
  serialNumber?: string;
  relayId?: string;
  smibBoard?: string;
  game?: string;
  cabinetType?: string;
  assetStatus?: string;
  lastActivity?: Date;
  sasMeters?: SasMeters;
  billValidator?: BillValidatorData;
  gameConfig?: {
    accountingDenomination?: number;
    theoreticalRtp?: number;
    maxBet?: string;
    payTableId?: string;
  };
  smibVersion?: {
    firmware?: string;
    version?: string;
  };
  collectionMeters?: {
    metersIn?: number;
    metersOut?: number;
  };
  collectionMetersHistory?: unknown[];
  deletedAt?: Date | null;
  [key: string]: unknown;
};

// Cabinet types
export type Cabinet = {
  _id: string;
  assetNumber?: string;
  serialNumber?: string;
  smbId?: string;
  relayId?: string;
  smibBoard?: string;
  lastActivity?: string | Date;
  lastOnline?: string | Date;
  game?: string;
  installedGame?: string;
  cabinetType?: string;
  assetStatus?: string;
  status?: string;
  gamingLocation?: string | Record<string, unknown>;
  accountingDenomination?: string | number;
  collectionMultiplier?: string;
  gameType?: string;
  isCronosMachine?: boolean;
  moneyIn?: number;
  moneyOut?: number;
  jackpot?: number;
  cancelledCredits?: number;
  gross?: number;
  sasMeters?: SasMeters;
  online?: boolean;
  meterData?: MeterData | null;
  calculatedMetrics?: {
    moneyIn: number;
    moneyOut: number;
    jackpot: number;
    cancelledCredits: number;
    gamesPlayed: number;
    gamesWon: number;
  };
  gameConfig?: {
    accountingDenomination?: number;
    theoreticalRtp?: number;
    maxBet?: string;
    payTableId?: string;
  };
  smibVersion?: {
    firmware?: string;
    version?: string;
  };
  smibConfig?: SmibConfig;
  collectionMeters?: {
    metersIn?: number;
    metersOut?: number;
  };
  collectionTime?: string | Date;
  collectionMetersHistory?: Array<{
    metersIn?: number;
    metersOut?: number;
    timestamp?: string;
    _id?: string;
  }>;
  deletedAt?: string | Date | null;
  locationId?: string;
  locationName?: string;
};

export type SmibConfig = {
  net?: {
    netMode?: number;
    netStaSSID?: string;
    netStaPwd?: string;
    netStaChan?: number;
  };
  mqtt?: {
    mqttSecure?: number;
    mqttQOS?: number;
    mqttURI?: string;
    mqttSubTopic?: string;
    mqttPubTopic?: string;
    mqttCfgTopic?: string;
    mqttIdleTimeS?: number;
  };
  coms?: {
    comsAddr?: number;
    comsMode?: number;
    comsRateMs?: number;
    comsRTE?: number;
    comsGPC?: number;
  };
};

// User types
export type User = {
  _id: string;
  name: string;
  username: string;
  email: string;
  enabled: boolean;
  roles: string[];
  profilePicture: string | null;
  resourcePermissions?: ResourcePermissions;
  password?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: string;
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: string;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
  };
};

export type ResourcePermissions = {
  "gaming-locations"?: {
    entity: "gaming-locations";
    resources: string[];
  };
  // Add other resource types as needed
};

// Licensee types
export type Licensee = {
  _id: string;
  name: string;
  description?: string;
  country: string;
  countryName?: string;
  startDate?: Date | string;
  expiryDate?: Date | string;
  prevStartDate?: Date | string;
  prevExpiryDate?: Date | string;
  isPaid?: boolean;
  lastEdited?: Date | string;
  deletedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    zoomRatio?: number;
  };
};

// Country types
export type Country = {
  _id: string;
  name: string;
  alpha2: string;
  alpha3: string;
  isoNumeric: string;
  createdAt: string;
  updatedAt: string;
};

// Firmware types
export type Firmware = {
  _id: string;
  product: string;
  version: string;
  versionDetails: string;
  fileId: Types.ObjectId;
  fileName: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

// Movement request types
export type MovementRequest = {
  _id: string;
  variance: number;
  previousBalance: number;
  currentBalance: number;
  amountToCollect: number;
  amountCollected: number;
  amountUncollected: number;
  partnerProfit: number;
  taxes: number;
  advance: number;
  locationName: string;
  locationFrom: string;
  locationTo: string;
  locationId: string;
  createdBy: string;
  movementType: string;
  installationType: string;
  reason: string;
  requestTo: string;
  cabinetIn: string;
  status: MovementRequestStatus;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
  approvedBy?: string;
  approvedBySecond?: string;
};

export type MovementRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "in progress";
