import { TimePeriod } from "./api";

export type dashboardData = {
  xValue?: string;
  day: string;
  time?: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  location?: string;
  locationName?: string;
  machine?: string;
  geoCoords?: {
    latitude: number;
    longitude: number;
    name?: string;
  }[];
};

// Type for location data returned from API
export type LocationData = {
  _id: string;
  location?: string;
  locationName?: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  totalMachines: number;
  onlineMachines: number;
  noSMIBLocation?: boolean;
  isLocalServer?: boolean;
};

export type ActiveFilters = {
  Today: boolean;
  Yesterday: boolean;
  last7days: boolean;
  last30days: boolean;
  Custom: boolean;
};

export type ActiveTab = "locations" | "Cabinets";

export type TimeFrames = {
  time: string;
  value: TimePeriod;
};

export type Meter = {
  _id: string; // MongoDB ObjectId as a string
  machine: string; // Reference to a machine
  location: string; // Reference to a location
  movement: {
    coinIn: number;
    coinOut: number;
    drop: number;
    totalCancelledCredits: number;
    gamesPlayed: number;
    jackpot: number;
  };
  coinIn: number;
  coinOut: number;
  drop: number;
  totalCancelledCredits: number;
  gamesPlayed: number;
  jackpot: number;
  createdAt: Date;
  updatedAt: Date;
  readAt: Date;
};

/**
 * Defines the structure of the MongoDB aggregated meter data.
 */
export type Metrics = {
  day: string; // e.g., "2025-02-21"
  time?: string; // e.g., "14:05", only if available
  drop: number; // Total moneyIn
  totalCancelledCredits: number; // Total cancelled credits
  gross: number; // Gross calculation
  location?: string; // Optional - Location name (if applicable)
  locationName?: string;
  machine?: string; // Optional - Machine ID (if applicable)
  geoCoords?: dashboardData["geoCoords"];
};

/**
 * Represents a single top-performing entity (location or cabinet).
 */
export type TopPerformingData = {
  location?: string; // Available for locations
  machine?: string; // Available for Cabinets
  totalDrop: number;
  totalGamesPlayed: number;
  totalJackpot: number;
  color?: string; // ✅ Added color property for Pie Chart visualization
};

export type licenceeOption = {
  label: string;
  value: string;
};

/**
 * Represents a date range with a `startDate` and an `endDate`.
 */
export type dateRange = {
  startDate: Date;
  endDate: Date;
};

export type locations = {
  _id: string;
  name: string;
  locationName?: string;
  geoCoords: {
    latitude: number;
    longitude: number;
  };
  totalMachines?: number;
  onlineMachines?: number;
  moneyIn?: number;
  moneyOut?: number;
  gross?: number;
  isLocalServer?: boolean;
  noSMIBLocation?: boolean;
  hasSmib?: boolean;
};

export type UserAuthPayload = {
  _id: string;
  emailAddress: string;
  password?: string;
  isEnabled: boolean;
  roles: string[];
  permissions: string[];
  resourcePermissions: {
    [key: string]: {
      entity: string;
      resources: string[];
    };
  };
};

// Re-export types from other files
export * from "./cabinets";
export * from "./location";

export type {
  CollectionReportData,
  MachineMetric,
  LocationMetric,
  SASMetric,
} from "./api";
