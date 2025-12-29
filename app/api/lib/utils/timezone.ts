/**
 * Timezone Utility for Trinidad and Tobago (UTC-4)
 *
 * This utility handles conversion between UTC and Trinidad local time.
 * Trinidad is UTC-4 year-round (no daylight saving time).
 */

const TRINIDAD_TIMEZONE_OFFSET = -4; // UTC-4

/**
 * Converts UTC time to Trinidad local time (UTC-4)
 * @param utcDate - Date in UTC
 * @returns Date adjusted to Trinidad local time
 */
function utcToTrinidadTime(utcDate: Date): Date {
  const trinidadTime = new Date(utcDate);
  trinidadTime.setHours(trinidadTime.getHours() + TRINIDAD_TIMEZONE_OFFSET);
  return trinidadTime;
}

/**
 * Converts all date fields in an object from UTC to Trinidad time

/**
 * Converts all date fields in an object from UTC to Trinidad time
 * @param obj - Object containing date fields
 * @param dateFields - Array of field names that contain dates
 * @returns Object with date fields converted to Trinidad time
 */
function convertObjectDatesToTrinidadTime<
  T extends Record<string, unknown>,
>(obj: T, dateFields: string[] = []): T {
  if (!obj || typeof obj !== 'object') return obj;

  // Common date field names found in our models
  const commonDateFields = [
    'createdAt',
    'updatedAt',
    'deletedAt',
    'readAt',
    'timestamp',
    'date',
    'startTime',
    'endTime',
    'lastActivity',
    'lastLogin',
    'lastPwUpdatedAt',
    'lastfplAwardAt',
    'smsCodeTime',
    'startDate',
    'expiryDate',
    'prevStartDate',
    'prevExpiryDate',
    'previousCollectionTime',
    'collectionTime',
    'lastBillMeterAt',
    'lastSasMeterAt',
    'lastMaintenanceDate',
    'nextMaintenanceDate',
    'lastAutoLogoutTime',
    'asOf',
  ];

  const allDateFields = [...new Set([...commonDateFields, ...dateFields])];

  const converted = { ...obj } as Record<string, unknown>;

  for (const field of allDateFields) {
    if (converted[field] && converted[field] instanceof Date) {
      converted[field] = utcToTrinidadTime(converted[field] as Date);
    }

    // Handle nested objects
    if (
      converted[field] &&
      typeof converted[field] === 'object' &&
      !Array.isArray(converted[field])
    ) {
      converted[field] = convertObjectDatesToTrinidadTime(
        converted[field] as Record<string, unknown>,
        dateFields
      );
    }

    // Handle arrays of objects
    if (Array.isArray(converted[field])) {
      converted[field] = converted[field].map((item: unknown) =>
        typeof item === 'object' && item instanceof Date
          ? utcToTrinidadTime(item)
          : typeof item === 'object' && item !== null
            ? convertObjectDatesToTrinidadTime(
                item as Record<string, unknown>,
                dateFields
              )
            : item
      );
    }
  }

  return converted as T;
}

/**
 * Converts an array of objects with date fields from UTC to Trinidad time
 * @param array - Array of objects
 * @param dateFields - Additional date field names to convert
 * @returns Array with all date fields converted to Trinidad time
 */
function convertArrayDatesToTrinidadTime<
  T extends Record<string, unknown>,
>(array: T[], dateFields: string[] = []): T[] {
  if (!Array.isArray(array)) return array;

  return array.map(item => convertObjectDatesToTrinidadTime(item, dateFields));
}

/**
 * Middleware helper to convert response data to Trinidad time
 * @param data - Response data (object or array)
 * @param additionalDateFields - Additional date fields to convert
 * @returns Data with dates converted to Trinidad time
 */
export function convertResponseToTrinidadTime<T>(
  data: T,
  additionalDateFields: string[] = []
): T {
  if (Array.isArray(data)) {
    return convertArrayDatesToTrinidadTime(data, additionalDateFields) as T;
  } else if (data && typeof data === 'object') {
    return convertObjectDatesToTrinidadTime(
      data as Record<string, unknown>,
      additionalDateFields
    ) as T;
  }

  return data;
}

