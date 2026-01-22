/**
 * Licensee Utilities
 *
 * Central export point for all licensee-related utilities.
 *
 * Features:
 * - Payment status management (payment.ts)
 * - Access control and UI visibility (access.ts)
 * - Name/ObjectId conversion (mapping.ts)
 */

// ============================================================================
// Payment Utilities
// ============================================================================
export {
  canChangePaymentStatus,
  formatLicenseeDate,
  getNext30Days,
  isLicenseePaid,
} from './payment';

// ============================================================================
// Access Utilities
// ============================================================================
export {
  shouldShowLicenseeFilter,
  shouldShowNoLicenseeMessage,
  shouldShowNoRoleMessage,
} from './access';

// ============================================================================
// Mapping Utilities
// ============================================================================
export { getLicenseeName, getLicenseeObjectId } from './mapping';
