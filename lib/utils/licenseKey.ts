/**
 * License Key Utilities
 *
 * Utility functions for generating unique license keys.
 *
 * Features:
 * - License key generation
 * - Unique key validation
 * - Database uniqueness checking
 */

import { Licencee } from '@/app/api/lib/models/licencee';

// ============================================================================
// License Key Generation Functions
// ============================================================================
/**
 * Generate a unique license key
 */
export function generateLicenseKey(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `LIC-${timestamp}-${randomStr}`.toUpperCase();
}

/**
 * Generate a unique license key with database validation
 */
export async function generateUniqueLicenseKey(): Promise<string> {
  let licenseKey: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    licenseKey = generateLicenseKey();
    const existing = await Licencee.findOne({ licenseKey });
    if (!existing) {
      isUnique = true;
      return licenseKey;
    }
    attempts++;
  }

  // Fallback with UUID-like structure if all attempts fail
  const fallbackKey = `LIC-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 15)}`.toUpperCase();
  return fallbackKey;
}
