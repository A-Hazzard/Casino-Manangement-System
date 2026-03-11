/**
 * Financial Utilities
 *
 * Central export point for financial calculation and display utilities.
 *
 * Features:
 * - Financial totals calculation (location, cabinet)
 * - Financial color coding utilities (money in, money out, gross)
 */

// Financial totals calculation
export {
  calculateLocationFinancialTotals,
  calculateCabinetFinancialTotals,
  type FinancialTotals,
} from './totals';

// Financial color coding
export {
  getMoneyInColorClass,
  getMoneyOutColorClass,
  getGrossColorClass,
  getFinancialColorClass,
  type PerformanceLevel,
  PERFORMANCE_CONFIG,
  getPerformanceLevel,
} from './colors';
