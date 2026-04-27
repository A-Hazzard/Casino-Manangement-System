import type { CabinetSortOption } from '@/lib/hooks/data';
import { GamingMachine } from '@/shared/types/entities';

export type CollectionData = {
  _id: string;
  timestamp: string | Date;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  locationReportId: string;
  machineId: string;
};

export type AccountingDetailsProps = {
  cabinet: GamingMachine;
  loading: boolean;
  activeMetricsTabContent: string;
  setActiveMetricsTabContent: (content: string) => void;
  onRefresh?: () => void;
};

export type CabinetsCabinetSearchFiltersProps = {
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;

  selectedLocation: string[];
  locations: { _id: string; name: string }[];
  onLocationChange: (locationIds: string[]) => void;
  showLocationFilter: boolean;

  selectedGameType: string[];
  gameTypes: string[];
  onGameTypeChange: (gameTypes: string[]) => void;

  selectedStatus: string;
  onStatusChange: (status: string) => void;

  selectedMembership: string;
  onMembershipChange: (membership: string) => void;

  selectedSmibStatus: string;
  onSmibStatusChange: (status: string) => void;

  sortOption: CabinetSortOption;
  sortOrder: 'asc' | 'desc';
  onSortChange: (option: CabinetSortOption, order: 'asc' | 'desc') => void;

  activeSection: string;
};

