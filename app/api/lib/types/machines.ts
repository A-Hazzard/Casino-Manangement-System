/**
 * Machine Types
 *
 * Type definitions for machine-related data structures used in API routes.
 *
 * Features:
 * - Machine with collection history types
 * - Collection meters history entry types
 */

/**
 * Collection meters history entry
 * Represents a single entry in a machine's collection meters history
 */
export type CollectionMetersHistoryEntry = {
  _id: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn?: number;
  prevMetersOut?: number;
  prevIn?: number; // Legacy field name (alias for prevMetersIn)
  prevOut?: number; // Legacy field name (alias for prevMetersOut)
  timestamp: Date;
  locationReportId?: string;
};

/**
 * Machine document with collection meters history
 * Used for operations that require machine data with its collection history
 */
export type MachineWithHistory = {
  _id: string;
  serialNumber?: string;
  origSerialNumber?: string;
  custom?: { name?: string };
  collectionMetersHistory: Array<CollectionMetersHistoryEntry>;
};

/**
 * Machine document with optional collection meters history
 * Used when history may or may not be present
 */
export type MachineWithOptionalHistory = {
  _id: string;
  serialNumber?: string;
  origSerialNumber?: string;
  custom?: { name?: string };
  collectionMetersHistory?: Array<CollectionMetersHistoryEntry>;
};
