import axios from "axios";
import { locations } from "@/lib/types";
import { Cabinet } from "@/lib/types/cabinets";
import { LocationData, AggregatedLocation } from "../types/location";
import { TimePeriod } from "../types/api";
import { DateRange } from "react-day-picker";
import { getAuthHeaders } from "@/lib/utils/auth";

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
      console.warn(
        "⚠️ No timePeriod provided to fetchLocationAndCabinets, returning empty cabinets"
      );
      return { name: "Location", cabinets: [] };
    }

    // Fetch location details
    const locationRes = await axios.get(
      `/api/locations/${locationId}?basicInfo=true`
    );
    const locationData = Array.isArray(locationRes.data)
      ? locationRes.data[0]
      : locationRes.data;
    const name = locationData?.name || locationData?.locationName || "Location";

    // Fetch cabinets for the location
    const params: Record<string, string> = {
      timePeriod: timePeriod,
    };
    if (licencee) params.licencee = licencee;
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
    return { name: "Location", cabinets: [] };
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
    if (licencee && licencee !== "all") {
      params.licencee = licencee;
    }

    const response = await axios.get<{ locations: locations }>(
      "/api/locations",
      {
        params,
        headers: getAuthHeaders(),
      }
    );
    const fetchedLocations = response.data.locations;

    return Array.isArray(fetchedLocations) ? fetchedLocations : [];
  } catch (error) {
    console.error("Error fetching gaming locations:", error);
    return [];
  }
}

/**
 * Fetches details for a specific location by its ID.
 *
 * @param locationId - The unique identifier for the location.
 * @param licensee - (Optional) Licensee filter for security verification.
 * @returns Promise resolving to the location details object, or null on error.
 */
