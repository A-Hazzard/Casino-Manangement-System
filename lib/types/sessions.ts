/**
 * Sessions Types
 * Types for gaming session data and machine events.
 *
 * Includes types for:
 * - Session details (games played, points, handle, wins)
 * - Pagination data for session lists
 * - Machine events with sequences and log levels
 * - Filter data for event types, events, and games
 */
export type Session = {
  _id: string;
  sessionId?: string;
  machineId?: string;
  machineName?: string;
  machineSerialNumber?: string;
  machineCustomName?: string;
  machineGame?: string;
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

