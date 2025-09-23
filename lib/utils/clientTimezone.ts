/**
 * Client Timezone Utility
 * 
 * This utility handles date/time operations using the client's local timezone automatically.
 * Unlike the hardcoded Trinidad timezone utilities, this uses the browser's native timezone
 * handling to display dates in the user's local timezone.
 */

/**
 * Formats a UTC date to the client's local timezone
 * @param utcDate - Date in UTC (from database)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string in client's local timezone
 */
export function formatClientTime(
  utcDate: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };

  return utcDate.toLocaleString(undefined, {
    ...defaultOptions,
    ...options,
  });
}

/**
 * Formats a UTC date to client's local date only (no time)
 * @param utcDate - Date in UTC
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string in client's local timezone
 */
export function formatClientDate(
  utcDate: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return utcDate.toLocaleDateString(undefined, {
    ...defaultOptions,
    ...options,
  });
}

/**
 * Formats a UTC date to client's local time only (no date)
 * @param utcDate - Date in UTC
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted time string in client's local timezone
 */
export function formatClientTimeOnly(
  utcDate: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };

  return utcDate.toLocaleTimeString(undefined, {
    ...defaultOptions,
    ...options,
  });
}

/**
 * Converts all date fields in an object to client's local timezone for display
 * @param obj - Object containing date fields
 * @param dateFields - Array of field names that contain dates
 * @returns Object with date fields formatted for client's local timezone
 */
export function convertObjectDatesToClientTime<T extends Record<string, unknown>>(
  obj: T,
  dateFields: string[] = []
): T {
  if (!obj || typeof obj !== "object") return obj;

  // Common date field names found in our models
  const commonDateFields = [
    "createdAt",
    "updatedAt",
    "deletedAt",
    "readAt",
    "timestamp",
    "date",
    "startTime",
    "endTime",
    "lastActivity",
    "lastLogin",
    "lastPwUpdatedAt",
    "lastfplAwardAt",
    "smsCodeTime",
    "startDate",
    "expiryDate",
    "prevStartDate",
    "prevExpiryDate",
    "previousCollectionTime",
    "collectionTime",
    "lastBillMeterAt",
    "lastSasMeterAt",
    "lastMaintenanceDate",
    "nextMaintenanceDate",
    "lastAutoLogoutTime",
    "asOf",
  ];

  const allDateFields = [...new Set([...commonDateFields, ...dateFields])];

  const converted = { ...obj } as Record<string, unknown>;

  for (const field of allDateFields) {
    if (converted[field] && converted[field] instanceof Date) {
      // Keep the original Date object - the browser will handle timezone conversion automatically
      // when displaying or formatting the date
      converted[field] = converted[field];
    }

    // Handle nested objects
    if (
      converted[field] &&
      typeof converted[field] === "object" &&
      !Array.isArray(converted[field])
    ) {
      converted[field] = convertObjectDatesToClientTime(
        converted[field] as Record<string, unknown>,
        dateFields
      );
    }

    // Handle arrays of objects
    if (Array.isArray(converted[field])) {
      converted[field] = converted[field].map((item: unknown) =>
        typeof item === "object" && item instanceof Date
          ? item // Keep original Date object
          : typeof item === "object" && item !== null
          ? convertObjectDatesToClientTime(item as Record<string, unknown>, dateFields)
          : item
      );
    }
  }

  return converted as T;
}

/**
 * Converts an array of objects with date fields to client's local timezone
 * @param array - Array of objects
 * @param dateFields - Additional date field names to convert
 * @returns Array with all date fields formatted for client's local timezone
 */
export function convertArrayDatesToClientTime<T extends Record<string, unknown>>(
  array: T[],
  dateFields: string[] = []
): T[] {
  if (!Array.isArray(array)) return array;

  return array.map((item) =>
    convertObjectDatesToClientTime(item, dateFields)
  );
}

/**
 * Middleware helper to convert response data to client's local timezone
 * @param data - Response data (object or array)
 * @param additionalDateFields - Additional date fields to convert
 * @returns Data with dates formatted for client's local timezone
 */
export function convertResponseToClientTime<T>(
  data: T,
  additionalDateFields: string[] = []
): T {
  if (Array.isArray(data)) {
    return convertArrayDatesToClientTime(data, additionalDateFields) as T;
  } else if (data && typeof data === "object") {
    return convertObjectDatesToClientTime(
      data as Record<string, unknown>,
      additionalDateFields
    ) as T;
  }

  return data;
}

/**
 * Gets the current time in the client's local timezone
 * @returns Current date/time in client's local timezone
 */
export function getCurrentClientTime(): Date {
  return new Date(); // This is already in client's local timezone
}

/**
 * Creates a date range filter for MongoDB queries using client's local timezone
 * @param startDate - Start date in client's local time
 * @param endDate - End date in client's local time
 * @returns Object with UTC dates for MongoDB queries
 */
export function createClientDateRangeFilter(
  startDate: Date | string,
  endDate: Date | string
): { $gte: Date; $lte: Date } {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  // Convert client local time to UTC for database queries
  return {
    $gte: new Date(start.getTime() - (start.getTimezoneOffset() * 60000)),
    $lte: new Date(end.getTime() - (end.getTimezoneOffset() * 60000)),
  };
}

/**
 * Debug utility to show current time in both UTC and client's local timezone
 */
export function debugClientTimezone(): void {
  const now = new Date();
  const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));

  console.warn("🕐 Client Timezone Debug:");
  console.warn(`   Client Local Time: ${now.toLocaleString()}`);
  console.warn(`   UTC Time: ${utcTime.toISOString()}`);
  console.warn(`   Timezone Offset: ${now.getTimezoneOffset()} minutes`);
  console.warn(`   Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
}
