/**
 * Licencee Utilities
 *
 * Central export point for all licencee-related utilities.
 *
 * Features:
 * - Payment status management (payment.ts)
 * - Access control and UI visibility (access.ts)
 * - Name/ID resolution (mapping.ts)
 */

// ============================================================================
// Payment Utilities
// ============================================================================
export {
  canChangePaymentStatus,
  formatLicenceeDate,
  getNext30Days,
  isLicenceePaid,
} from './payment';

// ============================================================================
// Access Utilities
// ============================================================================
export {
  shouldShowLicenceeFilter,
  shouldShowNoLicenceeMessage,
  shouldShowNoRoleMessage,
} from './access';

// ============================================================================
// Mapping Utilities
// ============================================================================
export { resolveLicenceeId } from './mapping';
