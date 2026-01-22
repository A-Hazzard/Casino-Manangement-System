/**
 * Currency Conversion Helper Functions
 *
 * Provides helper functions for converting financial data between different currencies
 * based on licensee settings. Currency conversion only applies when "All Licensee" is selected
 * and the licensee uses a currency other than USD.
 *
 * Features:
 * - Check if currency conversion should be applied based on licensee
 */

import {
  shouldApplyConversion,
} from './rates';

/**
 * Check if currency conversion should be applied based on licensee
 */
export function shouldApplyCurrencyConversion(
  licensee: string | null | undefined
): boolean {
  return shouldApplyConversion(licensee);
}

