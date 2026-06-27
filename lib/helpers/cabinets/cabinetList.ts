/**
 * Cabinet List & Location Fetching Helpers
 *
 * Handles fetching cabinets with filtering, single cabinet by ID,
 * cabinets for a specific location, and cabinet locations.
 *
 * Features:
 * - Fetch cabinets with filtering by licencee, time period, location, search
 * - Fetch single cabinet by ID with optional date filtering
 * - Fetch cabinets for a specific location with pagination and filters
 * - Fetch cabinet locations
 */

import type { GamingMachine } from '@/shared/types/entities';
import axios from 'axios';
import { getAuthHeaders } from '@/lib/utils/auth';
import { isAbortError } from '@/lib/utils/errors';
import { resolveLicenceeId } from '@/lib/utils/licencee';
import { formatLocalDateTimeString } from '@/shared/utils/dateFormat';
import { DateRange } from 'react-day-picker';

// ============================================================================
// Cabinet List Fetching
// ============================================================================

/**
 * Fetch all cabinets with optional filtering by licencee and time period.
 */
export const fetchCabinets = async (
  licencee?: string,
  timePeriod?: string,
  customDateRange?: DateRange,
  currency?: string,
  page?: number,
  limit?: number,
  searchTerm?: string,
  locationId?: string | string[],
  gameType?: string | string[],
  onlineStatus?: string,
  signal?: AbortSignal,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  membership?: string,
  smibStatus?: string
) => {
  try {
    let url = `/api/cabinets/aggregation`;

    const queryParams = [];
    if (licencee) queryParams.push(`licencee=${encodeURIComponent(licencee)}`);

    if (sortBy) queryParams.push(`sortBy=${encodeURIComponent(sortBy)}`);
    if (sortOrder)
      queryParams.push(`sortOrder=${encodeURIComponent(sortOrder)}`);

    if (
      locationId &&
      locationId !== 'all' &&
      (Array.isArray(locationId) ? locationId.length > 0 : true)
    ) {
      const locIds = Array.isArray(locationId)
        ? locationId.join(',')
        : locationId;
      queryParams.push(`locationId=${encodeURIComponent(locIds)}`);
    }

    if (
      gameType &&
      gameType !== 'all' &&
      (Array.isArray(gameType) ? gameType.length > 0 : true)
    ) {
      const gTypes = Array.isArray(gameType) ? gameType.join(',') : gameType;
      queryParams.push(`gameType=${encodeURIComponent(gTypes)}`);
    }

    if (
      timePeriod === 'Custom' &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      const hasTime =
        customDateRange.from.getHours() !== 0 ||
        customDateRange.from.getMinutes() !== 0 ||
        customDateRange.from.getSeconds() !== 0 ||
        customDateRange.to.getHours() !== 0 ||
        customDateRange.to.getMinutes() !== 0 ||
        customDateRange.to.getSeconds() !== 0;

      if (hasTime) {
        const fromDate = formatLocalDateTimeString(customDateRange.from, -4);
        const toDate = formatLocalDateTimeString(customDateRange.to, -4);
        queryParams.push(`startDate=${fromDate}`);
        queryParams.push(`endDate=${toDate}`);
      } else {
        const fromDate =
          customDateRange.from.toISOString().split('T')[0] + 'T00:00:00.000Z';
        const toDate =
          customDateRange.to.toISOString().split('T')[0] + 'T00:00:00.000Z';
        queryParams.push(`startDate=${fromDate}`);
        queryParams.push(`endDate=${toDate}`);
      }
      queryParams.push(`timePeriod=${encodeURIComponent(timePeriod)}`);
    } else if (timePeriod) {
      queryParams.push(`timePeriod=${encodeURIComponent(timePeriod)}`);
    }

    if (currency) {
      queryParams.push(`currency=${encodeURIComponent(currency)}`);
    }

    if (searchTerm && searchTerm.trim()) {
      queryParams.push(`search=${encodeURIComponent(searchTerm.trim())}`);
    }

    if (onlineStatus && onlineStatus !== 'all') {
      queryParams.push(`onlineStatus=${encodeURIComponent(onlineStatus)}`);
    }

    if (membership && membership !== 'all') {
      queryParams.push(`membership=${encodeURIComponent(membership)}`);
    }

    if (smibStatus && smibStatus !== 'all') {
      queryParams.push(`smibStatus=${encodeURIComponent(smibStatus)}`);
    }

    if (page !== undefined) {
      queryParams.push(`page=${page}`);
    }
    if (limit !== undefined) {
      queryParams.push(`limit=${limit}`);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    console.warn('[FETCH CABINETS] Requesting:', url);
    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      signal,
    });

    console.warn('[FETCH CABINETS] Response status:', response.status);
    console.warn('[FETCH CABINETS] Response data type:', typeof response.data);

    if (response.status === 200) {
      if (response.data && response.data.success === true) {
        const cabinets = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        const pagination = response.data.pagination;
        console.warn(
          '[FETCH CABINETS] Success format - returning',
          cabinets.length,
          'cabinets',
          pagination ? `(pagination: ${JSON.stringify(pagination)})` : ''
        );
        if (pagination) {
          return { cabinets, pagination };
        }
        return cabinets;
      } else if (response.data && Array.isArray(response.data)) {
        console.warn(
          '[FETCH CABINETS] Array format - returning',
          response.data.length,
          'cabinets'
        );
        return response.data;
      } else {
        console.error(
          '❌ [FETCH CABINETS] Unexpected API response format:',
          response.data
        );
        return [];
      }
    }

    console.error('❌ [FETCH CABINETS] Failed status:', response.status);
    throw new Error(
      `Failed to fetch cabinets data. Status: ${response.status}`
    );
  } catch (error) {
    if (isAbortError(error)) {
      return [];
    }

    console.error('❌ [FETCH CABINETS] Error fetching cabinets:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
    return [];
  }
};

