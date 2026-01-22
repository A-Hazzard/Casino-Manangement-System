/**
 * Vault API Types
 *
 * Type definitions for vault-related API operations.
 * These types are used in API routes and helpers for vault management.
 *
 * @module app/api/lib/types/vault
 */

/**
 * Denomination breakdown using string keys (as stored in database)
 * Keys represent denomination values: "20", "50", "100", "500", "1000", "2000", "5000"
 */
export type DenominationBreakdown = Record<string, number>;

/**
 * Float request document structure
 */
export type FloatRequestDocument = {
  _id: string;
  type: 'FLOAT_INCREASE' | 'FLOAT_DECREASE';
  cashierName?: string;
  cashierId: string;
  requestedDenom: DenominationBreakdown;
  requestedTotalAmount: number;
  requestedFloatAt?: Date;
  shiftId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONFIRMED' | 'ACKNOWLEDGED';
  totalAmount?: number;
  location?: string;
  locationId: string;
  approvedDenom?: DenominationBreakdown;
  approvedFloatAt?: Date;
  approvedTotalAmount?: number;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  acknowledgedByCashier?: boolean;
  acknowledgedByManager?: boolean;
  acknowledgedAt?: Date;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Create float request request body
 */
export type CreateFloatRequestRequest = {
  type: 'FLOAT_INCREASE' | 'FLOAT_DECREASE';
  requestedDenom: DenominationBreakdown;
  shiftId: string;
  locationId: string;
};

/**
 * Float request query parameters
 */
export type FloatRequestQueryParams = {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  cashierId?: string;
  locationId?: string;
  shiftId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/**
 * Update payout request body
 */
export type UpdatePayoutRequest = {
  amount?: number;
  notes?: string;
  status?: string;
};

/**
 * Payout document structure
 */
export type PayoutDocument = {
  _id: string;
  cashierId: string;
  cashierName?: string;
  amount: number;
  shiftId: string;
  locationId: string;
  status: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Shift document structure
 */
export type ShiftDocument = {
  _id: string;
  role: 'cashier' | 'vault-manager';
  userName?: string;
  userId: string;
  startDenom: DenominationBreakdown;
  endDenom?: DenominationBreakdown;
  startedShiftAt: Date;
  closedShiftAt?: Date;
  location?: string;
  locationId: string;
  status: 'Open' | 'Close';
  notes?: string;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
