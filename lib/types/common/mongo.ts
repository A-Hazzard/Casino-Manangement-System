/**
 * MongoDB Types
 * Re-exports model document types from backend for frontend usage.
 */
import type {
  SasMeters,
  DateRangeFilter,
  MongoDBQueryValue,
  QueryFilter,
} from '@/shared/types/common';

// Re-export shared database types
export type { DateRangeFilter, MongoDBQueryValue, QueryFilter };

// Re-export model document types from backend
export type {
  MachineDocument,
  GamingLocationDocument,
  LicenceeDocument,
  MeterDocument,
  MemberDocument,
  UserDocument,
  CollectionDocument,
  CollectionReportDocument,
  MachineSessionDocument,
  MachineEventDocument,
  ActivityLogDocument,
  VaultShiftDocument,
  VaultTransactionDocument,
  VaultCollectionSessionDocument,
  VaultNotificationDocument,
  CashierShiftDocument,
  CashDeskPayoutDocument,
  PayoutDocument,
  FloatRequestDocument,
  FloatRequestsDocument,
  ShiftDocument,
  SoftCountDocument,
  DenominationDocument,
  InterLocationTransferDocument,
  MovementRequestDocument,
  SchedulerDocument,
  FeedbackDocument,
  FirmwareDocument,
  CountryDocument,
  AcceptedBillDocument,
} from '@/app/api/lib/types/models';

// Alias for backward compatibility
export type { GamingLocationDocument as LocationDocument } from '@/app/api/lib/types/models';

// Re-export SasMeters for convenience
export type { SasMeters };

// Transformed cabinet data returned by API
export type TransformedCabinet = {
  _id: string;
  locationId: string;
  locationName: string;
  assetNumber: string;
  serialNumber: string;
  custom?: Record<string, unknown>;
  relayId: string;
  smibBoard: string;
  smbId: string;
  lastActivity: Date | null;
  lastOnline: Date | null;
  game: string;
  installedGame: string;
  cabinetType: string;
  manufacturer?: string;
  assetStatus: string;
  status: string;
  gameType?: string;
  isCronosMachine?: boolean;
  moneyIn: number;
  moneyOut: number;
  jackpot: number;
  cancelledCredits: number;
  gross: number;
  netGross?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  metersData: {
    readAt: Date | null;
    movement: Record<string, unknown> | null;
  } | null;
  sasMeters: Record<string, unknown> | null;
  online?: boolean;
  includeJackpot?: boolean;
};
