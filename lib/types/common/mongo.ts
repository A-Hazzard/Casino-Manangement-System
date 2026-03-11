/**
 * MongoDB Types
 * MongoDB and Mongoose-specific types for database operations.
 *
 * Includes types for:
 * - Database query filters (date range, regex, arrays, expressions)
 * - Machine/cabinet documents and queries
 * - Cabinet details and query results
 * - Transformed cabinet data for API responses
 * - SAS meters and collection history
 * Re-exports shared database types from shared/types.
 */
import type {
  DateRangeFilter,
  MongoDBQueryValue,
  QueryFilter,
  SasMeters,
} from '@/shared/types';
import mongoose from 'mongoose';

// Re-export shared database types for convenience
export type { DateRangeFilter, MongoDBQueryValue, QueryFilter };

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
  metersData: {
    readAt: Date | null;
    movement: Record<string, unknown> | null;
  } | null;
  sasMeters: Record<string, unknown> | null;
};

