// UI Component types
import type { MachineMovementRecord } from '@/lib/types/reports';
import type { AggregatedLocation } from '@/shared/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ExtendedCabinetDetail } from '@/lib/types/pages';

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

export type UploadSmibDataModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
};

// Modal Props Types
export type NewLocationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export type EditLocationModalProps = {
  onLocationUpdated?: () => void;
};

export type DeleteLocationModalProps = {
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
  showSearch?: boolean;
};

export type NewMovementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MachineMovementRecord) => void;
  onRefresh?: () => void;
  locations?: { _id: string; name: string }[];
};

export type ReportsLocationsRevenueTableProps = {
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

// SyncButtonProps remains here as it is truly reusable
export type SyncButtonProps = {
  onClick: () => void;
  isSyncing?: boolean;
  className?: string;
  label?: string;
  iconOnly?: boolean;
  variant?: 'sync' | 'refresh';
};

export type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
};

export type LocationsCabinetGridProps = {
  filteredCabinets: ExtendedCabinetDetail[];
  currentPage: number;
  itemsPerPage: number;
  router: AppRouterInstance;
  sortOption?:
    | 'assetNumber'
    | 'locationName'
    | 'moneyIn'
    | 'moneyOut'
    | 'jackpot'
    | 'gross'
    | 'cancelledCredits'
    | 'game'
    | 'smbId'
    | 'serialNumber'
    | 'lastOnline';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (
    option:
      | 'assetNumber'
      | 'locationName'
      | 'moneyIn'
      | 'moneyOut'
      | 'jackpot'
      | 'gross'
      | 'cancelledCredits'
      | 'game'
      | 'smbId'
      | 'serialNumber'
      | 'lastOnline',
    order: 'asc' | 'desc'
  ) => void;
};

// Collector schedule types
export type CollectorSchedule = {
  _id: string;
  collectorName: string;
  collector?: string; // Collector name/ID
  locationName: string;
  locationId: string;
  location?: string; // Location name/ID
  scheduledDate: string;
  startTime: string | Date;
  endTime: string | Date;
  status: 'pending' | 'completed' | 'cancelled' | 'scheduled' | 'in-progress';
  licencee?: string;
  createdAt: string;
  updatedAt: string;
};

