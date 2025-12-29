import type {
  Address,
  AggregatedLocation,
  GeoCoordinates,
  RelationshipInfo,
} from '@/shared/types';

export type { AggregatedLocation };

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

export type LocationSortOption =
  | 'locationName'
  | 'moneyIn'
  | 'moneyOut'
  | 'gross'
  | 'totalMachines'
  | 'onlineMachines';

// Filter types
export type LocationFilter =
  | 'NoSMIBLocation'
  | 'SMIBLocationsOnly'
  | 'LocalServersOnly'
  | 'MembershipOnly'
  | 'MissingCoordinates'
  | 'HasCoordinates'
  | ''
  | null;

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

export type LocationActionsState = {
  selectedLocation: Partial<AggregatedLocation>;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  openEditModal: (location: Partial<AggregatedLocation>) => void;
  openDeleteModal: (location: Partial<AggregatedLocation>) => void;
  closeEditModal: () => void;
  closeDeleteModal: () => void;
};

import { DateRangeFilter } from './mongo';

export type MeterMatchStage = {
  readAt: DateRangeFilter;
  'rel.licencee'?: string;
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
