/**
 * Locations Helper Functions
 *
 * Provides helper functions for fetching and managing location data from the API.
 * It handles location retrieval, cabinet fetching, search functionality, and
 * location aggregation with financial metrics.
 *
 * Features:
 * - Fetches location details and associated cabinets
 * - Searches locations by name or ID
 * - Fetches aggregated location data with financial metrics
 * - Handles location filtering by licensee and time period
 */

import { locations } from '@/lib/types';
import { getAuthHeaders } from '@/lib/utils/auth';
import { getLicenseeObjectId } from '@/lib/utils/licenseeMapping';
import { deduplicateRequest } from '@/lib/utils/requestDeduplication';
import { GamingMachine as Cabinet } from '@/shared/types/entities';
import axios from 'axios';
import { DateRange } from 'react-day-picker';
import { TimePeriod } from '../types/api';
import { AggregatedLocation, LocationData } from '../types/location';

/**
 * Fetches both location details and its cabinets for a given locationId.
 *
 * @param locationId - The unique identifier for the location.
 * @param licencee - (Optional) Licencee filter for cabinets.
 * @param timePeriod - (Optional) Time period filter for cabinets.
 * @returns Promise resolving to an object with the location name and an array of cabinets.
 */
export async function fetchLocationAndCabinets(
  locationId: string,
  licencee?: string,
  timePeriod?: string
): Promise<{ name: string; cabinets: Cabinet[] }> {
  try {
    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      return { name: 'Location', cabinets: [] };
    }

    // Fetch location details
    const locationRes = await axios.get(
      `/api/locations/${locationId}?basicInfo=true`
    );
    const locationData = Array.isArray(locationRes.data)
      ? locationRes.data[0]
      : locationRes.data;
    const name = locationData?.name || locationData?.locationName || 'Location';

    // Fetch cabinets for the location
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
    const cabinetsRes = await axios.get(`/api/locations/${locationId}`, {
      params,
    });
    const cabinets: Cabinet[] = Array.isArray(cabinetsRes.data)
      ? cabinetsRes.data
      : [];

    return { name, cabinets };
  } catch (error) {
    console.error(
      `Error in fetchLocationAndCabinets for locationId ${locationId}:`,
      error
    );
    // Always return fallback structure on error
    return { name: 'Location', cabinets: [] };
  }
}

/**
 * Fetches all gaming locations from the API.
 *
 * @param licencee - (Optional) Licencee filter for locations.
 * @returns Promise resolving to an array of locations.
 */
export default async function getAllGamingLocations(
  licencee?: string
): Promise<locations> {
  try {
    const params: Record<string, string> = {};
    if (licencee && licencee !== 'all') {
      // Convert licensee name to ObjectId for API compatibility
      const licenseeObjectId = getLicenseeObjectId(licencee);
      console.log('[getAllGamingLocations] Input licencee:', licencee);
      console.log(
        '[getAllGamingLocations] Converted ObjectId:',
        licenseeObjectId
      );
      if (licenseeObjectId) {
        params.licencee = licenseeObjectId;
      }
    }

    console.log(
      '[getAllGamingLocations] Calling /api/locations with params:',
      params
    );
    const response = await axios.get<{ locations: locations }>(
      '/api/locations',
      {
        params,
        headers: getAuthHeaders(),
      }
    );
    const fetchedLocations = response.data.locations;
    console.log(
      '[getAllGamingLocations] Received locations:',
      fetchedLocations?.length || 0
    );

    return Array.isArray(fetchedLocations) ? fetchedLocations : [];
  } catch (error) {
    // Check if this is a cancellation error (expected behavior, don't log)
    const isCanceled =
      axios.isCancel(error) ||
      (error instanceof Error &&
        (error.name === 'CanceledError' ||
          error.name === 'AbortError' ||
          error.message === 'canceled' ||
          error.message === 'The user aborted a request.')) ||
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED'));

    // Re-throw cancellation errors so useAbortableRequest can handle them silently
    if (isCanceled) {
      throw error;
    }

    // Only log non-cancellation errors
    console.error('Error fetching gaming locations:', error);
    return [];
  }
}

/**
 * Fetches details for a specific location by its ID.
 *
 * @param locationId - The unique identifier for the location.
 * @param licensee - (Optional) Licensee filter for security verification.
 * @param currency - (Optional) Currency code for financial data conversion.
 * @returns Promise resolving to the location details object, or null on error.
 */
