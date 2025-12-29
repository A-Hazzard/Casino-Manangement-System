// Shared common types used across frontend and backend
import { Types } from 'mongoose';

// Time period type for analytics
export type TimePeriod =
  | 'Today'
  | 'Yesterday'
  | 'last7days'
  | '7d'
  | 'last30days'
  | '30d'
  | 'Quarterly'
  | 'All Time'
  | 'Custom';

// Chart granularity type for time-based chart aggregation
export type ChartGranularity =
  | 'minute'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

// Custom date range type for API responses
export type CustomDate = {
  startDate?: Date;
  endDate?: Date;
};

// MongoDB-specific types
export type DateRangeFilter = {
  $gte?: Date;
  $lte?: Date;
};

export type MongoDBQueryValue = string | number | boolean | Date | object | null | undefined;

export type QueryFilter = Record<string, MongoDBQueryValue>;

// MongoDB related types
export type MongooseId = string | Types.ObjectId;

export type SasMeters = {
  coinIn: number;
  coinOut: number;
  drop: number; // Money physically inserted (Money In)
  jackpot: number;
  gamesPlayed: number;
  gamesWon: number;
  currentCredits: number;
  totalCancelledCredits?: number; // Manual payouts (Money Out)
  totalHandPaidCancelledCredits?: number; // Total hand paid cancelled credits
  totalWonCredits?: number;
  gross?: number;
  sasStartTime?: string;
  sasEndTime?: string;
  movement?: {
    coinIn?: number;
    coinOut?: number;
    jackpot?: number;
    totalHandPaidCancelledCredits?: number;
    totalCancelledCredits?: number;
    gamesPlayed?: number;
    gamesWon?: number;
    currentCredits?: number;
    totalWonCredits?: number;
    drop?: number;
  };
  [key: string]: unknown;
};

// Alias for backward compatibility
export type MeterData = SasMeters;

export type CollectionMetersHistoryEntry = {
  _id: string;
  timestamp: string | Date;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  locationReportId: string;
};

export type BillValidatorData = {
  dollar1?: number;
  dollar2?: number;
  dollar5?: number;
  dollar10?: number;
  dollar20?: number;
  dollar50?: number;
  dollar100?: number;
  dollar200?: number;
  dollar500?: number;
  dollar1000?: number;
  dollar2000?: number;
  dollar5000?: number;
  dollarTotal?: number;
  dollarTotalUnknown?: number;
};
