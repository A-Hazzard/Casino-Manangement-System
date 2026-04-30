import { Types } from 'mongoose';

export type TimePeriod =
  | 'Today'
  | 'Yesterday'
  | 'last7days'
  | '7d'
  | 'last30days'
  | '30d'
  | 'Quarterly'
  | 'All Time'
  | 'Custom'
  | 'LastHour';

export type ChartGranularity =
  | 'minute'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

export type CustomDate = {
  startDate?: Date;
  endDate?: Date;
};

export type DateRangeFilter = {
  $gte?: Date;
  $lte?: Date;
};

export type MongoDBQueryValue = string | number | boolean | Date | object | null | undefined;

export type QueryFilter = Record<string, MongoDBQueryValue>;

export type MongooseId = string | Types.ObjectId;

export type SasMeters = {
  coinIn: number;
  coinOut: number;
  drop: number;
  jackpot: number;
  gamesPlayed: number;
  gamesWon: number;
  currentCredits: number;
  totalCancelledCredits?: number;
  totalHandPaidCancelledCredits?: number;
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

export type MeterData = SasMeters;

export type CollectionMetersHistoryEntry = {
  _id: string;
  timestamp: string | Date;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  prevIn?: number;
  prevOut?: number;
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

export type Alert = {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  read?: boolean;
};
