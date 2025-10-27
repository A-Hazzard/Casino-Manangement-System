/**
 * SMIB-specific type definitions for OTA updates, meter data, restart operations, and search
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: October 26th, 2025
 */

export type OTAStatus =
  | 'idle'
  | 'pending'
  | 'in-progress'
  | 'complete'
  | 'failed';

export type SmibOTAUpdate = {
  relayId: string;
  firmwareId: string;
  firmwareUrl: string;
  status: OTAStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
};

export type SmibMeterData = {
  relayId: string;
  coinIn: number;
  coinOut: number;
  gamesPlayed: number;
  gamesWon: number;
  jackpot: number;
  drop: number;
  totalCancelledCredits: number;
  denominations?: DenominationBreakdown;
  timestamp: Date;
};

export type DenominationBreakdown = {
  bills: { [denomination: string]: number };
  coins: { [denomination: string]: number };
};

export type SmibRestartStatus = {
  relayId: string;
  restartedAt: Date;
  confirmedAt?: Date;
  status: 'restarting' | 'confirmed' | 'failed';
};

export type SmibSearchResult = {
  relayId: string;
  machineId?: string;
  serialNumber?: string;
  game?: string;
  lastSeen: Date | null;
  activityType: 'heartbeat' | 'config' | 'meters' | 'restart' | 'unknown';
  matchScore: number; // 0-100 confidence
  isOnline?: boolean;
};

export type SmibMQTTActivity = {
  relayId: string;
  timestamp: Date;
  messageType: 'heartbeat' | 'config' | 'meters' | 'restart' | 'ota';
  payload: Record<string, unknown>;
};

export type LocationSmibConfig = {
  relayId: string;
  machineId: string;
  serialNumber?: string;
  isOnline: boolean;
  lastActivity?: Date;
  config?: {
    net?: Record<string, unknown>;
    mqtt?: Record<string, unknown>;
    coms?: Record<string, unknown>;
  };
};
