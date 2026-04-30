export type Session = {
  _id: string;
  sessionId: string;
  machineId: string;
  machineName: string;
  machineSerialNumber: string;
  machineCustomName?: string;
  machineGame?: string;
  locationName?: string;
  memberId: string;
  memberName?: string;
  startTime: string;
  endTime?: string;
  gamesPlayed: number;
  points: number;
  handle: number;
  cancelledCredits: number;
  jackpot: number;
  won: number;
  bet: number;
  gamesWon: number;
  duration: number;
  status?: string;
  totalPlays: number;
  totalWin: number;
  totalLoss: number;
};

export type SessionsTableProps = {
  sessions: Session[];
  isLoading: boolean;
  sortOption?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
};

export type EventSequenceStep = {
  description: string;
  logLevel: 'ERROR' | 'WARN' | 'INFO';
  success: boolean;
};

export type MachineEvent = {
  _id: string;
  machine: string;
  currentSession?: string;
  eventType: string;
  description: string;
  command?: string;
  gameName?: string;
  date: string;
  sequence?: EventSequenceStep[];
};

export type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type LocationMembershipSettings = {
  locationLimit?: number;
  freePlayAmount?: number;
  enablePoints: boolean;
  enableFreePlays: boolean;
  pointsRatioMethod?: string;
  pointMethodValue?: number;
  gamesPlayedRatio?: number;
  pointsMethodGameTypes?: string[];
  freePlayGameTypes?: string[];
  freePlayCreditsTimeout?: number;
};

export type SessionEvent = MachineEvent & {
  timestamp: string;
  type: string;
  data?: unknown;
};

export type SessionDetails = {
  _id: string;
  memberId: string;
  memberName?: string;
  memberFirstName?: string;
  memberLastName?: string;
  machineId: string;
  locationName?: string;
  locationMembershipSettings?: LocationMembershipSettings;
  startTime?: Date | string;
  endTime?: Date | string;
  status?: string;
  totalPlays?: number;
  totalWin?: number;
  totalLoss?: number;
};

export type SessionsEventsPageContentProps = {
  sessionId: string;
  machineId: string;
};

export type SessionsFilters = {
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

export type SessionsFiltersProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  setSortBy?: (field: string) => void;
  setSortOrder?: (order: 'asc' | 'desc') => void;
  onSortChange?: (field: string) => void;
  statusFilter?: string;
  dateRange?: unknown;
  onDateRangeChange?: (range: unknown) => void;
  onClearFilters?: () => void;
};

