/**
 * Movement Utilities
 *
 * Central export point for movement calculation and request utilities.
 *
 * Features:
 * - Backend movement calculation logic
 * - Frontend movement calculation (matches backend)
 * - Movement request UI utilities (status colors, date formatting)
 */

// Backend movement calculation (for API routes)
export { calculateMovement } from './calculation';

// Machine movement calculation (for collection modals)
export { calculateMachineMovement } from './machine';

// Movement request utilities
export { formatMovementRequestDate, getStatusColor } from './requests';
