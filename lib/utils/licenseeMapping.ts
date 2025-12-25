/**
 * Licensee Mapping Utilities
 *
 * Utility functions for converting between licensee names and ObjectIds.
 *
 * Features:
 * - Licensee name to ObjectId conversion
 * - ObjectId to licensee name conversion (reverse lookup)
 * - Handles special cases (ObjectId format, "all" keyword)
 * - Static mapping for known licensees
 */

// ============================================================================
// Licensee Mapping Constants
// ============================================================================
/**
 * Licensee name to ObjectId mapping.
 * This mapping is used to convert licensee names to ObjectIds for API calls.
 */
export const LICENSEE_MAPPING: Record<string, string> = {
  TTG: '9a5db2cb29ffd2d962fd1d91',
  Cabana: 'c03b094083226f216b3fc39c',
  Barbados: '732b094083226f216b3fc11a',
  teset: '685169e73df5d0e8451ac3f9',
  test: '6851b3b6636e1e8021884f75',
};

// ============================================================================
// Licensee Conversion Functions
// ============================================================================
/**
 * Converts a licensee name to its corresponding ObjectId.
 *
 * @param licenseeName - The licensee name (e.g., "Cabana").
 * @returns The corresponding ObjectId or the original string if no mapping found.
 */
export function getLicenseeObjectId(
  licenseeName: string | undefined
): string | undefined {
  if (!licenseeName) return undefined;

  // If it's already an ObjectId (24 character hex string), return as is
  if (/^[0-9a-fA-F]{24}$/.test(licenseeName)) {
    return licenseeName;
  }

  // If it's "all", return as is (special case)
  if (licenseeName === 'all') {
    return licenseeName;
  }

  // Look up the mapping
  return LICENSEE_MAPPING[licenseeName] || licenseeName;
}

/**
 * Converts a licensee ObjectId to its corresponding name
 * @param licenseeObjectId - The licensee ObjectId
 * @returns The corresponding name or the original string if no mapping found
 */
export function getLicenseeName(
  licenseeObjectId: string | undefined
): string | undefined {
  if (!licenseeObjectId) return undefined;

  // If it's already a name (not a 24 character hex string), return as is
  if (!/^[0-9a-fA-F]{24}$/.test(licenseeObjectId)) {
    return licenseeObjectId;
  }

  // Look up the mapping (reverse lookup)
  const entry = Object.entries(LICENSEE_MAPPING).find(
    ([_, objectId]) => objectId === licenseeObjectId
  );
  return entry ? entry[0] : licenseeObjectId;
}
