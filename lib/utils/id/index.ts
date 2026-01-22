/**
 * ID Utilities
 *
 * Central export point for ID generation and resolution utilities.
 *
 * Features:
 * - ID generation (MongoDB ObjectId strings)
 * - ID resolution (string to ObjectId conversion)
 */

// ID generation
export { generateMongoId } from './generation';

// ID resolution
export { isIdValue, resolveIdToName } from './resolution';
