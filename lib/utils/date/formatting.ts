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
  if (!profile) {
    console.error('[formatProfileObject] profile is required');
    return 'Empty profile';
  }
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
export function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '-';

  return dateObj.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date string (ISO format) to a readable date string
 * @param dateString - ISO date string or Date object
 * @param fallback - Value to return if date is invalid
 * @returns Formatted date string
 */
export function formatDateString(
  dateString: string | Date | undefined | null,
  fallback: string = '-'
): string {
  if (!dateString) return fallback;
  try {
    const date =
      typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (!(date instanceof Date) || isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    console.error(
      '[formatDateString] Error:',
      e instanceof Error ? e.message : 'Unknown error'
    );
    return fallback;
  }
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
export function formatDateWithOrdinal(date: Date | string | undefined): string {
  if (!date) return 'Unknown';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return 'Unknown';

  return format(dateObj, 'MMM do yyyy h:mm a');
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
 * Formats a date string or Date object to a readable format safely
 * @param dateInput - Date string, Date object, or timestamp
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string or "-" if parsing fails
 */
export function safeFormatDate(
  dateInput: string | Date | number | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '-';
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString(
      'en-US',
      options || {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }
    );
  } catch (e) {
    console.error(
      '[safeFormatDate] Error:',
      e instanceof Error ? e.message : 'Unknown error'
    );
    return '-';
  }
}

/**
 * Formats a date value with smart handling of different formats
 * @param value - The value to format (could be string, Date, or other)
 * @param fieldName - Optional field name for context-specific formatting
 * @returns Formatted string representation
 */
/**
 * Formats an object recursively into an elegant, Title Case human-readable string.
 * @param obj - The object to format
 * @param depth - Current recursion depth
 * @returns Formatted string
 */
function formatObjectRecursively(obj: Record<string, unknown>, depth = 0): string {
  if (depth > 3) return '[Object]';

  const formatKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\./g, ' › ')
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  };

  // Special check for geoCoords
  if ('latitude' in obj || 'longitude' in obj || 'longtitude' in obj) {
    const lat = obj.latitude ?? obj.lat;
    const lng = obj.longitude ?? obj.longtitude ?? obj.lng;
    if (lat !== undefined && lng !== undefined) {
      return `Lat: ${lat}, Lng: ${lng}`;
    }
  }

  // Special check for billValidatorOptions
  if ('denom1' in obj) {
    const enabled = Object.entries(obj)
      .filter(([k, v]) => k.startsWith('denom') && v === true)
      .map(([k]) => k.replace('denom', '$'));
    return enabled.length > 0 ? `Enabled: ${enabled.join(', ')}` : 'None';
  }

  const entries = Object.entries(obj)
    .filter(([k, v]) => {
      // Filter out internal fields and empty/null/undefined values
      if (['_id', '__v', 'createdAt', 'updatedAt', 'deletedAt'].includes(k)) return false;
      return v !== null && v !== undefined && v !== '';
    })
    .map(([k, v]) => {
      const prettyKey = formatKey(k);
      if (typeof v === 'object' && v !== null) {
        if (Array.isArray(v)) {
          if (v.length === 0) return `${prettyKey}: Empty`;
          const formattedItems = v.map((item: unknown) => {
            if (typeof item === 'object' && item !== null) {
              return formatObjectRecursively(item as Record<string, unknown>, depth + 1);
            }
            return String(item);
          });
          return `${prettyKey}: [${formattedItems.join(', ')}]`;
        }
        return `${prettyKey}: { ${formatObjectRecursively(v as Record<string, unknown>, depth + 1)} }`;
      }
      if (typeof v === 'boolean') {
        return `${prettyKey}: ${v ? 'Yes' : 'No'}`;
      }
      return `${prettyKey}: ${v}`;
    });

  return entries.length > 0 ? entries.join(', ') : 'Empty object';
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

  // Try parsing stringified JSON objects/arrays
  let parsedValue = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsedValue = JSON.parse(trimmed);
      } catch {
        // Keep as string
      }
    }
  }

  if (typeof parsedValue === 'boolean') return parsedValue ? 'Yes' : 'No';

  // Special handling for complex field types
  if (fieldName === 'profile' && typeof parsedValue === 'object' && parsedValue !== null) {
    return formatProfileObject(parsedValue as Record<string, unknown>);
  }

  // Check if the value is a date string (ISO format or Date object)
  if (typeof parsedValue === 'string' || parsedValue instanceof Date) {
    const dateValue = typeof parsedValue === 'string' ? parsedValue : parsedValue.toISOString();

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
      } catch (e) {
        console.error(
          '[formatValue] Error:',
          e instanceof Error ? e.message : 'Unknown error'
        );
        // Fall through to handle as regular string.
      }
    }

    // Check if it's a simple date string (YYYY-MM-DD)
    const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof parsedValue === 'string' && simpleDateRegex.test(parsedValue)) {
      try {
        const date = new Date(parsedValue + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          // Format as readable date only
          return format(date, 'MMMM d, yyyy');
        }
      } catch {
        // Fall through to handle as regular string
      }
    }

    // Check if it's a timestamp number (milliseconds since epoch)
    if (typeof parsedValue === 'string' && /^\d{13}$/.test(parsedValue)) {
      try {
        const date = new Date(parseInt(parsedValue));
        if (!isNaN(date.getTime())) {
          return format(date, "MMMM d, yyyy 'at' h:mm a");
        }
      } catch {
        // Fall through to handle as regular string
      }
    }
  }

  // For arrays, show count and content if small
  if (Array.isArray(parsedValue)) {
    if (parsedValue.length === 0) return 'Empty array';
    const formattedItems = parsedValue.map((item: unknown) => {
      if (typeof item === 'object' && item !== null) {
        return `{ ${formatObjectRecursively(item as Record<string, unknown>)} }`;
      }
      return String(item);
    });
    return formattedItems.join(', ');
  }

  // For objects, show formatted JSON or specific object properties
  if (typeof parsedValue === 'object' && parsedValue !== null) {
    const keys = Object.keys(parsedValue);
    if (keys.length === 0) return 'Empty object';

    // Check for sasMeters object
    if (fieldName === 'sasMeters' || ('drop' in parsedValue && 'gross' in parsedValue)) {
      const sas = parsedValue as Record<string, unknown>;
      return `Drop: ${sas.drop}, Gross: ${sas.gross}${sas.jackpot !== undefined ? `, JP: ${sas.jackpot}` : ''}${sas.gamesPlayed !== undefined ? `, GP: ${sas.gamesPlayed}` : ''}`;
    }

    // Check for movement object
    if (
      fieldName === 'movement' ||
      ('metersIn' in parsedValue && 'metersOut' in parsedValue && 'gross' in parsedValue)
    ) {
      const movementData = parsedValue as Record<string, unknown>;
      return `In: ${movementData.metersIn}, Out: ${movementData.metersOut}, Gross: ${movementData.gross}`;
    }

    // Check if it's a profile object (has profile-like properties)
    if (
      'firstName' in parsedValue ||
      'lastName' in parsedValue ||
      'gender' in parsedValue ||
      'middleName' in parsedValue
    ) {
      const profile = parsedValue as Record<string, unknown>;
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
    if ('street' in parsedValue || 'city' in parsedValue || 'country' in parsedValue) {
      const address = parsedValue as Record<string, unknown>;
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
    if ('idType' in parsedValue || 'idNumber' in parsedValue) {
      const identification = parsedValue as Record<string, unknown>;
      const parts = [];
      if (identification.idType && identification.idType !== '')
        parts.push(`Type: ${identification.idType}`);
      if (identification.idNumber && identification.idNumber !== '')
        parts.push(`Number: ${identification.idNumber}`);
      return parts.length > 0 ? parts.join(', ') : 'Empty identification';
    }

    // Custom human-readable formatter for any other objects
    return formatObjectRecursively(parsedValue as Record<string, unknown>);
  }

  // Default: convert to string
  return String(parsedValue);
}
