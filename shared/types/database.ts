// Shared database types used across frontend and backend
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

// MongoDB query filter types
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

// Meter movement data
export type MeterMovement = {
  drop?: number;
  totalCancelledCredits?: number;
  totalHandPaidCancelledCredits?: number;
  currentCredits?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  jackpot?: number;
  coinIn?: number;
  coinOut?: number;
};

// SAS meters data - use SasMeters from shared/types/common.ts
// export type SasMeters = {
//   coinIn: number;
//   coinOut: number;
//   drop: number;
//   jackpot: number;
//   gamesPlayed: number;
//   gamesWon: number;
//   currentCredits: number;
//   totalCancelledCredits?: number;
//   totalHandPaidCancelledCredits?: number;
//   totalWonCredits?: number;
//   gross?: number;
//   sasStartTime?: string;
//   sasEndTime?: string;
//   [key: string]: unknown;
// };

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

// Collection meters history entry
export type CollectionMetersHistoryEntry = {
  _id: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  timestamp: string;
  locationReportId: string;
};

// Bill validator data
export type BillValidatorData = {
  balance?: number;
  notes?: Array<{ denomination: number; quantity: number }>;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  billsAccepted?: Array<{ denomination: number; count: number }>;
  lastActivity?: string;
  status?: string;
};
