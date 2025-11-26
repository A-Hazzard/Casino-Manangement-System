/**
 * Cabinet Details Types
 * Types for cabinet details page functionality including metrics, filters, and sorting.
 *
 * Includes types for:
 * - Metrics time filtering (day, week, month, year, custom)
 * - Bill validator data and statistics
 * - Cabinet sorting options and filters
 * - Cabinet details display data
 */
import type { CabinetSortOption } from '@/lib/hooks/data';
import { GamingMachine } from '@/shared/types/entities';

export type MetricsTimeFilter = {
  type: 'day' | 'week' | 'month' | 'year' | 'custom';
};

export type MetricsTabContent = {
  type: 'Range Metrics' | 'Day Metrics' | 'Week Metrics' | 'Month Metrics';
};

export type CabinetDetailsProps = {
  cabinet: GamingMachine | null;
  loading: boolean;
  error: string | null;
  metricsLoading: boolean;
  isOnline: boolean;
  isFilterChangeInProgress: boolean;
  setIsFilterChangeInProgress: (value: boolean) => void;
  fetchCabinetDetails: () => Promise<void>;
  updateMetricsData: (filter: MetricsTimeFilter) => Promise<void>;
  lastFilterChangeTimeRef: React.RefObject<number>;
};

export type TimeFilterButtonsProps = {
  activeMetricsFilter: MetricsTimeFilter;
  metricsLoading: boolean;
  isFilterChangeInProgress: boolean;
  lastFilterChangeTimeRef: React.RefObject<number>;
  setIsFilterChangeInProgress: (value: boolean) => void;
  setActiveMetricsFilter: (filter: MetricsTimeFilter) => void;
};

export type TimePeriodDropdownProps = {
  activeMetricsFilter: MetricsTimeFilter;
  metricsLoading: boolean;
  isFilterChangeInProgress: boolean;
  setIsFilterChangeInProgress: (value: boolean) => void;
  setActiveMetricsFilter: (filter: MetricsTimeFilter) => void;
  updateMetricsData: (filter: MetricsTimeFilter) => Promise<void>;
};

export type MetricsTabsProps = {
  activeMetricsTabContent: string;
  setActiveMetricsTabContent: (content: string) => void;
};

export type BackButtonProps = {
  locationName: string;
  handleBackToLocation: () => void;
  hasMounted?: boolean;
};

export type CabinetInfoHeaderProps = {
  cabinet: GamingMachine;
  locationName: string;
  openEditModal: (cabinetId: string) => void;
};

export type StatusIndicatorProps = {
  isOnline: boolean;
};

export type SmibConfigurationProps = {
  cabinet: GamingMachine;
};

// Props for AccountingDetails component
export type AccountingDetailsProps = {
  cabinet: GamingMachine;
  loading: boolean;
  activeMetricsTabContent: string;
  setActiveMetricsTabContent: (content: string) => void;
  disableCurrencyConversion?: boolean; // For specific cabinet pages
  onDataRefresh?: () => Promise<void>; // Optional callback to refresh parent data after auto-fix
};

// Props for CabinetSearchFilters component
export type CabinetSearchFiltersProps = {
  // Search state
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;

  // Location filter state
  selectedLocation: string;
  locations: { _id: string; name: string }[];
  onLocationChange: (locationId: string) => void;
  showLocationFilter: boolean;

  // Game type filter state
  selectedGameType: string;
  gameTypes: string[];
  onGameTypeChange: (gameType: string) => void;

  // Status filter state
  selectedStatus: string;
  onStatusChange: (status: string) => void;

  // Sort state
  sortOption: CabinetSortOption;
  sortOrder: 'asc' | 'desc';
  onSortChange: (option: CabinetSortOption, order: 'asc' | 'desc') => void;

  // Visibility
  activeSection: string;
};