// ============================================================================
// Single Cabinet Fetching
// ============================================================================

/**
 * Fetch a single cabinet by its ID with optional date filtering.
 */
export const fetchCabinetById = async (
  cabinetId: string,
  timePeriod?: string,
  customDateRange?: DateRange,
  currency?: string,
  licencee?: string | null,
  signal?: AbortSignal,
  dateField?: string
) => {
  try {
    let endpoint = `/api/cabinets/${cabinetId}`;

    const queryParams = [];

    if (dateField && dateField !== 'readAt') {
      queryParams.push(`dateField=${encodeURIComponent(dateField)}`);
    }

    if (timePeriod === 'Custom') {
      if (!customDateRange?.from || !customDateRange?.to) {
        throw new Error(
          'Custom start and end dates are required for Custom time period'
        );
      }
      const hasTime =
        customDateRange.from.getHours() !== 0 ||
        customDateRange.from.getMinutes() !== 0 ||
        customDateRange.from.getSeconds() !== 0 ||
        customDateRange.to.getHours() !== 0 ||
        customDateRange.to.getMinutes() !== 0 ||
        customDateRange.to.getSeconds() !== 0;

      if (hasTime) {
        const fromDate = formatLocalDateTimeString(customDateRange.from, -4);
        const toDate = formatLocalDateTimeString(customDateRange.to, -4);
        queryParams.push(`startDate=${fromDate}`);
        queryParams.push(`endDate=${toDate}`);
      } else {
        const fromDate =
          customDateRange.from.toISOString().split('T')[0] + 'T00:00:00.000Z';
        const toDate =
          customDateRange.to.toISOString().split('T')[0] + 'T00:00:00.000Z';
        queryParams.push(`startDate=${fromDate}`);
        queryParams.push(`endDate=${toDate}`);
      }
      queryParams.push(`timePeriod=${encodeURIComponent(timePeriod)}`);
    } else if (timePeriod) {
      queryParams.push(`timePeriod=${encodeURIComponent(timePeriod)}`);
    }

    if (currency) {
      queryParams.push(`currency=${encodeURIComponent(currency)}`);
    }

    if (licencee) {
      queryParams.push(`licencee=${encodeURIComponent(licencee)}`);
    }

    queryParams.push(`_t=${Date.now()}`);

    if (queryParams.length > 0) {
      endpoint += `?${queryParams.join('&')}`;
    }

    console.warn('[DEBUG] fetchCabinetById calling:', endpoint);
    const response = await axios.get(endpoint, {
      headers: getAuthHeaders(),
      signal,
    });

    if (response.data && response.data.success) {
      return response.data.data;
    }

    throw new Error('Failed to fetch cabinet details');
  } catch (error) {
    console.error(`Error fetching cabinet with ID ${cabinetId}:`, error);

    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const unauthorizedError = new Error(
        'Unauthorized: You do not have access to this cabinet'
      ) as Error & { status: number; isUnauthorized: boolean };
      unauthorizedError.status = 403;
      unauthorizedError.isUnauthorized = true;
      throw unauthorizedError;
    }

    throw error;
  }
};

// ============================================================================
// Location Operations
// ============================================================================

