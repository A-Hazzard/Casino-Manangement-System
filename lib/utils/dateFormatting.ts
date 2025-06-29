import { format } from "date-fns";

/**
 * Formats a date for display, handling various input types
 * @param date - Date object, string, or undefined
 * @returns Formatted date string or fallback
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Gets a date that is 30 days from today
 * @returns Date object set to 30 days from now
 */
export function getNext30DaysDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

/**
 * Formats a date value with smart handling of different formats
 * @param value - The value to format (could be string, Date, or other)
 * @param fieldName - Optional field name for context-specific formatting
 * @returns Formatted string representation
 */
export function formatValue(value: unknown, fieldName?: string): string {
  if (value === null || value === undefined) return "Not set";
  if (typeof value === "string" && value.trim() === "") return "Empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  // Check if the value is a date string (ISO format or Date object)
  if (typeof value === "string" || value instanceof Date) {
    const dateValue = typeof value === "string" ? value : value.toISOString();

    // Check if it's a valid ISO date string with time
    const isoDateTimeRegex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (isoDateTimeRegex.test(dateValue)) {
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          // For date-only fields, show just the date
          const dateOnlyFields = [
            "startDate",
            "expiryDate",
            "endDate",
            "dateOfBirth",
          ];
          if (fieldName && dateOnlyFields.includes(fieldName)) {
            return format(date, "MMMM d, yyyy");
          }
          // For timestamp fields, show date and time
          return format(date, "MMMM d, yyyy 'at' h:mm a");
        }
      } catch {
        // Fall through to handle as regular string
      }
    }

    // Check if it's a simple date string (YYYY-MM-DD)
    const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof value === "string" && simpleDateRegex.test(value)) {
      try {
        const date = new Date(value + "T00:00:00");
        if (!isNaN(date.getTime())) {
          // Format as readable date only
          return format(date, "MMMM d, yyyy");
        }
      } catch {
        // Fall through to handle as regular string
      }
    }

    // Check if it's a timestamp number (milliseconds since epoch)
    if (typeof value === "string" && /^\d{13}$/.test(value)) {
      try {
        const date = new Date(parseInt(value));
        if (!isNaN(date.getTime())) {
          return format(date, "MMMM d, yyyy 'at' h:mm a");
        }
      } catch {
        // Fall through to handle as regular string
      }
    }
  }

  // For arrays, show count
  if (Array.isArray(value)) {
    return `${value.length} items`;
  }

  // For objects, show [Object]
  if (typeof value === "object" && value !== null) {
    return "[Object]";
  }

  // Default: convert to string
  return String(value);
} 