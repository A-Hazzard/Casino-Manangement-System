/**
 * Cabinets Helper Functions
 *
 * Provides helper functions for fetching and managing cabinet/machine data from the API.
 * It handles cabinet CRUD operations, location-based cabinet fetching, financial metrics,
 * and cabinet totals aggregation.
 *
 * Features:
 * - Fetches cabinets with filtering by licensee, time period, location, and search
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
import { getLicenseeObjectId } from '@/lib/utils/licenseeMapping';
import { formatLocalDateTimeString } from '@/shared/utils/dateFormat';
import { DateRange } from 'react-day-picker';
import { isAbortError } from '@/lib/utils/errorHandling';
// Activity logging removed - handled via API calls

/**
 * Fetch all cabinets with optional filtering by licensee and time period.
 *
 * @param licensee - (Optional) Licensee filter for cabinets.
 * @param timePeriod - (Optional) Time period filter for cabinets.
 * @param customDateRange - (Optional) Custom date range filter for cabinets.
 * @returns Promise resolving to an array of cabinets, or an empty array on error.
 */
export const fetchCabinets = async (
  licensee?: string,
  timePeriod?: string,
  customDateRange?: DateRange,
  currency?: string,
  page?: number,
  limit?: number,
  searchTerm?: string,
  locationId?: string,
  signal?: AbortSignal
) => {
  try {
    // Construct the URL with appropriate parameters
    let url = `/api/machines/aggregation`;

    // Add query parameters if they exist
    const queryParams = [];
    if (licensee) queryParams.push(`licensee=${encodeURIComponent(licensee)}`);

    // Add locationId parameter if provided (filter at API level for better performance)
    if (locationId && locationId !== 'all') {
      queryParams.push(`locationId=${encodeURIComponent(locationId)}`);
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
        // Date-only: send ISO date format for gaming day offset to apply
        const fromDate = customDateRange.from.toISOString().split('T')[0];
        const toDate = customDateRange.to.toISOString().split('T')[0];
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
  licensee?: string | null,
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
        // This ensures 11:45 AM AST stays as 11:45 AM, not converted to 15:45 UTC
        const fromDate = formatLocalDateTimeString(customDateRange.from, -4);
        const toDate = formatLocalDateTimeString(customDateRange.to, -4);
        queryParams.push(`startDate=${fromDate}`);
        queryParams.push(`endDate=${toDate}`);
      } else {
        // Date-only: send ISO date format for gaming day offset to apply
        const fromDate = customDateRange.from.toISOString().split('T')[0];
        const toDate = customDateRange.to.toISOString().split('T')[0];
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

    if (licensee) {
      queryParams.push(`licensee=${encodeURIComponent(licensee)}`);
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
        // Date-only: send ISO date format for gaming day offset to apply
        const fromDate = customDateRange.from.toISOString().split('T')[0];
        const toDate = customDateRange.to.toISOString().split('T')[0];
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
 * Fetch all cabinet locations, optionally filtered by licensee.
 *
 * @param licensee - (Optional) Licensee filter for locations.
 * @returns Promise resolving to an array of locations, or an empty array on error.
 */
export const fetchCabinetLocations = async (licensee?: string) => {
  try {
    // Note: API might expect either "licencee" or "licensee" so we'll try both formats
    let params: Record<string, string> = {};
    if (licensee) {
      // Include both parameter naming conventions to be safe
      params = { licensee, licencee: licensee };
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
      // Convert licensee name to ObjectId for API compatibility
      const licenseeObjectId = getLicenseeObjectId(licencee);
      if (licenseeObjectId) {
        params.licencee = licenseeObjectId;
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
        // Date-only: send ISO date format for gaming day offset to apply
        params.startDate = customDateRange.from.toISOString().split('T')[0];
        params.endDate = customDateRange.to.toISOString().split('T')[0];
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
    // CRITICAL: Check for abort errors FIRST - aborting is NOT an error, it's expected when switching filters
    // Abort errors should NEVER show error logs or throw errors
    if (isAbortError(error)) {
      // Silently return empty data - aborting is expected behavior when switching filters
      return { data: [] };
    }

    // Check if it's a 403 Unauthorized error
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const unauthorizedError = new Error(
        'Unauthorized: You do not have access to this location'
      ) as Error & { status: number; isUnauthorized: boolean };
      unauthorizedError.status = 403;
      unauthorizedError.isUnauthorized = true;
      throw unauthorizedError;
    }

    // Only log actual errors (not aborts)
    console.error('❌ Error in fetchCabinetsForLocation:', error);

    // Always return an empty array for other errors instead of throwing
    return { data: [] };
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
  signal?: AbortSignal
): Promise<{ moneyIn: number; moneyOut: number; gross: number } | null> {
  try {
    let url = `/api/machines/aggregation?timePeriod=${activeMetricsFilter}`;

    if (
      activeMetricsFilter === 'Custom' &&
      customDateRange
    ) {
      const fromDate = (customDateRange.startDate || customDateRange.from || customDateRange.start);
      const toDate = (customDateRange.endDate || customDateRange.to || customDateRange.end);

      if (fromDate && toDate) {
        const fromStr = (fromDate instanceof Date ? fromDate : new Date(fromDate)).toISOString().split('T')[0];
        const toStr = (toDate instanceof Date ? toDate : new Date(toDate)).toISOString().split('T')[0];
        url += `&startDate=${fromStr}&endDate=${toStr}`;
      }
    }

    if (selectedLicencee && selectedLicencee !== 'all') {
      url += `&licensee=${selectedLicencee}`;
    }

    if (displayCurrency) {
      url += `&currency=${displayCurrency}`;
    }

    const response = await axios.get(url, { signal });
    const machineData = response.data.data || [];

    // Sum up totals from all machines
    const totals = machineData.reduce(
      (
        acc: { moneyIn: number; moneyOut: number; gross: number },
        machine: { moneyIn?: number; moneyOut?: number; gross?: number }
      ) => ({
        moneyIn: acc.moneyIn + (machine.moneyIn || 0),
        moneyOut: acc.moneyOut + (machine.moneyOut || 0),
        gross: acc.gross + (machine.gross || 0),
      }),
      { moneyIn: 0, moneyOut: 0, gross: 0 }
    );

    return totals;
  } catch (error) {
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
