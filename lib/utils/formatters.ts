/**
 * Format currency values for display.
 * @param value - The numeric value to format.
 * @returns Formatted currency string (e.g., $1,234.56).
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

/**
 * Format a date/time string.
 * @param dateTime - The date/time string to format.
 * @returns Formatted date/time string.
 */
export const formatTime = (
  dateTime: string | Date | null | undefined
): string => {
  if (!dateTime) {
    return "N/A";
  }

  try {
    const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime;
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch (error) {
    return "Invalid Date";
  }
};
