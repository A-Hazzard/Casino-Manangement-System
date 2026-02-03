/**
 * Vault System Configuration Constants
 *
 * Centralized configuration for vault management system including
 * notification polling, activity types, and audit actions.
 *
 * @module lib/constants/vault
 */

// ============================================================================
// Notification Configuration
// ============================================================================

/**
 * Notification polling interval in milliseconds
 * Adjust this value for faster testing (e.g., 5000 for 5 seconds)
 * Production default: 30000 (30 seconds)
 */
export const NOTIFICATION_POLL_INTERVAL = 30000;

/**
 * Cashier shift status polling interval in milliseconds
 * Used for auto-refreshing shift status on cashier dashboard
 * Production default: 30000 (30 seconds)
 */
export const CASHIER_SHIFT_POLL_INTERVAL = 30000;

/**
 * Notification types for vault management system
 */
export const NOTIFICATION_TYPES = {
  FLOAT_REQUEST: 'float_request',
  SHIFT_REVIEW: 'shift_review',
  SYSTEM_ALERT: 'system_alert',
  LOW_BALANCE: 'low_balance',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// ============================================================================
// Activity Log Types
// ============================================================================

/**
 * Comprehensive activity log types for audit trail
 */
export const ACTIVITY_LOG_TYPES = {
  // Float Request Activities
  FLOAT_REQUEST_CREATED: 'float_request_created',
  FLOAT_REQUEST_APPROVED: 'float_request_approved',
  FLOAT_REQUEST_DENIED: 'float_request_denied',
  FLOAT_REQUEST_EDITED: 'float_request_edited',
  FLOAT_REQUEST_VIEWED: 'float_request_viewed',

  // Shift Activities
  VAULT_SHIFT_OPENED: 'vault_shift_opened',
  VAULT_SHIFT_CLOSED: 'vault_shift_closed',
  CASHIER_SHIFT_OPENED: 'cashier_shift_opened',
  CASHIER_SHIFT_CLOSED: 'cashier_shift_closed',
  SHIFT_REVIEW_STARTED: 'shift_review_started',
  SHIFT_REVIEW_COMPLETED: 'shift_review_completed',

  // Payout Activities
  PAYOUT_PROCESSED: 'payout_processed',
  PAYOUT_FAILED: 'payout_failed',
  TICKET_VALIDATED: 'ticket_validated',
  HAND_PAY_PROCESSED: 'hand_pay_processed',

  // Vault Management Activities
  VAULT_RECONCILED: 'vault_reconciled',
  VAULT_INITIALIZED: 'vault_initialized',
  MACHINE_COLLECTION: 'machine_collection',
  SOFT_COUNT: 'soft_count',
  EXPENSE_RECORDED: 'expense_recorded',

  // System Activities
  NOTIFICATION_SENT: 'notification_sent',
  NOTIFICATION_READ: 'notification_read',
  NOTIFICATION_DISMISSED: 'notification_dismissed',
} as const;

export type ActivityLogType =
  (typeof ACTIVITY_LOG_TYPES)[keyof typeof ACTIVITY_LOG_TYPES];

// ============================================================================
// Audit Action Types
// ============================================================================

/**
 * Audit action types for tracking all vault operations
 */
export const AUDIT_ACTIONS = {
  CREATED: 'created',
  APPROVED: 'approved',
  DENIED: 'denied',
  EDITED: 'edited',
  VIEWED: 'viewed',
  FAILED: 'failed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// ============================================================================
// Notification Status
// ============================================================================

export const NOTIFICATION_STATUS = {
  UNREAD: 'unread',
  READ: 'read',
  ACTIONED: 'actioned',
  DISMISSED: 'dismissed',
  CANCELLED: 'cancelled',
} as const;

export type NotificationStatus =
  (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

// ============================================================================
// Validation Error Codes
// ============================================================================

export const VALIDATION_ERROR_CODES = {
  INSUFFICIENT_VAULT_BALANCE: 'insufficient_vault_balance',
  INSUFFICIENT_DENOMINATIONS: 'insufficient_denominations',
  INVALID_DENOMINATION: 'invalid_denomination',
  INVALID_AMOUNT: 'invalid_amount',
  NO_ACTIVE_VAULT_SHIFT: 'no_active_vault_shift',
  NO_ACTIVE_CASHIER_SHIFT: 'no_active_cashier_shift',
  CASHIER_SHIFTS_ACTIVE: 'cashier_shifts_active',
  UNAUTHORIZED: 'unauthorized',
} as const;

export type ValidationErrorCode =
  (typeof VALIDATION_ERROR_CODES)[keyof typeof VALIDATION_ERROR_CODES];

// ============================================================================
// Denomination Values
// ============================================================================

/**
 * Standard Trinidad & Tobago dollar denominations
 */
export const DENOMINATIONS = [100, 50, 20, 10, 5, 1] as const;

export type Denomination = (typeof DENOMINATIONS)[number];

// ============================================================================
// Activity Log Pagination
// ============================================================================

export const ACTIVITY_LOG_PAGE_SIZE = 50;
export const ACTIVITY_LOG_MAX_RESULTS = 1000;

// ============================================================================
// Notification Settings
// ============================================================================

export const NOTIFICATION_SETTINGS = {
  MAX_NOTIFICATIONS_DISPLAY: 50,
  NOTIFICATION_RETENTION_DAYS: 30,
  AUTO_DISMISS_ACTIONED_AFTER_HOURS: 24,
} as const;
