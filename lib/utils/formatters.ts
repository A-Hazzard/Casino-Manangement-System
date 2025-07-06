/**
 * Format currency values for display.
 * @param value - The numeric value to format.
 * @returns Formatted currency string (e.g., $1,234).
 */
export const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return "$0.00";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };
  
  /**
   * Format large numbers with appropriate suffixes (K, M, B).
   * @param value - The numeric value to format.
   * @returns Formatted number string.
   */
  export const formatLargeNumber = (value: number): string => {
    if (value >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
    }
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return value.toString();
  };
  
  /**
   * Format a number as a percentage.
   * @param value - The numeric value to format.
   * @returns Formatted percentage string.
   */
  export const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  }; 