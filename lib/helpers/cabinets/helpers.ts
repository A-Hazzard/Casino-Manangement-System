/**
 * Cabinets Helper Functions
 *
 * Provides helper functions for fetching and managing cabinet/machine data from the API.
 * It handles cabinet CRUD operations, location-based cabinet fetching, financial metrics,
 * and cabinet totals aggregation.
 *
 * Features:
 * - Fetches cabinets with filtering by licencee, time period, location, and search
 * - Creates, updates, and deletes cabinets
 * - Fetches cabinets for specific locations
 * - Calculates cabinet financial totals
 * - Handles cabinet locations and game types
 */

import type { GamingMachine } from '@/shared/types/entities';
import axios from 'axios';
type NewCabinetFormData = Partial<GamingMachine>;
type CabinetFormData = Partial<GamingMachine>;

import { getAuthHeaders } from '@/lib/utils/auth';
import { isAbortError } from '@/lib/utils/errors';
import { resolveLicenceeId } from '@/lib/utils/licencee';
import { formatLocalDateTimeString } from '@/shared/utils/dateFormat';
import { DateRange } from 'react-day-picker';
// Activity logging removed - handled via API calls

/**
 * Fetch all cabinets with optional filtering by licencee and time period.
 *
 * @param licencee - (Optional) Licencee filter for cabinets.
 * @param timePeriod - (Optional) Time period filter for cabinets.
 * @param customDateRange - (Optional) Custom date range filter for cabinets.
 * @returns Promise resolving to an array of cabinets, or an empty array on error.
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
    // Construct the URL with appropriate parameters
    let url = `/api/machines/aggregation`;

    // Add query parameters if they exist
    const queryParams = [];
    if (licencee) queryParams.push(`licencee=${encodeURIComponent(licencee)}`);

    if (sortBy) queryParams.push(`sortBy=${encodeURIComponent(sortBy)}`);
    if (sortOrder)
      queryParams.push(`sortOrder=${encodeURIComponent(sortOrder)}`);

    // Add locationId parameter if provided (filter at API level for better performance)
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

    // Add gameType parameter if provided
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
      // Check if dates have time components (not midnight)
      const hasTime =
        customDateRange.from.getHours() !== 0 ||
        customDateRange.from.getMinutes() !== 0 ||
        customDateRange.from.getSeconds() !== 0 ||
        customDateRange.to.getHours() !== 0 ||
        customDateRange.to.getMinutes() !== 0 ||
        customDateRange.to.getSeconds() !== 0;

      if (hasTime) {
        // Send local time with timezone offset to preserve user's time selection
        const fromDate = formatLocalDateTimeString(customDateRange.from, -4);
        const toDate = formatLocalDateTimeString(customDateRange.to, -4);
        queryParams.push(`startDate=${fromDate}`);
        queryParams.push(`endDate=${toDate}`);
      } else {
        // Date-only: always include time component so backend doesn't need format detection
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

    // Add search parameter if provided
    if (searchTerm && searchTerm.trim()) {
      queryParams.push(`search=${encodeURIComponent(searchTerm.trim())}`);
    }

    // Add onlineStatus parameter if provided
    if (onlineStatus && onlineStatus !== 'all') {
      queryParams.push(`onlineStatus=${encodeURIComponent(onlineStatus)}`);
    }

    // Add membership parameter if provided
    if (membership && membership !== 'all') {
      queryParams.push(`membership=${encodeURIComponent(membership)}`);
    }

    // Add smibStatus parameter if provided
    if (smibStatus && smibStatus !== 'all') {
      queryParams.push(`smibStatus=${encodeURIComponent(smibStatus)}`);
    }

    // Add pagination parameters
    if (page !== undefined) {
      queryParams.push(`page=${page}`);
    }
    if (limit !== undefined) {
      queryParams.push(`limit=${limit}`);
    }

    // Append query string if we have parameters
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

    // Check if the response contains a data property with an array
    if (response.status === 200) {
      if (response.data && response.data.success === true) {
        // API response follows { success: true, data: [...], pagination?: {...} } format
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
        // Return both cabinets and pagination info if available
        if (pagination) {
          return { cabinets, pagination };
        }
        return cabinets;
      } else if (response.data && Array.isArray(response.data)) {
        // API response is a direct array (backward compatibility)
        console.warn(
          '[FETCH CABINETS] Array format - returning',
          response.data.length,
          'cabinets'
        );
        return response.data;
      } else {
        // Unexpected response format
        console.error(
          '❌ [FETCH CABINETS] Unexpected API response format:',
          response.data
        );
        return [];
      }
    }

    // If the response indicates failure or data is missing
    console.error('❌ [FETCH CABINETS] Failed status:', response.status);
    throw new Error(
      `Failed to fetch cabinets data. Status: ${response.status}`
    );
  } catch (error) {
    // CRITICAL: Check for abort errors FIRST - aborting is NOT an error, it's expected when switching filters
    // Abort errors should NEVER show error logs or throw errors
    if (isAbortError(error)) {
      // Silently return empty array - aborting is expected behavior when switching filters
      return [];
    }

    // Only log actual errors (not aborts)
    console.error('❌ [FETCH CABINETS] Error fetching cabinets:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
    // Return empty array instead of throwing to prevent skeleton loader from showing indefinitely
    return [];
  }
};

/**
 * Fetch a single cabinet by its ID with optional date filtering.
 *
 * @param cabinetId - The unique identifier for the cabinet.
 * @param timePeriod - Optional time period filter (Today, Yesterday, 7d, 30d, All Time).
 * @returns Promise resolving to the cabinet details, or throws on error.
 */
