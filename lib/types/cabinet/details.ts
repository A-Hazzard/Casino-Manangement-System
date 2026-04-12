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

// Type for collection data from machine's embedded collectionMetersHistory
export type CollectionData = {
  _id: string;
  timestamp: string | Date;
  metersIn: number;
  metersOut: number;
  prevIn: number; // This maps to prevMetersIn from the embedded data
  prevOut: number; // This maps to prevMetersOut from the embedded data
  locationReportId: string;
  machineId: string;
};

// Props for AccountingDetails component
export type AccountingDetailsProps = {
  cabinet: GamingMachine;
  loading: boolean;
  activeMetricsTabContent: string;
  setActiveMetricsTabContent: (content: string) => void;
  onRefresh?: () => void;
};

// Props for CabinetsCabinetSearchFilters component
export type CabinetsCabinetSearchFiltersProps = {
  // Search state
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;

  // Location filter state
  selectedLocation: string[];
  locations: { _id: string; name: string }[];
  onLocationChange: (locationIds: string[]) => void;
  showLocationFilter: boolean;

  // Game type filter state
  selectedGameType: string[];
  gameTypes: string[];
  onGameTypeChange: (gameTypes: string[]) => void;

  // Status filter state
  selectedStatus: string;
  onStatusChange: (status: string) => void;

  // Membership filter state
  selectedMembership: string;
  onMembershipChange: (membership: string) => void;

  // Sort state
  sortOption: CabinetSortOption;
  sortOrder: 'asc' | 'desc';
  onSortChange: (option: CabinetSortOption, order: 'asc' | 'desc') => void;

  // Visibility
  activeSection: string;
};

