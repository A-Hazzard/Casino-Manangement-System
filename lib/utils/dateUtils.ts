/**
 * Formats a date string to a readable format
 * @param dateString ISO date string
 * @returns Formatted date string
 */
export function formatDateString(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }

    // Format: Oct 2, 2023 14:30
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

/**
 * Formats a date string to show only the date part
 * @param dateString ISO date string
 * @returns Formatted date string (date only)
 */
export function formatDateOnly(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }

    // Format: Oct 2, 2023
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

/**
 * Formats a date string to show only the time part
 * @param dateString ISO date string
 * @returns Formatted time string
 */
export function formatTimeOnly(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }

    // Format: 14:30
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return dateString;
  }
}
