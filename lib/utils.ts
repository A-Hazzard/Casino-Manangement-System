/**
 * Common Utilities
 *
 * Central export point for commonly used utility functions.
 * This file exists at the root of lib/ for convenience and to match
 * common Next.js patterns. The actual utility implementations are in lib/utils/.
 *
 * Why this file exists:
 * - Provides convenient short import paths (e.g., `@/lib/utils` instead of `@/lib/utils/formatting`)
 * - Matches common Next.js/React patterns where root-level utils.ts is expected
 * - Re-exports only the most frequently used utilities to avoid deep imports
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatCurrency } from './utils/formatting';

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * Commonly used throughout the codebase for conditional styling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Re-export formatCurrency for convenience
 * The actual implementation is in lib/utils/formatting.ts
 */
export { formatCurrency };

