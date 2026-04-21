/**
 * Financial Color Utilities
 *
 * Utility functions for color coding financial numbers.
 *
 * Features:
 * - Color coding for positive/negative/zero values
 * - Custom color support
 * - CSS class generation
 * - Green for positive, red for negative, gray for zero/null
 * - Specific rules for Money In, Money Out, and Gross
 */

// ============================================================================
// Color Class Functions
// ============================================================================

/**
 * Get color class for Money In
 * - Green if >= 1
 * - No color otherwise
 * @param value - The Money In value
 * @returns CSS class for text color
 */
export function getMoneyInColorClass(value?: number | null | undefined): string {
  if (value === 0 || value === null || value === undefined || isNaN(value)) {
    return ''; // No color for zero values
  }
  return 'text-green-600'; // Green for positive values
}

/**
 * Get color class for Money Out
 * - Blue if less than Money In (acceptable/neutral state)
 * - Red if more than Money In (warning state)
 * @param moneyOut - The Money Out value
 * @param moneyIn - The Money In value for comparison
 * @returns CSS class for text color
 */
export function getMoneyOutColorClass(
  moneyOut: number | null | undefined,
  moneyIn: number | null | undefined
): string {
  if (
    moneyOut === null ||
    moneyOut === undefined ||
    isNaN(moneyOut) ||
    moneyIn === null ||
    moneyIn === undefined ||
    isNaN(moneyIn)
  ) {
    return ''; // No color for null/undefined values
  }

  // If Money Out is 0, don't apply color regardless of Money In
  if (moneyOut === 0) {
    return '';
  }

  // Blue if Money Out is less than Money In (acceptable), red if more (warning)
  return moneyOut < moneyIn ? 'text-blue-600' : 'text-red-600';
}

/**
 * Get color class for Gross
 * - Green if >= 1
 * - Red if <= -1
 * - No color otherwise
 * @param value - The Gross value
 * @returns CSS class for text color
 */
export function getGrossColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  if (value >= 1) {
    return 'text-green-600'; // Green for positive values >= 1
  } else if (value <= -1) {
    return 'text-red-600'; // Red for negative values <= -1
  } else {
    return ''; // No color for zero values or small variations
  }
}

/**
 * Get the appropriate text color class for a financial value
 * @param value - The financial value to color code
 * @returns CSS class for text color
 */
export function getFinancialColorClass(
  value: number | null | undefined
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  if (value >= 1) {
    return 'text-green-600'; // Green for positive values >= 1
  } else if (value <= -1) {
    return 'text-red-600'; // Red for negative values <= -1
  } else {
    return ''; // No color for zero values or small variations
  }
}
// ============================================================================
// Performance Definitions
// ============================================================================

export type PerformanceLevel = 'excellent' | 'good' | 'average' | 'poor';

/**
 * Performance configuration with labels, colors, and descriptions.
 * Based on Revenue Performance (%) = (Gross / Money In) * 100
 */
export const PERFORMANCE_CONFIG: Record<
  PerformanceLevel,
  {
    label: string;
    description: string;
    minPct: number;
    dotColor: string;
    textColor: string;
  }
> = {
  excellent: {
    label: 'Excellent',
    description: 'Revenue Performance > 20%',
    minPct: 20,
    dotColor: 'bg-green-500',
    textColor: 'text-green-600',
  },
  good: {
    label: 'Good',
    description: 'Revenue Performance 15% - 20%',
    minPct: 15,
    dotColor: 'bg-blue-500',
    textColor: 'text-blue-600',
  },
  average: {
    label: 'Average',
    description: 'Revenue Performance 10% - 15%',
    minPct: 10,
    dotColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
  },
  poor: {
    label: 'Poor',
    description: 'Revenue Performance < 10%',
    minPct: 0,
    dotColor: 'bg-red-500',
    textColor: 'text-red-600',
  },
};

/**
 * Calculate performance level based on gross and money in
 */
export function getPerformanceLevel(
  gross: number,
  moneyIn: number
): PerformanceLevel {
  if (!moneyIn || moneyIn <= 0) return 'poor';
  const pct = (gross / moneyIn) * 100;

  if (pct > PERFORMANCE_CONFIG.excellent.minPct) return 'excellent';
  if (pct >= PERFORMANCE_CONFIG.good.minPct) return 'good';
  if (pct >= PERFORMANCE_CONFIG.average.minPct) return 'average';
  return 'poor';
}

