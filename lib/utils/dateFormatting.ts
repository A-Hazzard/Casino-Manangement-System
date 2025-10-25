import { format } from 'date-fns';

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

/**
 * Formats a resourcePermissions object
 * @param permissions - The permissions object to format
 * @returns Formatted string representation
 */
function formatResourcePermissionsObject(
  permissions: Record<string, unknown>
): string {
  const locationData =
    permissions['gaming-locations'] || permissions['locations'];
  if (locationData && typeof locationData === 'object') {
    const locationObj = locationData as {
      entity?: string;
      resources?: string[];
    };
    const resources = locationObj.resources || [];
    const entity = locationObj.entity || 'unknown';
    return resources.length > 0
      ? `${resources.length} ${entity} resources`
      : `No ${entity} resources`;
  }
  return 'No permissions';
}

/**
 * Formats a date for display, handling various input types
 * @param date - Date object, string, or undefined
 * @returns Formatted date string or fallback
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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
  if (value === null || value === undefined) return 'Not set';
  if (typeof value === 'string' && value.trim() === '') return 'Empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  // Special handling for complex field types
  if (fieldName === 'profile' && typeof value === 'object' && value !== null) {
    return formatProfileObject(value as Record<string, unknown>);
  }

  if (
    fieldName === 'resourcePermissions' &&
    typeof value === 'object' &&
    value !== null
  ) {
    return formatResourcePermissionsObject(value as Record<string, unknown>);
  }

  // Check if the value is a date string (ISO format or Date object)
  if (typeof value === 'string' || value instanceof Date) {
    const dateValue = typeof value === 'string' ? value : value.toISOString();

    // Check if it's a valid ISO date string with time
    const isoDateTimeRegex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
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

      // Check if it's a resourcePermissions object
      if ('gaming-locations' in value || 'locations' in value) {
        const permissions = value as Record<string, unknown>;
        const locationData =
          permissions['gaming-locations'] || permissions['locations'];
        if (locationData && typeof locationData === 'object') {
          const locationObj = locationData as {
            entity?: string;
            resources?: string[];
          };
          const resources = locationObj.resources || [];
          const entity = locationObj.entity || 'unknown';
          return resources.length > 0
            ? `${resources.length} ${entity} resources`
            : `No ${entity} resources`;
        }
        return 'No permissions';
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
