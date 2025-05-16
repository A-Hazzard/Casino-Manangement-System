import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export type DateRangeFilter = {
  $gte: Date;
  $lte: Date;
};

export type RegexFilter = {
  $regex: string;
  $options: string;
};

export type ArrayFilter = {
  $in: (Date | null | string | number | undefined)[];
};

export type ExpressionFilter = {
  $eq?: string | number | boolean | Date | null;
  $ne?: string | number | boolean | Date | null;
  $gt?: Date | number;
  $gte?: Date | number;
  $lt?: Date | number;
  $lte?: Date | number;
  $in?: (string | number | Date | null | undefined)[];
  $nin?: (string | number | Date | null)[];
  $exists?: boolean;
};

export type MongoDBQueryValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | RegexFilter
  | DateRangeFilter
  | ArrayFilter
  | ExpressionFilter
  | ObjectId;

export type MongooseCache = {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
};

// Generic MongoDB query type with string indexer to allow dynamic keys
export type MongoQuery<T = Record<string, unknown>> = T & {
  [key: string]:
    | MongoDBQueryValue
    | MongoDBQueryValue[]
    | MongoQuery
    | MongoQuery[];
};

// Create more specific nested query types
export type StringIdQuery = {
  gamingLocation?: string | ObjectId;
  "Custom.gamingLocation"?: string | ObjectId;
  serialNumber?: RegexFilter;
  relayId?: RegexFilter;
  smibBoard?: RegexFilter;
};

export type NestedOrQuery = {
  $or?: Array<StringIdQuery>;
};

// Specific query type for cabinet queries with required fields
export type CabinetsQuery = MongoQuery<{
  gamingLocation?: string | ObjectId | RegexFilter;
  "Custom.gamingLocation"?: string | ObjectId | RegexFilter;
  deletedAt?: ArrayFilter;
  $or?: Array<StringIdQuery | NestedOrQuery>;
  "rel.licencee"?: string;
}>;

// Specific query for meter data
export type MeterMovement = {
  drop?: number;
  totalCancelledCredits?: number;
  gamesPlayed?: number;
  jackpot?: number;
  coinIn?: number;
  coinOut?: number;
};

// Type for SAS meters data
export type SasMeters = {
  coinIn: number;
  coinOut: number;
  jackpot: number;
  gamesPlayed: number;
  gamesWon: number;
  currentCredits: number;
  totalCancelledCredits?: number;
  [key: string]: unknown;
};

// Meter data type matching Mongoose document structure
export type MeterData = {
  _id?: string;
  machine?: string | ObjectId;
  location?: string | ObjectId;
  locationSession?: string | ObjectId;
  readAt?: Date;
  movement?: MeterMovement;
  viewingAccountDenomination?: {
    drop?: number;
    totalCancelledCredits?: number;
    jackpot?: number;
  };
  coinIn?: number;
  coinOut?: number;
  totalCancelledCredits?: number;
  totalHandPaidCancelledCredits?: number;
  totalWonCredits?: number;
  drop?: number;
  jackpot?: number;
  currentCredits?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
};

// Type for machine documents from MongoDB
export type MachineDocument = {
  _id: mongoose.Types.ObjectId | string;
  machineId?: string;
  gamingLocation?: mongoose.Types.ObjectId | string;
  serialNumber?: string;
  relayId?: string;
  smibBoard?: string;
  game?: string;
  cabinetType?: string;
  assetStatus?: string;
  lastActivity?: Date;
  sasMeters?: SasMeters;
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
  [key: string]: unknown; // Use unknown instead of any
};

// Type for the cabinet detail response
export type CabinetDetail = MachineDocument & {
  assetNumber: string;
  serialNumber: string;
  relayId: string;
  smibBoard: string;
  smbId: string;
  game: string;
  installedGame: string;
  cabinetType: string;
  assetStatus: string;
  status: string;
  meterData: MeterData | null;
  sasMeters: SasMeters;
  calculatedMetrics?: {
    moneyIn: number;
    moneyOut: number;
    jackpot: number;
    cancelledCredits: number;
    gamesPlayed: number;
    gamesWon: number;
  };
};

// Type for cabinet query results from MongoDB
export type CabinetQueryResult = {
  _id: mongoose.Types.ObjectId | string;
  gamingLocation?: mongoose.Types.ObjectId | string;
  serialNumber?: string;
  relayId?: string;
  smibBoard?: string;
  game?: string;
  cabinetType?: string;
  assetStatus?: string;
  lastActivity?: Date;
  sasMeters?: SasMeters;
  deletedAt?: Date | null;
  [key: string]: unknown; // Use unknown instead of any for better type safety
};

// Type for the transformed cabinet data returned by API
export type TransformedCabinet = {
  _id: string;
  locationId: string;
  locationName: string;
  assetNumber: string;
  serialNumber: string;
  relayId: string;
  smibBoard: string;
  smbId: string;
  lastActivity: Date | null;
  lastOnline: Date | null;
  game: string;
  installedGame: string;
  cabinetType: string;
  assetStatus: string;
  status: string;
  moneyIn: number;
  moneyOut: number;
  jackpot: number;
  cancelledCredits: number;
  gross: number;
  metersData: { readAt: Date | null; movement: MeterMovement | null } | null;
  sasMeters: Record<string, unknown> | null;
};
