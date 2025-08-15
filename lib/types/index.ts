import type {
  DashboardData,
  Metrics,
  TopPerformingData,
  ActiveFilters,
  TimeFrames,
} from "@shared/types";

// Re-export shared types for convenience
export type {
  DashboardData,
  Metrics,
  TopPerformingData,
  ActiveFilters,
  TimeFrames,
};

// Legacy type alias for backward compatibility
export type dashboardData = DashboardData;

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

export type ActiveTab = "locations" | "Cabinets";

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
    longtitude?: number;
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
export * from "./firmware";

export type {
  CollectionReportData,
  MachineMetric,
  LocationMetric,
  SASMetric,
} from "./api";
