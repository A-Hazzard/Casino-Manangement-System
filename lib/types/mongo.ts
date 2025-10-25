import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import type {
  DateRangeFilter,
  RegexFilter as DbRegexFilter,
  ArrayFilter,
  ExpressionFilter,
  MongoDBQueryValue,
  MongooseCache,
  MongoQuery,
  MeterMovement,
  SasMeters,
  MeterData,
  CollectionMetersHistoryEntry,
  BillValidatorData,
} from '@shared/types';

// Re-export shared database types
export type {
  DateRangeFilter,
  ArrayFilter,
  ExpressionFilter,
  MongoDBQueryValue,
  MongooseCache,
  MongoQuery,
  MeterMovement,
  SasMeters,
  MeterData,
  CollectionMetersHistoryEntry,
  BillValidatorData,
};

// Legacy alias for backward compatibility
export type RegexFilter = DbRegexFilter;

// Create more specific nested query types
export type StringIdQuery = {
  gamingLocation?: string | ObjectId;
  'Custom.gamingLocation'?: string | ObjectId;
  serialNumber?: RegexFilter;
  relayId?: RegexFilter;
  smibBoard?: RegexFilter;
};

export type NestedOrQuery = {
  $or?: Array<StringIdQuery>;
};

// Specific query type for cabinet queries with required fields
export type CabinetsQuery = {
  gamingLocation?: string | ObjectId | RegexFilter;
  'Custom.gamingLocation'?: string | ObjectId | RegexFilter;
  deletedAt?: ArrayFilter;
  $or?: Array<StringIdQuery | NestedOrQuery>;
  'rel.licencee'?: string;
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
