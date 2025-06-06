import axios from "axios";
import { locations } from "@/lib/types";
import { Cabinet } from "@/lib/types/cabinets";

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
 * @returns Promise resolving to an array of locations.
 */
export default async function getAllGamingLocations(): Promise<locations[]> {
  try {
    const response = await axios.get<{ locations: locations[] }>(
      "/api/locations"
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
      `/api/locations/${locationId}?basicInfo=true`
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
    const response = await axios.get(url, { timeout: 15000 });

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
export async function fetchLocationsData(
  timePeriod: string,
  licencee?: string,
  machineTypeFilter?: string
) {
  try {
    const url =
      `/api/locationAggregation?timePeriod=${timePeriod}` +
      (licencee ? `&licencee=${licencee}` : "") +
      (machineTypeFilter ? `&machineTypeFilter=${machineTypeFilter}` : "");

    const response = await axios.get(url);

    if (!response.data) {
      console.error("No data returned from locations API");
      return [];
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching location data:", error);
    return [];
  }
}

/**
 * Searches locations with filters for search term, time period, licencee, and machine type.
 *
 * @param searchTerm - The search term to filter locations.
 * @param timePeriod - The time period to fetch data for.
 * @param licencee - (Optional) Licencee filter.
 * @param machineTypeFilter - (Optional) Machine type filter(s).
 * @returns Promise resolving to filtered location data array matching the search term, or empty array on error.
 */
export async function searchLocations(
  searchTerm: string,
  timePeriod: string,
  licencee?: string,
  machineTypeFilter?: string
) {
  try {
    if (!searchTerm.trim()) {
      return await fetchLocationsData(timePeriod, licencee, machineTypeFilter);
    }

    const url =
      `/api/locations/search?search=${encodeURIComponent(searchTerm)}` +
      `&timePeriod=${timePeriod}` +
      (licencee ? `&licencee=${licencee}` : "") +
      (machineTypeFilter ? `&machineTypeFilter=${machineTypeFilter}` : "");

    const response = await axios.get(url);

    if (!response.data) {
      console.error("No data returned from locations search API");
      return [];
    }

    return response.data;
  } catch (error) {
    console.error("Error searching locations:", error);
    return [];
  }
}

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

    // Transform the data to include the required fields for map display
    return response.data.map(
      (location: {
        location?: string;
        _id?: string;
        locationName?: string;
        moneyIn?: number;
        moneyOut?: number;
        gross?: number;
        totalMachines?: number;
        onlineMachines?: number;
        isLocalServer?: boolean;
        noSMIBLocation?: boolean;
      }) => ({
        _id: location.location || location._id,
        locationName: location.locationName,
        name: location.locationName, // Fallback for name field
        moneyIn: location.moneyIn || 0,
        moneyOut: location.moneyOut || 0,
        gross: location.gross || 0,
        totalMachines: location.totalMachines || 0,
        onlineMachines: location.onlineMachines || 0,
        isLocalServer: location.isLocalServer || false,
        noSMIBLocation: location.noSMIBLocation || false,
        hasSmib: !location.noSMIBLocation,
      })
    );
  } catch (error) {
    console.error("Error fetching location metrics for map:", error);
    return [];
  }
}
