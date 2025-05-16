/**
 * Formats a number as currency with dollar sign and commas
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a number with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Format a date string to readable format
 */
export function formatDate(dateString: string | Date | undefined): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
}

/**
 * Format last online date as relative time
 */
export function formatLastOnline(dateString?: string): string {
  if (!dateString) return "Never online";
  try {
    const msDiff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    if (days < 1) {
      const hours = Math.floor(msDiff / (1000 * 60 * 60));
      if (hours < 1) {
        const minutes = Math.floor(msDiff / (1000 * 60));
        if (minutes < 1) return "Just now";
        return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
      }
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30)
      return `${Math.floor(days / 7)} week${
        Math.floor(days / 7) !== 1 ? "s" : ""
      } ago`;
    if (days < 365)
      return `${Math.floor(days / 30)} month${
        Math.floor(days / 30) !== 1 ? "s" : ""
      } ago`;
    return `${Math.floor(days / 365)} year${
      Math.floor(days / 365) !== 1 ? "s" : ""
    } ago`;
  } catch (e) {
    console.error("Error formatting last online date:", e);
    return "Unknown";
  }
}
