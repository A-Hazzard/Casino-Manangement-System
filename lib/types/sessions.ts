export type Session = {
  _id: string;
  sessionId?: string;
  machineId?: string;
  machineName?: string;
  memberId?: string;
  memberName?: string;
  startTime?: string;
  endTime?: string;
  gamesPlayed?: number;
  points?: number;
  handle?: number;
  cancelledCredits?: number;
  jackpot?: number;
  won?: number;
  bet?: number;
  gamesWon?: number;
  duration?: number;
};

export type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalSessions: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type MachineEvent = {
  _id: string;
  eventType: string;
  description: string;
  command?: string;
  gameName?: string;
  date: string;
  sequence?: Array<{
    description: string;
    logLevel: string;
    success: boolean;
  }>;
};

export type FilterData = {
  eventTypes: string[];
  events: string[];
  games: string[];
};
