// UI Component types
import type { ExtendedCabinetDetail } from "./pages";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { MachineMovementRecord } from "@/lib/types/reports";
import type { AggregatedLocation } from "@/lib/types/location";
import type { ActivityLog } from "@/app/api/lib/types/activityLog";

export type SmibConfig = {
  firmwareVersion: string;
  // Add other SMIB config properties as needed
};

export type CollectorSchedule = {
  id: string;
  _id?: string;
  collectorName: string;
  collector?: string;
  locationName: string;
  location?: string;
  startTime: string;
  endTime: string;
  status:
    | "pending"
    | "completed"
    | "canceled"
    | "scheduled"
    | "in-progress"
    | "cancelled";
  notes?: string;
};

export type CustomizedLabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index: number;
};

export type RGBAColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type Blob = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: RGBAColor;
};

export type ChipProps = {
  label: string;
  onRemove?: () => void;
  className?: string;
};

export type NoDataMessageProps = {
  message?: string;
  className?: string;
};

export type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  message: string;
};

export type UploadSmibDataModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Reports component types
export type TemplateData = {
  id: number;
  name: string;
  category: string;
  rating: number;
  uses: number;
  description: string;
  lastUpdated: string;
  author: string;
  sections: string[];
  sampleData: {
    title: string;
    subtitle: string;
    headers: string[];
    data: string[][];
  };
};

export type Option = Record<"value" | "label", string>;

// Modal Props Types
export type NewLocationModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export type EditLocationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLocationUpdated?: () => void;
};

export type DeleteLocationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
};

export type SMIBFirmwareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cabinetId?: string;
  currentFirmware?: string;
  onUploadComplete?: () => void;
};

export type LocationMultiSelectProps = {
  locations: Array<{
    id: string;
    name: string;
    sasEnabled?: boolean;
  }>;
  selectedLocations: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  className?: string;
};

export type NewMovementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MachineMovementRecord) => void;
  locations?: { _id: string; name: string }[];
};

export type LocationSelectorProps = {
  onLocationSelect: (locationIds: string[]) => void;
  selectedLocations: string[];
  maxSelections?: number;
  placeholder?: string;
};

export type TopMachine = {
  id: string;
  _id?: string;
  machineId?: string;
  name: string;
  game?: string;
  location: string;
  locationName?: string;
  locationId?: string;
  performance: number;
  revenue: number;
  gamesPlayed: number;
  handle?: number;
  winLoss?: number;
  jackpot?: number;
  actualHold?: number;
  manufacturer?: string;
  avgWagerPerGame?: number;
  moneyIn?: number;
  moneyOut?: number;
  gross?: number;
  holdPercentage?: number;
  lastActivity?: Date;
  isOnline?: boolean;
};

export type TopMachinesTableProps = {
  machines: TopMachine[];
  loading?: boolean;
  onMachineClick?: (machineId: string) => void;
  className?: string;
  timePeriod: string;
  locationIds?: string[];
  licencee?: string;
  limit?: number;
};

export type RevenueAnalysisTableProps = {
  locations: AggregatedLocation[];
  loading?: boolean;
  error?: string | null;
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onLocationClick?: (location: AggregatedLocation) => void;
  timePeriod?: string;
  locationIds?: string[];
  licencee?: string;
  className?: string;
};

export type LocationPaginationSkeletonProps = {
  count?: number;
  className?: string;
};

export type LocationData = {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  performance: number;
  revenue: number;
};

export type LocationMapProps = {
  locations: LocationData[];
  selectedLocations?: string[];
  onLocationSelect?: (locationIds: string[]) => void;
  onLocationClick?: (location: LocationData) => void;
  center?: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  compact?: boolean;
  className?: string;
  height?: string;
  showMetrics?: boolean;
  selectedLocationId?: string;
  // Optional pre-aggregated metrics to avoid duplicate API calls
  aggregates?: Record<string, unknown>[];
  // Two-phase loading props
  gamingLocations?: Record<string, unknown>[]; // Basic location data for immediate display
  gamingLocationsLoading?: boolean; // Loading state for gaming locations
  financialDataLoading?: boolean; // Loading state for financial data
};

// Chart Props Types
export type WinLossChartData = {
  time: string;
  winLoss: number;
};

export type WinLossChartProps = {
  timePeriod: string;
  locationIds?: string[];
  licencee?: string;
  className?: string;
};

export type PlaysChartData = {
  time: string;
  gamesPlayed: number;
};

export type PlaysChartProps = {
  timePeriod: string;
  locationIds?: string[];
  licencee?: string;
  className?: string;
};

export type JackpotChartData = {
  time: string;
  jackpot: number;
};

export type JackpotChartProps = {
  timePeriod: string;
  locationIds?: string[];
  licencee?: string;
  className?: string;
};

export type HandleChartData = {
  time: string;
  handle: number;
};

export type HandleChartProps = {
  timePeriod: string;
  locationIds?: string[];
  licencee?: string;
  className?: string;
};

// Collection Report Types
export type CollectionReportFiltersProps = {
  locations: Array<{ _id: string; name: string }>;
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (checked: boolean) => void;
  isSearching: boolean;
};

// Administration Types
export type CountryDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  country: {
    _id: string;
    name: string;
    alpha2: string;
    alpha3: string;
    isoNumeric: string;
  } | null;
};

export type DeleteCountryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  country: {
    _id: string;
    name: string;
  } | null;
  onDelete: () => void;
};

export type EditCountryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  country: {
    _id: string;
    name: string;
    alpha2: string;
    alpha3: string;
    isoNumeric: string;
  } | null;
};

export type AddCountryModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export type PaginationLinkProps = React.ComponentProps<"a"> & {
  isActive?: boolean;
};

export type SyncButtonProps = {
  onClick: () => void;
  isSyncing?: boolean;
  className?: string;
  label?: string;
  iconOnly?: boolean;
  variant?: "sync" | "refresh";
};

export type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
};

export type CabinetGridProps = {
  filteredCabinets: ExtendedCabinetDetail[];
  currentPage: number;
  itemsPerPage: number;
  router: AppRouterInstance;
};

export type ActivityLogModalProps = {
  open: boolean;
  onClose: () => void;
};

export type ActivityGroup = {
  range: string;
  entries: ProcessedActivityEntry[];
};

export type ProcessedActivityEntry = {
  id: string;
  time: string;
  type: string;
  icon: React.ReactNode;
  iconBg: string;
  user: {
    email: string;
    role: string;
  };
  description: React.ReactNode;
  originalActivity: ActivityLog;
};