export async function fetchLocationDetails(
  locationId: string,
  licensee?: string
) {
  try {
    const params: Record<string, string> = {};
    if (licensee) {
      params.licencee = licensee;
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
 * @returns Promise resolving to an array of cabinets, or an empty array on error.
 */
export async function fetchCabinets(
  locationId: string,
  timePeriod?: string,
  licensee?: string
) {
  try {
    const params: Record<string, string> = {};
    if (timePeriod) params.timePeriod = timePeriod;
    if (licensee && licensee !== "all") params.licencee = licensee;

    const response = await axios.get(`/api/locations/${locationId}/cabinets`, {
      params,
      headers: getAuthHeaders(),
    });
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
      const formattedLocations = locationsList.map((loc) => {
        const locationWithProps = loc as unknown as Record<string, unknown>;
        return {
          id: (locationWithProps._id as string)?.toString() || (locationWithProps._id as string) || "",
          name: (locationWithProps.name as string) || (locationWithProps.locationName as string) || "Unknown Location",
        };
      });
      // Sort alphabetically by name as additional safeguard
      return formattedLocations.sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  } catch (err) {
    console.error("Error fetching locations for dropdown:", err);
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
    if (!locationId || locationId.trim() === "") {
      return {
        name: "Unknown Location",
        data: null,
      };
    }

    const params: Record<string, string> = {};
    if (licensee) {
      params.licencee = licensee;
    }

    // Use the main locations API route to get location details
    const url = `/api/locations`;
    const response = await axios.get(url, {
      params,
      timeout: 15000,
      headers: getAuthHeaders(),
    });

    if (!response.data) {
      throw new Error("No location data returned from API");
    }

    // Check for security violations
    if (response.status === 403) {
      throw new Error("Location does not belong to selected licensee");
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
        name: "Location Not Found",
        data: null,
      };
    }

    return {
      name: locationData.name || locationData.locationName || "Location",
      data: locationData,
    };
  } catch (err) {
    console.error("Error fetching location details:", err);
    // Return fallback data instead of throwing
    return {
      name: "Unknown Location",
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
  timePeriod: TimePeriod = "Today",
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
      timePeriod === "Custom" &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      params.startDate = customDateRange.from.toISOString();
      params.endDate = customDateRange.to.toISOString();
      params.timePeriod = "Custom"; // Set timePeriod to "Custom" when using custom dates
    }

    const response = await axios.get("/api/locationAggregation", { params });

    // Handle both old array format and new paginated format
    const result = Array.isArray(response.data)
      ? response.data
      : response.data?.data || [];

    return result;
  } catch (error) {
    console.error("❌ fetchLocationsData Error:", error);
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
  timePeriod: TimePeriod = "Today",
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
      timePeriod === "Custom" &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      params.startDate = customDateRange.from.toISOString();
      params.endDate = customDateRange.to.toISOString();
      params.timePeriod = "Custom"; // Set timePeriod to "Custom" when using custom dates
    }

    const response = await axios.get("/api/locations/search", { params });
    return response.data || [];
  } catch (error) {
    console.error("Failed to search locations:", error);
    return [];
  }
};

/**
 * Searches ALL locations for a licensee, regardless of meter data.
 * This is specifically for search functionality to show all locations.
 */
export const searchAllLocations = async (
  searchTerm: string,
  licensee?: string
): Promise<AggregatedLocation[]> => {
  try {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (licensee) params.licencee = licensee;

    const response = await axios.get("/api/locations/search-all", { params });
    return response.data || [];
  } catch (error) {
    console.error("Failed to search all locations:", error);
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
  filterString?: string,
  dateRange?: { from: Date; to: Date },
  page: number = 1,
  limit: number = 10
): Promise<{ data: AggregatedLocation[]; pagination: any }> {
  try {
    // Construct the URL with appropriate parameters
    let url = `/api/reports/locations`;

    // Add query parameters if they exist
    const queryParams = [];
    if (licensee) queryParams.push(`licensee=${encodeURIComponent(licensee)}`);
    if (timePeriod)
      queryParams.push(`timePeriod=${encodeURIComponent(timePeriod)}`);
    if (filterString)
      queryParams.push(`filters=${encodeURIComponent(filterString)}`);

    // Add pagination parameters
    queryParams.push(`page=${page}`);
    queryParams.push(`limit=${limit}`);

    // Always show all locations, even those with 0 meters (like cabinets page)
    queryParams.push(`showAllLocations=true`);

    // Handle custom date range
    if (timePeriod === "Custom" && dateRange?.from && dateRange?.to) {
      queryParams.push(`startDate=${dateRange.from.toISOString()}`);
      queryParams.push(`endDate=${dateRange.to.toISOString()}`);
    }

    // Append query string if we have parameters
    if (queryParams.length > 0) {
      url += `?${queryParams.join("&")}`;
    }

    const response = await axios.get(url, {
      headers: getAuthHeaders(),
    });

    if (response.status !== 200) {
      console.error(`❌ API error (${response.status}):`, response.data);
      return { data: [], pagination: {} };
    }

    // Handle paginated response structure
    const responseData = response.data;
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      // Paginated response: { data: [...], pagination: {...} }
      return {
        data: responseData.data || [],
        pagination: responseData.pagination || {}
      };
    } else if (Array.isArray(responseData)) {
      // Direct array response (fallback for backward compatibility)
      return {
        data: responseData,
        pagination: { page: 1, limit: responseData.length, totalCount: responseData.length }
      };
    } else {
      // Fallback for unexpected structure
      console.warn('Unexpected API response structure:', responseData);
      return { data: [], pagination: {} };
    }
  } catch (error) {
    console.error("Error fetching locations data:", error);
    return { data: [], pagination: {} };
  }
}

export async function fetchLocationMetricsForMap(
  timePeriod: string,
  licencee?: string
) {
  try {
    const url =
      `/api/locationAggregation?timePeriod=${timePeriod}` +
      (licencee ? `&licencee=${licencee}` : "");

    const response = await axios.get(url);

    if (!response.data) {
      console.error("No data returned from location metrics API");
      return [];
    }

    // Handle both old array format and new paginated format
    return Array.isArray(response.data)
      ? response.data
      : response.data?.data || [];
  } catch (error) {
    console.error("Error fetching location metrics for map:", error);
    return [];
  }
}
