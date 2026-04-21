/**
 * MongoDB Types
 * Re-exports model document types from shared definitions for frontend usage.
 */
import type {
  SasMeters,
  DateRangeFilter,
  MongoDBQueryValue,
  QueryFilter,
} from '@/shared/types/common';

// Re-export shared database types
export type { DateRangeFilter, MongoDBQueryValue, QueryFilter };

// Re-export model document types from shared models
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
} from '@/shared/types/models';

// Alias for backward compatibility
export type { GamingLocationDocument as LocationDocument } from '@/shared/types/models';

// Re-export SasMeters for convenience
export type { SasMeters };

// Re-export TransformedCabinet from entities
export type { TransformedCabinet } from '@/shared/types/entities';
