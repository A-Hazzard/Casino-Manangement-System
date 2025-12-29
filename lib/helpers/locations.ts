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
import axios from 'axios';
import { TimePeriod } from '../types/api';
import { AggregatedLocation } from '../types/location';

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
      queryParams.push(
        `machineTypeFilter=${encodeURIComponent(machineTypeFilter)}`
      );
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
