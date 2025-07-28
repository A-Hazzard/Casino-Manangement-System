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
      timePeriod: timePeriod || "today",
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
): Promise<locations[]> {
  try {
    const params: Record<string, string> = {};
    if (licencee && licencee !== "all") {
      params.licencee = licencee;
    }

    const response = await axios.get<{ locations: locations[] }>(
      "/api/locations",
      {
        params,
        headers: getAuthHeaders(),
      }
    );
    const fetchedLocations = response.data.locations;
    console.log("\ud83d\udccd Gaming Locations Status 200");
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
 * @returns Promise resolving to the location details object, or null on error.
 */
export async function fetchLocationDetails(locationId: string) {
  try {
    const response = await axios.get(
      `/api/locations/${locationId}?basicInfo=true`,
      {
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
 * @returns Promise resolving to an array of cabinets, or an empty array on error.
 */
export async function fetchCabinets(locationId: string, timePeriod?: string) {
  try {
    const params: Record<string, string> = {};
    if (timePeriod) params.timePeriod = timePeriod;
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
 * @returns Promise resolving to an array of objects with id and name properties.
 */
export async function fetchAllGamingLocations() {
  try {
    const locationsList = await getAllGamingLocations();
    if (locationsList && Array.isArray(locationsList)) {
      const formattedLocations = locationsList.map((loc) => ({
        id: loc._id,
        name: loc.name || loc.locationName || "Unknown Location",
      }));
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
 * @returns Promise resolving to an object with name and data properties, or fallback on error.
 */
export async function fetchLocationDetailsById(locationId: string) {
  try {
    console.log(`Fetching location details for ID: ${locationId}`);
    const url = `/api/locations/${locationId}?basicInfo=true`; // Fetch only basic info initially
    const response = await axios.get(url, {
      timeout: 15000,
      headers: getAuthHeaders(),
    });

    if (!response.data) {
      throw new Error("No location data returned from API");
    }

    const locationData = Array.isArray(response.data)
      ? response.data[0]
      : response.data;

    return {
      name: locationData.name || locationData.locationName || "Location",
      data: locationData,
    };
  } catch (err) {
    console.error("Error fetching location details:", err);
    return { name: "Location", data: null };
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

    if (customDateRange?.from && customDateRange?.to) {
      params.startDate = customDateRange.from.toISOString();
      params.endDate = customDateRange.to.toISOString();
      delete params.timePeriod;
    }

    const response = await axios.get("/api/locationAggregation", { params });
    // Handle both old array format and new paginated format
    return Array.isArray(response.data)
      ? response.data
      : response.data?.data || [];
  } catch (error) {
    console.error("Failed to fetch locations data:", error);
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

    if (customDateRange?.from && customDateRange?.to) {
      params.startDate = customDateRange.from.toISOString();
      params.endDate = customDateRange.to.toISOString();
      delete params.timePeriod;
    }

    const response = await axios.get("/api/locations/search", { params });
    return response.data.data || [];
  } catch (error) {
    console.error("Failed to search locations:", error);
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
