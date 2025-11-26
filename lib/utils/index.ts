/**
 * Utils Barrel File
 *
 * Central export point for commonly used utility functions.
 *
 * Features:
 * - Re-exports currency formatter
 * - Provides basic number formatting helper
 */

import formatCurrency from './currency';

export { formatCurrency };

/**
 * Format a number with commas for thousands separators.
 * @param value - The numeric value or numeric string.
 * @returns Formatted number string.
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}