export const fetchCabinetById = async (
  cabinetId: string,
  timePeriod?: string,
  customDateRange?: DateRange,
  currency?: string,
  licencee?: string | null,
  signal?: AbortSignal
) => {
  try {
    // Use the main machines endpoint with time period filtering
    let endpoint = `/api/machines/${cabinetId}`;

    // Add query parameters
    const queryParams = [];

    if (timePeriod === 'Custom') {
      // For Custom time period, dates are required
      if (!customDateRange?.from || !customDateRange?.to) {
        throw new Error(
          'Custom start and end dates are required for Custom time period'
        );
      }
      // Check if dates have time components (not midnight)
      const hasTime =
        customDateRange.from.getHours() !== 0 ||
        customDateRange.from.getMinutes() !== 0 ||
        customDateRange.from.getSeconds() !== 0 ||
        customDateRange.to.getHours() !== 0 ||
        customDateRange.to.getMinutes() !== 0 ||
        customDateRange.to.getSeconds() !== 0;

      if (hasTime) {
        // Send local time with timezone offset to preserve user's time selection
        // This ensures 11:45 AM local stays as 11:45 AM in the request
        const fromDate = formatLocalDateTimeString(customDateRange.from, -4);
        const toDate = formatLocalDateTimeString(customDateRange.to, -4);
        queryParams.push(`startDate=${fromDate}`);
        queryParams.push(`endDate=${toDate}`);
      } else {
        // Date-only: always include time component so backend doesn't need format detection
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

    // Add cache-busting timestamp to prevent caching issues
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

    // Check if it's a 403 Unauthorized error
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

/**
 * Create a new cabinet using provided form data.
 *
 * @param data - NewCabinetFormData or CabinetFormData object.
 * @returns Promise resolving to the created cabinet data, or throws on error.
 */
export const createCabinet = async (
  data: NewCabinetFormData | CabinetFormData
) => {
  try {
    // Activity logging removed - handled via API calls

    let apiData;
    let endpoint = '/api/machines';

    if ('serialNumber' in data) {
      apiData = data;

      if (data.gamingLocation) {
        endpoint = `/api/locations/${data.gamingLocation}/cabinets`;
      } else {
        throw new Error('Gaming location is required to create a cabinet');
      }
    } else {
      apiData = data;
      if (data.locationId) {
        endpoint = `/api/locations/${data.locationId}/cabinets`;
      } else {
        throw new Error('Location is required to create a cabinet');
      }
    }

    const response = await axios.post(endpoint, apiData);

    if (response.data && response.data.success) {
      // Activity logging removed - handled via API calls

      return response.data.data;
    }

    throw new Error('Failed to create cabinet');
  } catch (error) {
    console.error('Error creating cabinet:', error);
    throw error;
  }
};

/**
 * Update an existing cabinet with provided form data.
 *
 * @param data - CabinetFormData object.
 * @param timePeriod - Optional time period filter for fetching cabinet data.
 * @returns Promise resolving to the updated cabinet data, or throws on error.
 */
export const updateCabinet = async (
  data: CabinetFormData,
  timePeriod?: string,
  customDateRange?: DateRange
) => {
  try {
    // console.log(
    //   "updateCabinet called with data:",
    //   JSON.stringify(data, null, 2)
    // );
    // console.log("gameType in data:", data.gameType);
    // Activity logging removed - handled via API calls

    // Get the machine data with gamingLocation from the new endpoint
    let cabinetUrl = `/api/machines/${data._id}`;

    // Add query parameters
    const queryParams = [];
    if (
      timePeriod === 'Custom' &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      // Check if dates have time components (not midnight)
      const hasTime =
        customDateRange.from.getHours() !== 0 ||
        customDateRange.from.getMinutes() !== 0 ||
        customDateRange.from.getSeconds() !== 0 ||
        customDateRange.to.getHours() !== 0 ||
        customDateRange.to.getMinutes() !== 0 ||
        customDateRange.to.getSeconds() !== 0;

      if (hasTime) {
        // Send local time with timezone offset to preserve user's time selection
        const fromDate = formatLocalDateTimeString(customDateRange.from, -4);
        const toDate = formatLocalDateTimeString(customDateRange.to, -4);
        queryParams.push(`startDate=${fromDate}`);
        queryParams.push(`endDate=${toDate}`);
      } else {
        // Date-only: always include time component so backend doesn't need format detection
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

    if (queryParams.length > 0) {
      cabinetUrl += `?${queryParams.join('&')}`;
    }

    const cabinetResponse = await axios.get(cabinetUrl, {
      headers: getAuthHeaders(),
    });

    if (!cabinetResponse.data?.success || !cabinetResponse.data?.data) {
      throw new Error('Failed to fetch cabinet data');
    }

    const cabinet = cabinetResponse.data.data;
    if (!cabinet.gamingLocation) {
      throw new Error('Cabinet location not found');
    }

    const locationId = cabinet.gamingLocation;
    // console.log(
    //   "Sending PUT request to:",
    //   `/api/locations/${locationId}/cabinets/${data._id}`
    // );
    // console.log("Request payload:", JSON.stringify(data, null, 2));

    const response = await axios.put(
      `/api/locations/${locationId}/cabinets/${data._id}`,
      data
    );

    // console.log("API response:", response.data);

    if (response.data && response.data.success) {
      // Activity logging removed - handled via API calls

      return response.data.data;
    }

    throw new Error('Failed to update cabinet');
  } catch (error) {
    console.error(`Error updating cabinet with ID ${data._id}:`, error);
    throw error;
  }
};

/**
 * Fetch all cabinet locations, optionally filtered by licencee.
 *
 * @param licencee - (Optional) Licencee filter for locations.
 * @returns Promise resolving to an array of locations, or an empty array on error.
 */
export const fetchCabinetLocations = async (licencee?: string) => {
  try {
    // Note: API might expect either "licencee" or "licencee" so we'll try both formats
    let params: Record<string, string> = {};
    if (licencee) {
      // Include both parameter naming conventions to be safe
      params = { licencee };
    }

    const response = await axios.get('/api/machines/locations', {
      params,
      headers: getAuthHeaders(),
    });

    if (!response.status || response.status >= 400) {
      console.error(`Error fetching locations: ${response.status}`);
      return [];
    }

    // Check both possible response formats
    const locationsList = response.data?.locations || response.data?.data || [];

    if (Array.isArray(locationsList)) {
      return locationsList;
    } else {
      console.error('Locations data is not an array:', locationsList);
      return [];
    }
  } catch (error) {
    console.error('Error fetching cabinet locations:', error);
    return []; // Return empty array instead of throwing
  }
};

/**
 * Fetch cabinets for a specific location, with optional filters.
 *
 * @param locationId - The unique identifier for the location.
 * @param licencee - (Optional) Licencee filter.
 * @param timePeriod - (Optional) Time period filter.
 * @param searchTerm - (Optional) Search term filter.
 * @param customDateRange - (Optional) Custom date range for timePeriod \"Custom\".
 * @param page - (Optional) Page number for pagination.
 * @param limit - (Optional) Page size for pagination.
 * @param currency - (Optional) Display currency for financial data conversion.
 * @returns Promise resolving to an array of cabinets, or an empty array on error.
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
    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      console.warn(
        '⚠️ No timePeriod provided to fetchCabinetsForLocation, returning empty array'
      );
      return { data: [] };
    }

    const params: Record<string, string> = {
      timePeriod: timePeriod,
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

    // Add pagination parameters
    if (page !== undefined) {
      params.page = page.toString();
    }
    if (limit !== undefined) {
      params.limit = limit.toString();
    }

    if (currency) {
      params.currency = currency;
    }

    // Add onlineStatus parameter if provided
    if (onlineStatus && onlineStatus !== 'all') {
      params.onlineStatus = onlineStatus;
    }

    // Add includeArchived parameter if provided
    if (includeArchived) {
      params.includeArchived = 'true';
    }
 
    // Add smibStatus parameter if provided
    if (smibStatus && smibStatus !== 'all') {
      params.smibStatus = smibStatus;
    }

    // Handle custom date range
    if (
      timePeriod === 'Custom' &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      // Check if dates have time components (not midnight)
      const hasTime =
        customDateRange.from.getHours() !== 0 ||
        customDateRange.from.getMinutes() !== 0 ||
        customDateRange.from.getSeconds() !== 0 ||
        customDateRange.to.getHours() !== 0 ||
        customDateRange.to.getMinutes() !== 0 ||
        customDateRange.to.getSeconds() !== 0;

      if (hasTime) {
        // Send local time with timezone offset to preserve user's time selection
        params.startDate = formatLocalDateTimeString(customDateRange.from, -4);
        params.endDate = formatLocalDateTimeString(customDateRange.to, -4);
      } else {
        // Date-only: always include time component so backend doesn't need format detection
        params.startDate =
          customDateRange.from.toISOString().split('T')[0] + 'T00:00:00.000Z';
        params.endDate =
          customDateRange.to.toISOString().split('T')[0] + 'T00:00:00.000Z';
      }
      params.timePeriod = 'Custom';
    }

    const queryString = new URLSearchParams(params).toString();

    const response = await axios.get(
      `/api/locations/${locationId}?${queryString}`,
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

    // Handle paginated response format
    if (
      data &&
      typeof data === 'object' &&
      'success' in data &&
      'data' in data
    ) {
      // New paginated format: { success: true, data: [...], pagination: {...} }
      return {
        data: Array.isArray(data.data) ? data.data : [],
        pagination: data.pagination,
      };
    } else if (data && Array.isArray(data)) {
      // Backward compatibility: direct array response
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

/**
 * Restore a soft-deleted (archived) cabinet.
 *
 * @param locationId - The ID of the location the cabinet belongs to.
 * @param cabinetId - The ID of the cabinet to restore.
 * @returns Promise resolving to the restored cabinet data.
 */
export async function restoreCabinet(locationId: string, cabinetId: string) {
  try {
    const response = await axios.patch(
      `/api/locations/${locationId}/cabinets/${cabinetId}`,
      { action: 'restore' },
      { headers: getAuthHeaders() }
    );

    if (response.data && response.data.success) {
      return response.data.data;
    }

    throw new Error(response.data?.error || 'Failed to restore cabinet');
  } catch (error) {
    console.error(`Error restoring cabinet ${cabinetId}:`, error);
    throw error;
  }
}

/**
 * Permanently delete a cabinet (hard delete).
 * Only accessible to admins and developers.
 *
 * @param locationId - The ID of the location the cabinet belongs to.
 * @param cabinetId - The ID of the cabinet to permanently delete.
 * @returns Promise resolving to the success response.
 */
export async function permanentlyDeleteCabinet(
  locationId: string,
  cabinetId: string
) {
  try {
    const response = await axios.delete(
      `/api/locations/${locationId}/cabinets/${cabinetId}?hardDelete=true`,
      { headers: getAuthHeaders() }
    );

    if (response.data && response.data.success) {
      return response.data;
    }

    throw new Error(
      response.data?.error || 'Failed to permanently delete cabinet'
    );
  } catch (error) {
    console.error(`Error permanently deleting cabinet ${cabinetId}:`, error);
    throw error;
  }
}


/**
 * Fetches cabinet/machine totals using the machines aggregation API
 * This ensures consistency between cabinets page and other pages
 * Similar to fetchDashboardTotals but for machines/cabinets
 */
export async function fetchCabinetTotals(
  activeMetricsFilter: string,
  customDateRange: import('@/lib/types').dateRange | undefined,
  selectedLicencee: string | undefined,
  displayCurrency?: string,
  signal?: AbortSignal,
  locationId?: string | string[],
  gameType?: string | string[],
  onlineStatus?: string,
  searchTerm?: string,
  membership?: string,
  smibStatus?: string
): Promise<{
  moneyIn: number;
  moneyOut: number;
  gross: number;
  jackpot: number;
  netGross: number;
} | null> {
  try {
    let url = `/api/machines/aggregation?timePeriod=${activeMetricsFilter}`;

    if (activeMetricsFilter === 'Custom' && customDateRange) {
      const fromDate =
        customDateRange.startDate ||
        customDateRange.from ||
        customDateRange.start;
      const toDate =
        customDateRange.endDate || customDateRange.to || customDateRange.end;

      if (fromDate && toDate) {
        // Convert to Date objects if they are strings or numbers
        const fDate = fromDate instanceof Date ? fromDate : new Date(fromDate);
        const tDate = toDate instanceof Date ? toDate : new Date(toDate);

        // Check if dates have time components (not midnight)
        const hasTime =
          fDate.getHours() !== 0 ||
          fDate.getMinutes() !== 0 ||
          fDate.getSeconds() !== 0 ||
          tDate.getHours() !== 0 ||
          tDate.getMinutes() !== 0 ||
          tDate.getSeconds() !== 0;

        if (hasTime) {
          // Send local time with timezone offset to preserve user's time selection
          const fromStr = formatLocalDateTimeString(fDate, -4);
          const toStr = formatLocalDateTimeString(tDate, -4);
          url += `&startDate=${fromStr}&endDate=${toStr}`;
        } else {
          // Date-only: always include time component so backend doesn't need format detection
          const fromStr = fDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
          const toStr = tDate.toISOString().split('T')[0] + 'T00:00:00.000Z';
          url += `&startDate=${fromStr}&endDate=${toStr}`;
        }
      }
    }

    if (selectedLicencee && selectedLicencee !== 'all') {
      url += `&licencee=${selectedLicencee}`;
    }

    if (displayCurrency) {
      url += `&currency=${displayCurrency}`;
    }

    if (membership && membership !== 'all') {
      url += `&membership=${encodeURIComponent(membership)}`;
    }

    if (smibStatus && smibStatus !== 'all') {
      url += `&smibStatus=${encodeURIComponent(smibStatus)}`;
    }

    // Add location filter if provided
    if (
      locationId &&
      locationId !== 'all' &&
      (Array.isArray(locationId) ? locationId.length > 0 : true)
    ) {
      const locIds = Array.isArray(locationId)
        ? locationId.join(',')
        : locationId;
      url += `&locationId=${encodeURIComponent(locIds)}`;
    }

    // Add game type filter if provided
    if (
      gameType &&
      gameType !== 'all' &&
      (Array.isArray(gameType) ? gameType.length > 0 : true)
    ) {
      const gTypes = Array.isArray(gameType) ? gameType.join(',') : gameType;
      url += `&gameType=${encodeURIComponent(gTypes)}`;
    }

    // Add status filter if provided
    if (onlineStatus && onlineStatus !== 'all') {
      url += `&onlineStatus=${encodeURIComponent(onlineStatus)}`;
    }

    // Add search term if provided
    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
    }

    const response = await axios.get(url, { signal });
    const machineData = response.data.data || [];

    // DEBUG: Log sample machine data to verify jackpot values
    if (machineData.length > 0) {
      const sample = machineData.slice(0, 3);
      console.warn(
        '[fetchCabinetTotals] Sample machine data:',
        JSON.stringify(
          sample.map((m: Record<string, unknown>) => ({
            _id: m._id,
            moneyOut: m.moneyOut,
            jackpot: m.jackpot,
            includeJackpot: m.includeJackpot,
            gross: m.gross,
          })),
          null,
          2
        )
      );
    }

    // Sum up totals from all machines
    const totals = machineData.reduce(
      (
        acc: {
          moneyIn: number;
          moneyOut: number;
          gross: number;
          jackpot: number;
          netGross: number;
        },
        machine: {
          moneyIn?: number;
          moneyOut?: number;
          gross?: number;
          jackpot?: number;
          netGross?: number;
          includeJackpot?: boolean;
        }
      ) => {
        const moneyIn = Number(machine.moneyIn) || 0;
        const moneyOut = Number(machine.moneyOut) || 0;
        const gross =
          machine.gross !== undefined
            ? Number(machine.gross)
            : moneyIn - moneyOut;
        const jackpot = Number(machine.jackpot) || 0;

        const netGross =
          machine.netGross !== undefined ? Number(machine.netGross) : 0;

        return {
          moneyIn: acc.moneyIn + moneyIn,
          moneyOut: acc.moneyOut + moneyOut,
          gross: acc.gross + gross,
          jackpot: acc.jackpot + jackpot,
          netGross: acc.netGross + netGross,
        };
      },
      { moneyIn: 0, moneyOut: 0, gross: 0, jackpot: 0, netGross: 0 }
    );

    // DEBUG: Log final totals
    console.warn(
      '[fetchCabinetTotals] Final totals:',
      JSON.stringify(
        {
          moneyIn: totals.moneyIn,
          moneyOut: totals.moneyOut,
          jackpot: totals.jackpot,
          gross: totals.gross,
          baseCancelledCredits: totals.moneyOut - totals.jackpot,
        },
        null,
        2
      )
    );

    return totals;
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }
    console.error('Error fetching cabinet totals:', error);
    return null;
  }
}

export const updateMachineCollectionHistory = async (
  machineId: string,
  collectionHistoryEntry?: {
    _id?: string;
    metersIn: number;
    metersOut: number;
    prevMetersIn: number;
    prevMetersOut: number;
    timestamp: Date;
    locationReportId: string;
  },
  operation: 'add' | 'update' | 'delete' = 'add',
  entryId?: string
) => {
  try {
    const response = await axios.patch(
      `/api/machines/${machineId}/collection-history`,
      {
        operation,
        entry: collectionHistoryEntry,
        entryId,
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error updating collection history for machine ${machineId}:`,
      error
    );
    throw error;
  }
};
