/**
 * Licencee Mapping Utilities
 *
 * Utility functions for converting between licencee names and ObjectIds.
 *
 * Features:
 * - Licencee name to ObjectId conversion
 * - ObjectId to licencee name conversion (reverse lookup)
 * - Handles special cases (ObjectId format, "all" keyword)
 * - Static mapping for known licencees
 */

// ============================================================================
// Licencee Mapping Constants
// ============================================================================
/**
 * Licencee name to ObjectId mapping.
 * This mapping is used to convert licencee names to ObjectIds for API calls.
 */
const LICENCEE_MAPPING: Record<string, string> = {
  TTG: '9a5db2cb29ffd2d962fd1d91',
  Cabana: 'c03b094083226f216b3fc39c',
  Barbados: '732b094083226f216b3fc11a',
  teset: '685169e73df5d0e8451ac3f9',
  test: '6851b3b6636e1e8021884f75',
};

// ============================================================================
// Licencee Conversion Functions
// ============================================================================
/**
 * Converts a licencee name to its corresponding ObjectId.
 *
 * @param licenceeName - The licencee name (e.g., "Cabana").
 * @returns The corresponding ObjectId or the original string if no mapping found.
 */
export function getLicenceeObjectId(
  licenceeName: string | undefined
): string | undefined {
  if (!licenceeName) return undefined;

  // If it's already an ObjectId (24 character hex string), return as is
  if (/^[0-9a-fA-F]{24}$/.test(licenceeName)) {
    return licenceeName;
  }

  // If it's "all", return as is (special case)
  if (licenceeName === 'all') {
    return licenceeName;
  }

  // Look up the mapping
  return LICENCEE_MAPPING[licenceeName] || licenceeName;
}

/**
 * Converts a licencee ObjectId to its corresponding name
 * @param licenceeObjectId - The licencee ObjectId
 * @returns The corresponding name or the original string if no mapping found
 */
export function getLicenceeName(
  licenceeObjectId: string | undefined
): string | undefined {
  if (!licenceeObjectId) return undefined;

  // If it's already a name (not an ObjectId), return as is
  if (!/^[0-9a-fA-F]{24}$/.test(licenceeObjectId)) {
    return licenceeObjectId;
  }

  // Reverse lookup in the mapping
  const entries = Object.entries(LICENCEE_MAPPING);
  const found = entries.find(([_, id]) => id === licenceeObjectId);

  return found ? found[0] : licenceeObjectId;
}
