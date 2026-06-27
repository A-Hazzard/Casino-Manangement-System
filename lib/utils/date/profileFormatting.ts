/**
 * Profile Formatting Utilities
 *
 * Utility functions for formatting profile objects with nested
 * address and identification structures into human-readable strings.
 *
 * Features:
 * - Profile object formatting with nested address/identification
 * - Human-readable output for display purposes
 */

// ============================================================================
// Types
// ============================================================================
export type ProfileField = {
  firstName?: unknown;
  lastName?: unknown;
  middleName?: unknown;
  gender?: unknown;
  email?: unknown;
  address?: {
    street?: unknown;
    town?: unknown;
    country?: unknown;
    [key: string]: unknown;
  };
  identification?: {
    idType?: unknown;
    idNumber?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

// ============================================================================
// Profile Formatting
// ============================================================================

/**
 * Formats a profile object with nested address and identification
 * @param profile - The profile object to format
 * @returns Formatted string representation
 */
export function formatProfileObject(profile: ProfileField): string {
  if (!profile) {
    console.error('[formatProfileObject] profile is required');
    return 'Empty profile';
  }
  const parts: string[] = [];

  if (profile.firstName && profile.firstName !== '')
    parts.push(`First: ${profile.firstName}`);
  if (profile.lastName && profile.lastName !== '')
    parts.push(`Last: ${profile.lastName}`);
  if (profile.middleName && profile.middleName !== '')
    parts.push(`Middle: ${profile.middleName}`);
  if (profile.gender && profile.gender !== '')
    parts.push(`Gender: ${profile.gender}`);
  if (profile.email && profile.email !== '')
    parts.push(`Email: ${profile.email}`);

  if (profile.address && typeof profile.address === 'object') {
    const address = profile.address;
    const addressParts: string[] = [];
    if (address.street && address.street !== '')
      addressParts.push(`Street: ${address.street}`);
    if (address.town && address.town !== '')
      addressParts.push(`Town: ${address.town}`);
    if (address.country && address.country !== '')
      addressParts.push(`Country: ${address.country}`);
    if (addressParts.length > 0)
      parts.push(`Address: ${addressParts.join(', ')}`);
  }

  if (profile.identification && typeof profile.identification === 'object') {
    const identification = profile.identification;
    const idParts: string[] = [];
    if (identification.idType && identification.idType !== '')
      idParts.push(`Type: ${identification.idType}`);
    if (identification.idNumber && identification.idNumber !== '')
      idParts.push(`Number: ${identification.idNumber}`);
    if (idParts.length > 0) parts.push(`ID: ${idParts.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('; ') : 'Empty profile';
}