export async function fetchLocationDetails(
  locationId: string,
  licensee?: string,
  currency?: string
) {
  try {
    const params: Record<string, string> = {};
    if (licensee) {
      // Convert licensee name to ObjectId for API compatibility
      const licenseeObjectId = getLicenseeObjectId(licensee);
      if (licenseeObjectId) {
        params.licencee = licenseeObjectId;
      }
    }
    if (currency) {
      params.currency = currency;
    }

    const response = await axios.get(
      `/api/locations/${locationId}?basicInfo=true`,
      {
        params,
        headers: getAuthHeaders(),
      }
    );
    return Array.isArray(response.data) ? response.data[0] : response.data;
  } catch (error) {
    console.error(
      `Error in fetchLocationDetails for locationId ${locationId}:`,
      error
    );
    return null;
  }
}

/**
 * Fetches cabinets for a specific location, optionally filtered by time period.
 *
 * @param locationId - The unique identifier for the location.
 * @param timePeriod - (Optional) Time period filter for cabinets.
 * @param licensee - (Optional) Licensee filter for security verification.
 * @param currency - (Optional) Currency code for financial data conversion.
 * @returns Promise resolving to an array of cabinets, or an empty array on error.
 */
export async function fetchCabinets(
  locationId: string,
  timePeriod?: string,
  licensee?: string,
  currency?: string
) {
  try {
    const params: Record<string, string> = {};
    if (timePeriod) params.timePeriod = timePeriod;
    if (licensee) {
      if (licensee === 'all') {
        // Pass 'all' to API so currency conversion is applied
        params.licencee = 'all';
      } else {
        // Convert licensee name to ObjectId for API compatibility
        const licenseeObjectId = getLicenseeObjectId(licensee);
        if (licenseeObjectId) {
          params.licencee = licenseeObjectId;
        }
      }
    }
    if (currency) params.currency = currency;
    // Don't pass limit to fetch all cabinets (for totals calculation)
    // The API will return all results when limit is not provided

    // Use the main location route which returns cabinets (not /cabinets which only has POST)
    const response = await axios.get(`/api/locations/${locationId}`, {
      params,
      headers: getAuthHeaders(),
    });
    // Handle paginated response format
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data
    ) {
      return Array.isArray(response.data.data) ? response.data.data : [];
    }
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(
      `Error in fetchCabinets for locationId ${locationId}:`,
      error
    );
    return [];
  }
}

/**
 * Fetches all gaming locations and formats them for dropdowns or selection lists.
 *
 * @param licensee - (Optional) Licensee filter for locations.
 * @returns Promise resolving to an array of objects with id and name properties.
 */