/**
 * Fetch all cabinet locations, optionally filtered by licencee.
 */
export const fetchCabinetLocations = async (licencee?: string) => {
  try {
    let params: Record<string, string> = {};
    if (licencee) {
      params = { licencee };
    }

    const response = await axios.get('/api/cabinets/locations', {
      params,
      headers: getAuthHeaders(),
    });

    if (!response.status || response.status >= 400) {
      console.error(`Error fetching locations: ${response.status}`);
      return [];
    }

    const locationsList = response.data?.locations || response.data?.data || [];

    if (Array.isArray(locationsList)) {
      return locationsList;
    } else {
      console.error('Locations data is not an array:', locationsList);
      return [];
    }
  } catch (error) {
    console.error('Error fetching cabinet locations:', error);
    return [];
  }
};

// ============================================================================
// Location-Specific Cabinets
// ============================================================================

/**
 * Fetch cabinets for a specific location, with optional filters.
 */
export async function fetchCabinetsForLocation(
  locationId: string,
  licencee?: string,
  timePeriod?: string,
  searchTerm?: string,
  customDateRange?: DateRange,
  page?: number,
  limit?: number,
  currency?: string,
  onlineStatus?: string,
  includeArchived?: boolean,
  smibStatus?: string,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  signal?: AbortSignal
): Promise<{
  data: GamingMachine[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  try {
    if (!timePeriod) {
      console.warn(
        '⚠️ No timePeriod provided to fetchCabinetsForLocation, returning empty array'
      );
      return { data: [] };
    }

    const params: Record<string, string> = {
      timePeriod: timePeriod,
      locationId: locationId,
    };

    if (licencee) {
      const licenceeId = resolveLicenceeId(licencee);
      if (licenceeId) {
        params.licencee = licenceeId;
      }
    }

    if (searchTerm) {
      params.search = searchTerm;
    }

    if (page !== undefined) {
      params.page = page.toString();
    }
    if (limit !== undefined) {
      params.limit = limit.toString();
    }

    if (currency) {
      params.currency = currency;
    }

    if (onlineStatus && onlineStatus !== 'all') {
      params.onlineStatus = onlineStatus;
    } else if (includeArchived) {
      params.onlineStatus = 'archived';
    } else if (!onlineStatus || onlineStatus === 'all') {
      params.onlineStatus = 'all';
    }

    if (smibStatus && smibStatus !== 'all') {
      params.smibStatus = smibStatus;
    }

    if (sortBy) {
      params.sortBy = sortBy;
    }
    if (sortOrder) {
      params.sortOrder = sortOrder;
    }

    if (
      timePeriod === 'Custom' &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      const hasTime =
        customDateRange.from.getHours() !== 0 ||
        customDateRange.from.getMinutes() !== 0 ||
        customDateRange.from.getSeconds() !== 0 ||
        customDateRange.to.getHours() !== 0 ||
        customDateRange.to.getMinutes() !== 0 ||
        customDateRange.to.getSeconds() !== 0;

      if (hasTime) {
        params.startDate = formatLocalDateTimeString(customDateRange.from, -4);
        params.endDate = formatLocalDateTimeString(customDateRange.to, -4);
      } else {
        params.startDate =
          customDateRange.from.toISOString().split('T')[0] + 'T00:00:00.000Z';
        params.endDate =
          customDateRange.to.toISOString().split('T')[0] + 'T00:00:00.000Z';
      }
    }

    const queryString = new URLSearchParams(params).toString();

    const response = await axios.get(
      `/api/cabinets/aggregation?${queryString}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        signal,
      }
    );

    if (response.status !== 200) {
      console.error(` API error (${response.status}):`, response.data);
      return { data: [] };
    }

    const data = response.data;

    if (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      'data' in data
    ) {
      return {
        data: Array.isArray(data.data) ? data.data : [],
        pagination: data.pagination,
      };
    } else if (data && Array.isArray(data)) {
      return { data };
    } else {
      console.error(`⚠️ Invalid data format received:`, data);
      return { data: [] };
    }
  } catch (error) {
    if (isAbortError(error)) {
      return { data: [] };
    }

    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const unauthorizedError = new Error(
        'Unauthorized: You do not have access to this location'
      ) as Error & { status: number; isUnauthorized: boolean };
      unauthorizedError.status = 403;
      unauthorizedError.isUnauthorized = true;
      throw unauthorizedError;
    }

    console.error('❌ Error in fetchCabinetsForLocation:', error);
    return { data: [] };
  }
}
