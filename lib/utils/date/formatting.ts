/**
 * Date Formatting Utilities
 *
 * Utility functions for formatting dates, times, and related objects.
 *
 * Features:
 * - Date formatting with various formats
 * - Profile object formatting
 * - Resource permissions formatting
 * - Full date formatting with weekday and ordinal
 * - ISO date parsing and validation
 */

import { format, isValid, parseISO } from 'date-fns';

// ============================================================================
// Object Formatting Functions
// ============================================================================
/**
 * Formats a profile object with nested address and identification
 * @param profile - The profile object to format
 * @returns Formatted string representation
 */
function formatProfileObject(profile: Record<string, unknown>): string {
  const parts = [];

  // Handle basic profile fields
  if (profile.firstName && profile.firstName !== '')
    parts.push(`First: ${profile.firstName}`);
  if (profile.lastName && profile.lastName !== '')
    parts.push(`Last: ${profile.lastName}`);
  if (profile.middleName && profile.middleName !== '')
    parts.push(`Middle: ${profile.middleName}`);
  if (profile.gender && profile.gender !== '')
    parts.push(`Gender: ${profile.gender}`);
  if (profile.email && profile.email !== '')
    parts.push(`Email: ${profile.email}`);

  // Handle nested address object
  if (profile.address && typeof profile.address === 'object') {
    const address = profile.address as Record<string, unknown>;
    const addressParts = [];
    if (address.street && address.street !== '')
      addressParts.push(`Street: ${address.street}`);
    if (address.town && address.town !== '')
      addressParts.push(`Town: ${address.town}`);
    if (address.country && address.country !== '')
      addressParts.push(`Country: ${address.country}`);
    if (addressParts.length > 0)
      parts.push(`Address: ${addressParts.join(', ')}`);
  }

  // Handle nested identification object
  if (profile.identification && typeof profile.identification === 'object') {
    const identification = profile.identification as Record<string, unknown>;
    const idParts = [];
    if (identification.idType && identification.idType !== '')
      idParts.push(`Type: ${identification.idType}`);
    if (identification.idNumber && identification.idNumber !== '')
      idParts.push(`Number: ${identification.idNumber}`);
    if (idParts.length > 0) parts.push(`ID: ${idParts.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('; ') : 'Empty profile';
}


// ============================================================================
// Date Formatting Functions
// ============================================================================
/**
 * Formats a date for display, handling various input types
 * @param date - Date object, string, or undefined
 * @returns Formatted date string or fallback
 */
export function formatDate(date: Date | string | number | undefined): string {
  if (!date) return '-';
  const d =
    typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (!(d instanceof Date) || isNaN(d.getTime())) return '-';

  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date value into a long, fully readable string like "Monday 1st October, 2025".
 * @param date - Date object, ISO string, or undefined to format.
 * @param fallback - Value to return when the date cannot be parsed.
 * @returns Human-readable date string including weekday and ordinal day or the fallback.
 */
export function formatFullDate(
  date: Date | string | undefined,
  fallback = '-'
): string {
  if (!date) return fallback;

  let parsedDate: Date;

  if (typeof date === 'string') {
    const isoDate = parseISO(date);
    parsedDate = isValid(isoDate) ? isoDate : new Date(date);
  } else {
    parsedDate = date;
  }

  if (!isValid(parsedDate)) return fallback;

  return format(parsedDate, 'EEEE do MMMM, yyyy');
}

/**
 * Formats a date with ordinal suffix and time (e.g., "Sep 9th 2025 3:45 PM")
 * @param date - Date object, string, or undefined
 * @returns Formatted date string with ordinal and time or fallback
 */
export function formatDateWithOrdinal(
  date: Date | string | number | undefined
): string {
  if (!date) return 'Unknown';
  const d =
    typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (!(d instanceof Date) || isNaN(d.getTime())) return 'Unknown';

  return format(d, 'MMM do yyyy h:mm a');
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
 * Formats a date string or Date object to a readable format
 * @param dateInput - Date string, Date object, or timestamp
 * @returns Formatted date string or "Invalid Date" if parsing fails
 */
export function formatDateString(dateInput: string | Date | number): string {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Formats a date value with smart handling of different formats
 * @param value - The value to format (could be string, Date, or other)
 * @param fieldName - Optional field name for context-specific formatting
 * @returns Formatted string representation
 */
export function formatValue(value: unknown, fieldName?: string): string {
  if (value === null || value === undefined) return 'Not set';
  if (typeof value === 'string' && value.trim() === '') return 'Empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  // Special handling for complex field types
  if (fieldName === 'profile' && typeof value === 'object' && value !== null) {
    return formatProfileObject(value as Record<string, unknown>);
  }

  // Check if the value is a date string (ISO format or Date object)
  if (typeof value === 'string' || value instanceof Date) {
    const dateValue = typeof value === 'string' ? value : value.toISOString();

    // Check if it's a valid ISO date string with time (more flexible regex)
    const isoDateTimeRegex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/;
    if (isoDateTimeRegex.test(dateValue)) {
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          // For date-only fields, show just the date
          const dateOnlyFields = [
            'startDate',
            'expiryDate',
            'endDate',
            'dateOfBirth',
          ];
          if (fieldName && dateOnlyFields.includes(fieldName)) {
            return format(date, 'MMMM d, yyyy');
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
    if (typeof value === 'string' && simpleDateRegex.test(value)) {
      try {
        const date = new Date(value + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          // Format as readable date only
          return format(date, 'MMMM d, yyyy');
        }
      } catch {
        // Fall through to handle as regular string
      }
    }

    // Check if it's a timestamp number (milliseconds since epoch)
    if (typeof value === 'string' && /^\d{13}$/.test(value)) {
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

  // For arrays, show count and content if small
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Empty array';
    if (value.length <= 3) {
      return value
        .map(item => (typeof item === 'object' ? '[Object]' : String(item)))
        .join(', ');
    }
    return `${value.length} items`;
  }

  // For objects, show formatted JSON or specific object properties
  if (typeof value === 'object' && value !== null) {
    // Handle specific object types with meaningful display
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return 'Empty object';

      // Check if it's a profile object (has profile-like properties)
      if (
        'firstName' in value ||
        'lastName' in value ||
        'gender' in value ||
        'middleName' in value
      ) {
        const profile = value as Record<string, unknown>;
        const parts = [];

        // Handle basic profile fields
        if (profile.firstName && profile.firstName !== '')
          parts.push(`First: ${profile.firstName}`);
        if (profile.lastName && profile.lastName !== '')
          parts.push(`Last: ${profile.lastName}`);
        if (profile.middleName && profile.middleName !== '')
          parts.push(`Middle: ${profile.middleName}`);
        if (profile.gender && profile.gender !== '')
          parts.push(`Gender: ${profile.gender}`);
        if (profile.email && profile.email !== '')
          parts.push(`Email: ${profile.email}`);

        // Handle nested address object
        if (profile.address && typeof profile.address === 'object') {
          const address = profile.address as Record<string, unknown>;
          const addressParts = [];
          if (address.street && address.street !== '')
            addressParts.push(`Street: ${address.street}`);
          if (address.town && address.town !== '')
            addressParts.push(`Town: ${address.town}`);
          if (address.country && address.country !== '')
            addressParts.push(`Country: ${address.country}`);
          if (addressParts.length > 0)
            parts.push(`Address: ${addressParts.join(', ')}`);
        }

        // Handle nested identification object
        if (
          profile.identification &&
          typeof profile.identification === 'object'
        ) {
          const identification = profile.identification as Record<
            string,
            unknown
          >;
          const idParts = [];
          if (identification.idType && identification.idType !== '')
            idParts.push(`Type: ${identification.idType}`);
          if (identification.idNumber && identification.idNumber !== '')
            idParts.push(`Number: ${identification.idNumber}`);
          if (idParts.length > 0) parts.push(`ID: ${idParts.join(', ')}`);
        }

        return parts.length > 0 ? parts.join('; ') : 'Empty profile';
      }

      // Check if it's an address object
      if ('street' in value || 'city' in value || 'country' in value) {
        const address = value as Record<string, unknown>;
        const parts = [];
        if (address.street && address.street !== '')
          parts.push(`Street: ${address.street}`);
        if (address.city && address.city !== '')
          parts.push(`City: ${address.city}`);
        if (address.country && address.country !== '')
          parts.push(`Country: ${address.country}`);
        return parts.length > 0 ? parts.join(', ') : 'Empty address';
      }

      // Check if it's an identification object
      if ('idType' in value || 'idNumber' in value) {
        const identification = value as Record<string, unknown>;
        const parts = [];
        if (identification.idType && identification.idType !== '')
          parts.push(`Type: ${identification.idType}`);
        if (identification.idNumber && identification.idNumber !== '')
          parts.push(`Number: ${identification.idNumber}`);
        return parts.length > 0 ? parts.join(', ') : 'Empty identification';
      }

      // For other objects, try to show meaningful properties
      if (keys.length <= 5) {
        const entries = Object.entries(value)
          .filter(([_, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => {
            if (typeof v === 'object' && v !== null) {
              // For nested objects, show a summary
              const nestedKeys = Object.keys(v);
              if (nestedKeys.length === 0) return `${k}: empty`;
              if (nestedKeys.length === 1) return `${k}: ${nestedKeys[0]}`;
              return `${k}: ${nestedKeys.length} properties`;
            }
            return `${k}: ${v}`;
          })
          .slice(0, 3); // Show max 3 properties
        return entries.length > 0 ? entries.join(', ') : 'Empty object';
      }

      // For complex objects, show a summary
      return `${keys.length} properties`;
    }

    // Final fallback - try to show at least some information
    try {
      const jsonStr = JSON.stringify(value);
      if (jsonStr.length > 100) {
        return `${Object.keys(value).length} properties (complex object)`;
      }
      return jsonStr;
    } catch {
      return '[Complex Object]';
    }
  }

  // Default: convert to string
  return String(value);
}

