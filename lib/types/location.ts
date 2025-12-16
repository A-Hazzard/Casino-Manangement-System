import type {
  Address,
  AggregatedLocation,
  GeoCoordinates,
  RelationshipInfo,
  Location as SharedLocation,
} from '@shared/types';

// Re-export shared location types
export type { Address, AggregatedLocation, GeoCoordinates, RelationshipInfo };

// Use shared Location type
export type Location = SharedLocation;

export type UpdateLocationData = {
  name?: string;
  country?: string;
  address?: Partial<Address>;
  rel?: Partial<RelationshipInfo>;
  profitShare?: number;
  gameDayOffset?: number;
  geoCoords?: Partial<GeoCoordinates>;
  isLocalServer?: boolean;
  billValidatorOptions?: Record<string, unknown>;
  updatedAt?: Date;
  [key: string]: unknown;
};

export type LocationSelectItem = {
  _id: string;
  name: string;
  licenseeId?: string | null;
};

export type LocationTableItem = {
  _id: string;
  name: string;
  location: string;
  locationName: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  totalMachines: number;
  onlineMachines: number;
  isSmibLocation?: boolean;
  isLocalServer?: boolean;
  hasSmib?: boolean;
  online?: boolean;
};

export type LocationSortOption =
  | 'locationName'
  | 'moneyIn'
  | 'moneyOut'
  | 'gross'
  | 'totalMachines'
  | 'onlineMachines';

export type LocationFilter =
  | 'NoSMIBLocation'
  | 'SMIBLocationsOnly'
  | 'LocalServersOnly'
  | 'MembershipOnly'
  | 'MissingCoordinates'
  | 'HasCoordinates'
  | ''
  | null;

// Re-evaluating to clear cache

export type LocationSearchSelectProps = {
  locations: LocationSelectItem[];
  selectedLocationName?: string;
  onSelect: (locationId: string) => void;
};

export type LocationResponse = {
  _id: string;
  name: string;
  address: Address;
  city?: string;
  state?: string;
  country: string;
  licencee?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: [number, number];
  metersIn?: number;
  metersOut?: number;
  jackpot?: number;
  gross?: number;
  timePeriod?: string;
  rel?: RelationshipInfo;
  profitShare?: number;
  geoCoords?: GeoCoordinates;
  totalMachines?: number;
  onlineMachines?: number;
  isLocalServer?: boolean;
  hasSmib?: boolean;
};

export type LocationStore = {
  isLocationModalOpen: boolean;
  openLocationModal: () => void;
  closeLocationModal: () => void;
  createLocation: (location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    licencee?: string;
  }) => Promise<void>;
};

export type LocationActionsState = {
  selectedLocation: Partial<AggregatedLocation>;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  openEditModal: (location: Partial<AggregatedLocation>) => void;
  openDeleteModal: (location: Partial<AggregatedLocation>) => void;
  closeEditModal: () => void;
  closeDeleteModal: () => void;
};

import {
  ArrayFilter,
  DateRangeFilter,
  MongoDBQueryValue,
  RegexFilter,
} from './mongo';

export type LocationMatchStage = {
  name?: RegexFilter;
  'rel.licencee'?: string;
  deletedAt?: ArrayFilter;
  [key: string]: MongoDBQueryValue | undefined;
};

export type MetricsMatchStage = {
  'rel.licencee'?: string;
  timePeriod?: string;
  createdAt?: DateRangeFilter;
  [key: string]: MongoDBQueryValue | undefined;
};

export type MeterMatchStage = {
  readAt: DateRangeFilter;
  'rel.licencee'?: string;
  [key: string]: MongoDBQueryValue | undefined;
};

export type LocationMetric = {
  locationId: string;
  metersIn: number;
  metersOut: number;
  jackpot: number;
  gross: number;
  timePeriod: string;
};

export type Metric = {
  _id: string;
  locationId?: string;
  moneyIn: number;
  moneyOut: number;
  jackpot?: number;
  gross: number;
  timePeriod?: string;
};

export type LocationData = {
  _id: string;
  locationName: string;
  country: string;
  address: {
    city?: string;
    [key: string]: unknown;
  };
  rel: {
    licencee?: string;
  };
  profitShare: number;
  geoCoords: {
    lat?: number;
    lng?: number;
    [key: string]: unknown;
  };
  totalMachines: number;
  onlineMachines: number;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  isLocalServer: boolean;
  hasSmib: boolean;
  noSMIBLocation: boolean;
};

export type LocationDateRange = {
  startDate: Date | undefined;
  endDate: Date | undefined;
};

import { ObjectId } from 'mongodb';

export type GamingLocation = {
  _id: ObjectId;
  name?: string;
  rel: { licencee: string };
  deletedAt?: Date | null;
  isLocalServer?: boolean;
  noSMIBLocation?: boolean;
};

export type LocationInfo = {
  _id?: string;
  name?: string;
  locationName?: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
  };
  phone?: string;
  createdAt?: string;
};

/**
 * Represents the API response for a location, supporting both legacy (_id) and new (location) identifiers.
 */
export type LocationApiResponse = {
  location?: string;
  _id?: string;
  locationName?: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  totalMachines: number;
  onlineMachines: number;
  noSMIBLocation?: boolean;
  isLocalServer?: boolean;
  [key: string]: unknown;
};

export type LocationCardData = {
  location: AggregatedLocation;
  onLocationClick: (id: string) => void;
  onEdit: (location: AggregatedLocation) => void;
  onDelete: (location: AggregatedLocation) => void;
  formatCurrency: (amount: number) => string;
};

export type LocationTableProps = {
  canManageLocations?: boolean; // If false, hide edit/delete buttons
  locations: AggregatedLocation[];
  onSort: (column: LocationSortOption) => void;
  sortOption: LocationSortOption;
  sortOrder: 'asc' | 'desc';
  onLocationClick: (id: string) => void;
  onAction: (action: 'edit' | 'delete', location: AggregatedLocation) => void;
  formatCurrency: (amount: number) => string;
  selectedFilters?: LocationFilter[]; // Add selectedFilters prop
};