export async function fetchAllGamingLocations(licensee?: string) {
  try {
    const locationsList = await getAllGamingLocations(licensee);
    if (locationsList && Array.isArray(locationsList)) {
      const formattedLocations = locationsList.map(loc => {
        const locationWithProps = loc as unknown as Record<string, unknown>;
        return {
          id:
            (locationWithProps._id as string)?.toString() ||
            (locationWithProps._id as string) ||
            '',
          name:
            (locationWithProps.name as string) ||
            (locationWithProps.locationName as string) ||
            'Unknown Location',
        };
      });
      // Sort alphabetically by name as additional safeguard
      return formattedLocations.sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  } catch (err) {
    console.error('Error fetching locations for dropdown:', err);
    return [];
  }
}

/**
 * Fetches detailed information for a location by its ID, including its name and data.
 *
 * @param locationId - The unique identifier for the location.
 * @param licensee - (Optional) Licensee filter for security verification.
 * @returns Promise resolving to an object with name and data properties, or fallback on error.
 */
export async function fetchLocationDetailsById(
  locationId: string,
  licensee?: string
) {
  try {
    // Handle empty or invalid location IDs
    if (!locationId || locationId.trim() === '') {
      return {
        name: 'Unknown Location',
        data: null,
      };
    }

    const params: Record<string, string> = {};
    if (licensee) {
      // Convert licensee name to ObjectId for API compatibility
      const licenseeObjectId = getLicenseeObjectId(licensee);
      if (licenseeObjectId) {
        params.licencee = licenseeObjectId;
      }
    }

    // Use the main locations API route to get location details
    const url = `/api/locations`;
    const response = await axios.get(url, {
      params,
      headers: getAuthHeaders(),
    });

    if (!response.data) {
      throw new Error('No location data returned from API');
    }

    // Check for security violations
    if (response.status === 403) {
      throw new Error('Location does not belong to selected licensee');
    }

    if (response.status !== 200) {
      throw new Error(`Failed to fetch location details: ${response.status}`);
    }

    // Find the specific location in the returned list
    const locations = response.data.locations || [];

    // Try multiple ways to find the location (ObjectId vs string)
    let locationData = locations.find(
      (loc: { _id: string | { toString(): string } }) => loc._id === locationId
    );
    if (!locationData) {
      locationData = locations.find(
        (loc: { _id: string | { toString(): string } }) =>
          loc._id.toString() === locationId
      );
    }
    if (!locationData) {
      locationData = locations.find(
        (loc: { _id: string | { toString(): string } }) =>
          loc._id === locationId.toString()
      );
    }

    if (!locationData) {
      // Location not found in current licensee's locations
      // This could mean the location was deleted, moved to another licensee, or doesn't exist
      console.warn(
        `Location ${locationId} not found in current licensee's locations`
      );
      return {
        name: 'Location Not Found',
        data: null,
      };
    }

    return {
      name: locationData.name || locationData.locationName || 'Location',
      data: locationData,
    };
  } catch (err) {
    console.error('Error fetching location details:', err);
    // Return fallback data instead of throwing
    return {
      name: 'Unknown Location',
      data: null,
    };
  }
}

/**
 * Fetches aggregated location data with optional filters for time period, licencee, and machine type.
 *
 * @param timePeriod - The time period to fetch data for.
 * @param licencee - (Optional) Licencee filter.
 * @param machineTypeFilter - (Optional) Machine type filter(s).
 * @returns Promise resolving to formatted location data array, or empty array on error.
 */
export const fetchLocationsData = async (
  timePeriod: TimePeriod = 'Today',
  licensee?: string,
  filters?: string,
  customDateRange?: DateRange
): Promise<AggregatedLocation[]> => {
  try {
    const params: Record<string, string> = {
      timePeriod,
    };
    if (licensee) params.licencee = licensee;
    if (filters) params.machineTypeFilter = filters;

    if (
      timePeriod === 'Custom' &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      // Extract just the date part (YYYY-MM-DD)
      params.startDate = customDateRange.from.toISOString().split('T')[0];
      params.endDate = customDateRange.to.toISOString().split('T')[0];
      params.timePeriod = 'Custom';
    }

    // Use deduplication to prevent duplicate requests
    const paramsString = new URLSearchParams(params).toString();
    const requestKey = `/api/locationAggregation?${paramsString}`;
    const responseData = await deduplicateRequest(requestKey, async signal => {
      const response = await axios.get('/api/locationAggregation', {
        params,
        signal,
      });
      return response.data;
    });

    // Handle both old array format and new paginated format
    const result = Array.isArray(responseData)
      ? responseData
      : responseData?.data || [];

    return result;
  } catch (error) {
    // Check if this is a cancellation error (expected behavior, don't log)
    const isCanceled =
      axios.isCancel(error) ||
      (error instanceof Error &&
        (error.name === 'CanceledError' ||
          error.name === 'AbortError' ||
          error.message === 'canceled' ||
          error.message === 'The user aborted a request.')) ||
      (error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED'));

    // Re-throw cancellation errors so useAbortableRequest can handle them silently
    if (isCanceled) {
      throw error;
    }

    // Only log non-cancellation errors
    console.error(' fetchLocationsData Error:', error);
    return [];
  }
};

/**
 * Searches locations with filters for search term, time period, licencee, and machine type.
 *
 * @param searchTerm - The search term to filter locations.
 * @param timePeriod - The time period to fetch data for.
 * @param licencee - (Optional) Licencee filter.
 * @param machineTypeFilter - (Optional) Machine type filter(s).
 * @returns Promise resolving to filtered location data array matching the search term, or empty array on error.
 */
export const searchLocations = async (
  term: string,
  timePeriod: TimePeriod = 'Today',
  licensee?: string,
  filters?: string,
  customDateRange?: DateRange
): Promise<LocationData[]> => {
  try {
    const params: Record<string, string> = {
      term,
      timePeriod,
    };
    if (licensee) params.licensee = licensee;
    if (filters) params.filters = filters;

    if (
      timePeriod === 'Custom' &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      // Extract just the date part (YYYY-MM-DD)
      params.startDate = customDateRange.from.toISOString().split('T')[0];
      params.endDate = customDateRange.to.toISOString().split('T')[0];
      params.timePeriod = 'Custom';
    }

    const response = await axios.get('/api/locations/search', { params });
    return response.data || [];
  } catch (error) {
    console.error('Failed to search locations:', error);
    return [];
  }
};

/**
 * Searches ALL locations for a licensee, regardless of meter data.
 * This is specifically for search functionality to show all locations.
 */
export const searchAllLocations = async (
  searchTerm: string,
  licensee?: string,
  displayCurrency?: string,
  timePeriod?: string,
  customDateRange?: { from: Date; to: Date },
  signal?: AbortSignal
): Promise<AggregatedLocation[]> => {
  try {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (licensee) params.licencee = licensee;
    if (displayCurrency) params.currency = displayCurrency;
    if (timePeriod) params.timePeriod = timePeriod;
    if (customDateRange?.from && customDateRange?.to) {
      params.startDate = customDateRange.from.toISOString();
      params.endDate = customDateRange.to.toISOString();
    }

    const response = await axios.get('/api/locations/search-all', {
      params,
      signal,
    });
    return response.data || [];
  } catch (error) {
    console.error('Failed to search all locations:', error);
    return [];
  }
};

/**
 * Fetches location metrics for map display, including machine counts and financial data.
 *
 * @param timePeriod - The time period to fetch data for.
 * @param licencee - (Optional) Licencee filter.
 * @returns Promise resolving to location metrics array with machine and financial data.
 */
/**
 * Fetches aggregated location data with financial metrics for the locations page
 * @param timePeriod - Time period filter
 * @param licensee - Licensee filter
 * @param filterString - Filter string for SMIB/Local Server filters
 * @param dateRange - Custom date range for Custom time period
 * @returns Promise resolving to an array of aggregated locations
 */
export async function fetchAggregatedLocationsData(
  timePeriod: TimePeriod,
  licensee?: string,
  machineTypeFilter?: string,
  dateRange?: { from: Date; to: Date },
  displayCurrency?: string,
  page?: number,
  limit?: number,
  signal?: AbortSignal,
  locations?: string[]
): Promise<{
  data: AggregatedLocation[];
  pagination?: {
    page: number;
    limit: number;
    total?: number;
    totalCount?: number;
    totalPages: number;
  };
}> {
  try {
    // Construct the URL with appropriate parameters
    let url = `/api/reports/locations`;

    // Add query parameters if they exist
    const queryParams = [];
    if (licensee) queryParams.push(`licensee=${encodeURIComponent(licensee)}`);
    if (timePeriod)
      queryParams.push(`timePeriod=${encodeURIComponent(timePeriod)}`);
    if (machineTypeFilter)
      queryParams.push(`machineTypeFilter=${encodeURIComponent(machineTypeFilter)}`);
    if (displayCurrency)
      queryParams.push(`currency=${encodeURIComponent(displayCurrency)}`);
      
    // Add specific locations filter
    if (locations && locations.length > 0) {
      queryParams.push(`locations=${encodeURIComponent(locations.join(','))}`);
    }

    // Add pagination parameters (default: page=1, limit=50)
    if (page !== undefined) {
      queryParams.push(`page=${page}`);
    }
    if (limit !== undefined) {
      queryParams.push(`limit=${limit}`);
    }

    // Handle custom date range
    if (timePeriod === 'Custom' && dateRange?.from && dateRange?.to) {
      // Extract just the date part (YYYY-MM-DD)
      const fromDate = dateRange.from.toISOString().split('T')[0];
      const toDate = dateRange.to.toISOString().split('T')[0];
      queryParams.push(`startDate=${fromDate}`);
      queryParams.push(`endDate=${toDate}`);
    }

    // Append query string if we have parameters
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }

    const response = await axios.get(url, {
      headers: getAuthHeaders(),
      signal,
    });

    if (response.status !== 200) {
      console.error(` API error (${response.status}):`, response.data);
      return { data: [] };
    }

    // Handle paginated response structure
    const responseData = response.data;
    if (
      responseData &&
      typeof responseData === 'object' &&
      'data' in responseData
    ) {
      // Paginated response: { data: [...], pagination: {...} }
      return {
        data: responseData.data || [],
        pagination: responseData.pagination,
      };
    } else if (Array.isArray(responseData)) {
      // Direct array response (backward compatibility)
      return { data: responseData };
    } else {
      // Fallback for unexpected structure
      console.warn('Unexpected API response structure:', responseData);
      return { data: [] };
    }
  } catch (error) {
    // Check if this is an axios cancellation using axios.isCancel()
    if (axios.isCancel(error)) {
      console.log(
        '[fetchAggregatedLocationsData] Request canceled (filter/page change)'
      );
      throw error; // Re-throw so caller (useAbortableRequest) can handle it silently
    }

    // Check for AbortError (fetch API)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[fetchAggregatedLocationsData] Request aborted');
      throw error; // Re-throw so caller can handle it silently
    }

    // Real errors - log and return empty data
    console.error('Error fetching locations data:', error);
    return { data: [] };
  }
}

export async function fetchLocationMetricsForMap(
  timePeriod: string,
  licencee?: string
) {
  try {
    const url =
      `/api/locationAggregation?timePeriod=${timePeriod}` +
      (licencee ? `&licencee=${licencee}` : '');

    const response = await axios.get(url);

    if (!response.data) {
      console.error('No data returned from location metrics API');
      return [];
    }

    // Handle both old array format and new paginated format
    return Array.isArray(response.data)
      ? response.data
      : response.data?.data || [];
  } catch (error) {
    console.error('Error fetching location metrics for map:', error);
    return [];
  }
}
