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

// Props for AccountingDetails component
export type AccountingDetailsProps = {
  cabinet: GamingMachine;
  loading: boolean;
  activeMetricsTabContent: string;
  setActiveMetricsTabContent: (content: string) => void;
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
