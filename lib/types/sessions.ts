/**
 * Sessions Types
 * Types for gaming session data and machine events.
 */

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
  duration: number; // in minutes
  status?: string; // e.g. "active", "completed"
  totalPlays: number;
  totalWin: number;
  totalLoss: number;
};

export type SessionsTableProps = {
  sessions: Session[];
  isLoading: boolean;
};

export type EventSequenceStep = {
  description: string;
  logLevel: 'ERROR' | 'WARN' | 'INFO';
  success: boolean;
};

export type MachineEvent = {
  _id: string;
  machine: string; // Machine ID
  currentSession?: string; // Session ID
  eventType: string; // "priority", "significant", "general"
  description: string;
  command?: string; // Event code
  gameName?: string;
  date: string; // ISO date string
  sequence?: EventSequenceStep[];
};

export type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number; // Renamed from totalSessions/totalEvents for generic use
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type SessionsApiResponse = {
  success: boolean;
  data: {
    sessions: Session[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalSessions: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
};

export type EventsApiResponse = {
  success: boolean;
  data: {
    events: MachineEvent[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalEvents: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    filters?: {
      eventTypes: string[];
      events: string[];
      games: string[];
    };
  };
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

// Alias MachineEvent as SessionEvent for now, or define specific if different
export type SessionEvent = MachineEvent & {
  timestamp: string; // Component uses timestamp, MachineEvent uses date. Keep both or mapped.
  type: string; // Component uses type, MachineEvent uses eventType.
  data?: any;
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
  // Optional props for backward compatibility or if needed
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  dateRange?: any;
  onDateRangeChange?: (range: any) => void;
  onClearFilters?: () => void;
};
