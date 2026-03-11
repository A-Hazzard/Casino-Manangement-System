/**
 * Currency Conversion Helper Functions
 *
 * Provides helper functions for converting financial data between different currencies
 * based on licencee settings. Currency conversion only applies when "All Licencee" is selected
 * and the licencee uses a currency other than USD.
 *
 * Features:
 * - Check if currency conversion should be applied based on licencee
 */

import {
  shouldApplyConversion,
} from './rates';

/**
 * Check if currency conversion should be applied based on licencee
 */
export function shouldApplyCurrencyConversion(
  licencee: string | null | undefined
): boolean {
  return shouldApplyConversion(licencee);
}

