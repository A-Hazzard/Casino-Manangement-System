/**
 * Licencee Mapping Utilities
 *
 * Utility functions for resolving licencee names to IDs.
 *
 * Features:
 * - Licencee name to ID resolution
 * - Handles special cases ("all" keyword)
 * - Static mapping for known licencees
 */

// ============================================================================
// Licencee Mapping Constants
// ============================================================================
/**
 * Licencee name to ID mapping.
 * This mapping is used to resolve licencee names to IDs for API calls.
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
 * Resolves a licencee name to its corresponding ID.
 *
 * @param licenceeName - The licencee name (e.g., "Cabana").
 * @returns The corresponding ID or the original string if no mapping found.
 */
export function resolveLicenceeId(
  licenceeName: string | undefined
): string | undefined {
  if (!licenceeName) return undefined;
  if (licenceeName === 'all') return licenceeName;
  return LICENCEE_MAPPING[licenceeName] || licenceeName;
}
