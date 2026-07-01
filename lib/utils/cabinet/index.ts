/**
 * Cabinet Utilities
 *
 * Central export point for cabinet data transformation, normalization, and validation utilities.
 *
 * Features:
 * - Cabinet data mapping and transformation
 * - Form value normalization
 * - RAM Clear validation
 */

// Cabinet data mapping
export { mapToCabinetProps } from './mapping';

// Form normalization
export { normalizeGameTypeValue, normalizeStatusValue } from './normalization';

// Edit modal comparison & payload
export {
  buildCabinetEditComparisonSnapshot,
  buildCabinetEditUpdatePayload,
  mergeComparisonBaseline,
  resolveCabinetMeterStrings,
  resolveOtherGameTypeFromCabinet,
} from './editComparisonSnapshot';
export type {
  CabinetEditComparisonSnapshot,
  CabinetEditFormLike,
} from './editComparisonSnapshot';

// RAM Clear validation
export { validateRamClearMeters } from './validation';
