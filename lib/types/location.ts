export type Location = {
  _id: string;
  locationName: string;
  name?: string;
  country: string;
  address?: Address;
  rel?: RelationshipInfo;
  profitShare: number;
  isLocalServer?: boolean;
  geoCoords?: GeoCoordinates;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  moneyIn?: number;
  moneyOut?: number;
  gross?: number;
  totalMachines?: number;
  onlineMachines?: number;
  hasSmib?: boolean;
  noSMIBLocation?: boolean;
};

export type UpdateLocationData = {
  name?: string;
  country?: string;
  address?: Partial<Address>;
  rel?: Partial<RelationshipInfo>;
  profitShare?: number;
  geoCoords?: Partial<GeoCoordinates>;
  isLocalServer?: boolean;
  billValidatorOptions?: Record<string, unknown>;
  updatedAt?: Date;
  [key: string]: unknown;
};

export type LocationSelectItem = {
  _id: string;
  name: string;
};

export type LocationTableItem = {
  location: string;
  locationName: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  totalMachines: number;
  onlineMachines: number;
  isSmibLocation?: boolean;
  isLocalServer?: boolean;
  online?: boolean;
};

export type LocationSortOption =
  | "locationName"
  | "moneyIn"
  | "moneyOut"
  | "gross";

export type LocationFilter =
  | "NoSMIBLocation"
  | "SMIBLocationsOnly"
  | "LocalServersOnly"
  | ""
  | null;

export type LocationTableProps = {
  locations: LocationTableItem[];
  sortOption: LocationSortOption;
  sortOrder: "asc" | "desc";
  onColumnSort: (_column: LocationSortOption) => void;
  onEdit: (_location: LocationTableItem) => void;
  onDelete: (_location: LocationTableItem) => void;
};

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
};

export type LocationActionsState = {
  selectedLocation: Partial<Location>;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  openEditModal: (_location: Partial<Location>) => void;
  openDeleteModal: (_location: Partial<Location>) => void;
  closeEditModal: () => void;
  closeDeleteModal: () => void;
};

import {
  ArrayFilter,
  DateRangeFilter,
  MongoDBQueryValue,
  RegexFilter,
} from "./mongo";

export type LocationMatchStage = {
  name?: RegexFilter;
  "rel.licencee"?: string;
  deletedAt?: ArrayFilter;
  [key: string]: MongoDBQueryValue | undefined;
};

export type MetricsMatchStage = {
  "rel.licencee"?: string;
  timePeriod?: string;
  createdAt?: DateRangeFilter;
  [key: string]: MongoDBQueryValue | undefined;
};

export type MeterMatchStage = {
  createdAt: DateRangeFilter;
  "rel.licencee"?: string;
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
  startDate: Date;
  endDate: Date;
};

export type AggregatedLocation = {
  location: string;
  locationName: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  totalMachines: number;
  onlineMachines: number;
  isLocalServer: boolean;
  noSMIBLocation: boolean;
  hasSmib: boolean;
};

import { ObjectId } from "mongodb";

export type GamingLocation = {
  _id: ObjectId;
  name?: string;
  rel: { licencee: string };
  deletedAt?: Date | null;
  isLocalServer?: boolean;
  noSMIBLocation?: boolean;
};

export type Address = {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  [key: string]: string | undefined;
};

export type RelationshipInfo = {
  licencee?: string;
  [key: string]: string | undefined;
};

export type GeoCoordinates = {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: number | undefined;
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
