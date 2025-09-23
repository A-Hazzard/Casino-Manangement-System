// Shared common types used across frontend and backend
import { Types } from "mongoose";

// Generic API response type
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Date range type for filtering
export type DateRange = {
  start: Date;
  end: Date;
};

// Time period type for analytics
export type TimePeriod =
  | "Today"
  | "Yesterday"
  | "last7days"
  | "7d"
  | "last30days"
  | "30d"
  | "All Time"
  | "Custom";

// MongoDB related types
export type MongooseId = string | Types.ObjectId;

export type MongoMatchStage = {
  _id?: MongooseId | { $in: MongooseId[] };
  deletedAt?: { $in: (Date | null)[] };
};

// Database model related types
export type WithTimestamps = {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

// Helper type for MongoDB filtering
export type RegexFilter = {
  $regex: string;
  $options: string;
};

// Helper type for getting multiple date ranges
export type CustomDate = {
  startDate: Date | undefined;
  endDate: Date | undefined;
};

// Query filter type
export type QueryFilter = {
  userId?: string;
  location?: string;
  machine?: string;
  readAt?: {
    $gte: Date;
    $lte: Date;
  };
};

// API params type
export type ApiParamsType = {
  timePeriod: "Today" | "Yesterday" | "7d" | "30d" | "All Time" | "Custom";
  licencee: string;
};

// Pipeline stage type
export type PipelineStage = {
  [key: string]: unknown;
};

// Performance status
export type PerformanceStatus = "good" | "average" | "poor";

// Sort direction
export type SortDirection = "asc" | "desc";

// Additional MongoDB types
export type DateRangeFilter = {
  $gte?: Date;
  $lte?: Date;
};

export type ArrayFilter = {
  $in?: unknown[];
  $nin?: unknown[];
};

export type ExpressionFilter = {
  [key: string]: unknown;
};

export type MongoDBQueryValue = unknown;

export type MongooseCache = {
  [key: string]: unknown;
};

export type MongoQuery = {
  [key: string]: unknown;
};

// Meter and collection types
export type MeterMovement = {
  coinIn: number;
  coinOut: number;
  totalCancelledCredits: number;
  totalHandPaidCancelledCredits: number;
  totalWonCredits: number;
  drop: number;
  jackpot: number;
  currentCredits: number;
  gamesPlayed: number;
  gamesWon: number;
};

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
  [key: string]: unknown;
};

export type MeterData = {
  _id: string;
  machine: string;
  location: string;
  locationSession: string;
  viewingAccountDenomination?: {
    drop: number;
    totalCancelledCredits: number;
  };
  movement?: MeterMovement;
  coinIn: number;
  coinOut: number;
  totalCancelledCredits: number;
  totalHandPaidCancelledCredits: number;
  totalWonCredits: number;
  drop: number;
  jackpot: number;
  currentCredits: number;
  gamesPlayed: number;
  gamesWon: number;
  readAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

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

// Location types
export type Address = {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

export type RelationshipInfo = {
  licencee?: string;
  [key: string]: unknown;
};

export type GeoCoordinates = {
  latitude?: number;
  longitude?: number;
};

export type Location = {
  _id: string;
  name: string;
  address?: Address;
  rel?: RelationshipInfo;
  geoCoords?: GeoCoordinates;
  profitShare?: number;
  isLocalServer?: boolean;
  hasSmib?: boolean;
  noSMIBLocation?: boolean;
  deletedAt?: Date | null;
};

export type AggregatedLocation = {
  _id: string;
  location: string;
  locationName: string;
  name: string;
  address?: Address;
  rel?: RelationshipInfo;
  geoCoords?: GeoCoordinates;
  totalMachines: number;
  onlineMachines: number;
  sasMachines: number;
  nonSasMachines: number;
  moneyIn: number;
  moneyOut: number;
  coinIn: number;
  coinOut: number;
  jackpot: number;
  gross: number;
  gamesPlayed: number;
  isLocalServer: boolean;
  hasSmib: boolean;
  hasSasMachines: boolean;
  hasNonSasMachines: boolean;
  noSMIBLocation: boolean;
};
