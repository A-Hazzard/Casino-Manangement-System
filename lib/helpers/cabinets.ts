import axios from "axios";
import { NewCabinetFormData, CabinetFormData } from "../types/cabinets";

import { DateRange } from "react-day-picker";
import { getAuthHeaders } from "@/lib/utils/auth";
import { createActivityLogger } from "@/lib/helpers/activityLogger";

import type { CabinetDetails, CabinetMetrics } from "@/lib/types/cabinets";

// Re-export frontend-specific types for convenience
export type { CabinetDetails, CabinetMetrics };

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
  customDateRange?: DateRange
) => {
  try {
    // Construct the URL with appropriate parameters
    let url = `/api/machines/aggregation`;

    // Add query parameters if they exist
    const queryParams = [];
    if (licensee) queryParams.push(`licensee=${encodeURIComponent(licensee)}`);

    if (
      timePeriod === "Custom" &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      queryParams.push(`startDate=${customDateRange.from.toISOString()}`);
      queryParams.push(`endDate=${customDateRange.to.toISOString()}`);
      queryParams.push(`timePeriod=${encodeURIComponent(timePeriod)}`);
    } else if (timePeriod) {
      queryParams.push(`timePeriod=${encodeURIComponent(timePeriod)}`);
    }

    // Append query string if we have parameters
    if (queryParams.length > 0) {
      url += `?${queryParams.join("&")}`;
    }

    const response = await axios.get(url, {
      headers: getAuthHeaders(),
    });

    // Check if the response contains a data property with an array
    if (response.status === 200) {
      if (response.data && response.data.success === true) {
        // API response follows { success: true, data: [...] } format
        return Array.isArray(response.data.data) ? response.data.data : [];
      } else if (response.data && Array.isArray(response.data)) {
        // API response is a direct array
        return response.data;
      } else {
        // Unexpected response format
        console.warn("Unexpected API response format:", response.data);
        return [];
      }
    }

    // If the response indicates failure or data is missing
    throw new Error(
      `Failed to fetch cabinets data. Status: ${response.status}`
    );
  } catch (error) {
    console.error("Error fetching cabinets:", error);
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
  customDateRange?: DateRange
) => {
  try {
    // Use the main machines endpoint with time period filtering
    let endpoint = `/api/machines/${cabinetId}`;

    // Add query parameters
    const queryParams = [];

    if (
      timePeriod === "Custom" &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      queryParams.push(`startDate=${customDateRange.from.toISOString()}`);
      queryParams.push(`endDate=${customDateRange.to.toISOString()}`);
      queryParams.push(`timePeriod=${encodeURIComponent(timePeriod)}`);
    } else if (timePeriod) {
      queryParams.push(`timePeriod=${encodeURIComponent(timePeriod)}`);
    }

    if (queryParams.length > 0) {
      endpoint += `?${queryParams.join("&")}`;
    }

    console.warn("[DEBUG] fetchCabinetById calling:", endpoint);
    const response = await axios.get(endpoint, {
      headers: getAuthHeaders(),
    });

    if (response.data && response.data.success) {
      return response.data.data;
    }

    throw new Error("Failed to fetch cabinet details");
  } catch (error) {
    console.error(`Error fetching cabinet with ID ${cabinetId}:`, error);
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
    const cabinetLogger = createActivityLogger("machine");

    let apiData;
    let endpoint = "/api/machines";

    if ("serialNumber" in data) {
      apiData = data;

      if (data.gamingLocation) {
        endpoint = `/api/locations/${data.gamingLocation}/cabinets`;
      } else {
        throw new Error("Gaming location is required to create a cabinet");
      }
    } else {
      apiData = data;
      if (data.location) {
        endpoint = `/api/locations/${data.location}/cabinets`;
      } else {
        throw new Error("Location is required to create a cabinet");
      }
    }

    const response = await axios.post(endpoint, apiData);

    if (response.data && response.data.success) {
      // Log the cabinet creation activity
      const cabinetId = response.data.data._id || "unknown";
      const cabinetName =
        "serialNumber" in apiData
          ? apiData.serialNumber
          : "assetNumber" in apiData
          ? apiData.assetNumber
          : "Unknown";
      const gameName =
        "game" in apiData
          ? apiData.game
          : "installedGame" in apiData
          ? apiData.installedGame
          : "Unknown";

      await cabinetLogger.logCreate(
        cabinetId,
        `${gameName} - ${cabinetName}`,
        apiData,
        `Created new cabinet: ${gameName} (${cabinetName})`
      );

      return response.data.data;
    }

    throw new Error("Failed to create cabinet");
  } catch (error) {
    console.error("Error creating cabinet:", error);
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
  timePeriod?: string
) => {
  try {
    const cabinetLogger = createActivityLogger("machine");

    // Get the machine data with gamingLocation from the new endpoint
    let cabinetUrl = `/api/machines/${data.id}`;
    if (timePeriod) {
      cabinetUrl += `?timePeriod=${encodeURIComponent(timePeriod)}`;
    }

    const cabinetResponse = await axios.get(cabinetUrl, {
      headers: getAuthHeaders(),
    });

    if (!cabinetResponse.data?.success || !cabinetResponse.data?.data) {
      throw new Error("Failed to fetch cabinet data");
    }

    const cabinet = cabinetResponse.data.data;
    if (!cabinet.gamingLocation) {
      throw new Error("Cabinet location not found");
    }

    const locationId = cabinet.gamingLocation;
    const response = await axios.put(
      `/api/locations/${locationId}/cabinets/${data.id}`,
      data
    );

    if (response.data && response.data.success) {
      // Log the cabinet update activity
      await cabinetLogger.logUpdate(
        data.id,
        `${data.installedGame || "Unknown"} - ${data.assetNumber || "Unknown"}`,
        data,
        data,
        `Updated cabinet: ${data.installedGame || "Unknown"} (${
          data.assetNumber || "Unknown"
        })`
      );

      return response.data.data;
    }

    throw new Error("Failed to update cabinet");
  } catch (error) {
    console.error(`Error updating cabinet with ID ${data.id}:`, error);
    throw error;
  }
};

/**
 * Delete a cabinet by its ID.
 *
 * @param cabinetId - The unique identifier for the cabinet.
 * @param timePeriod - Optional time period filter for fetching cabinet data.
 * @returns Promise resolving to true if deleted, or throws on error.
 */
export const deleteCabinet = async (cabinetId: string, timePeriod?: string) => {
  try {
    const cabinetLogger = createActivityLogger("machine");

    // Get the machine data with gamingLocation from the new endpoint
    let cabinetUrl = `/api/machines/${cabinetId}`;
    if (timePeriod) {
      cabinetUrl += `?timePeriod=${encodeURIComponent(timePeriod)}`;
    }

    const cabinetResponse = await axios.get(cabinetUrl, {
      headers: getAuthHeaders(),
    });

    if (!cabinetResponse.data?.success || !cabinetResponse.data?.data) {
      throw new Error("Failed to fetch cabinet data");
    }

    const cabinet = cabinetResponse.data.data;
    if (!cabinet.gamingLocation) {
      throw new Error("Cabinet location not found");
    }

    const locationId = cabinet.gamingLocation;
    const response = await axios.delete(
      `/api/locations/${locationId}/cabinets/${cabinetId}`
    );

    if (response.data && response.data.success) {
      // Log the cabinet deletion activity
      await cabinetLogger.logDelete(
        cabinetId,
        "Cabinet",
        { id: cabinetId },
        `Deleted cabinet with ID: ${cabinetId}`
      );

      return true;
    }

    throw new Error("Failed to delete cabinet");
  } catch (error) {
    console.error(`Error deleting cabinet with ID ${cabinetId}:`, error);
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

    const response = await axios.get("/api/machines/locations", {
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
      console.error("Locations data is not an array:", locationsList);
      return [];
    }
  } catch (error) {
    console.error("Error fetching cabinet locations:", error);
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
 * @returns Promise resolving to an array of cabinets, or an empty array on error.
 */
export async function fetchCabinetsForLocation(
  locationId: string,
  licencee?: string,
  timePeriod?: string,
  searchTerm?: string,
  customDateRange?: DateRange
) {
  try {
    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      console.warn(
        "⚠️ No timePeriod provided to fetchCabinetsForLocation, returning empty array"
      );
      return [];
    }

    const params: Record<string, string> = {
      timePeriod: timePeriod,
    };

    if (licencee) {
      params.licencee = licencee;
    }

    if (searchTerm) {
      params.search = searchTerm;
    }

    // Handle custom date range
    if (
      timePeriod === "Custom" &&
      customDateRange?.from &&
      customDateRange?.to
    ) {
      console.warn("Custom date range:", customDateRange);
      params.startDate = customDateRange.from.toISOString();
      params.endDate = customDateRange.to.toISOString();
      params.timePeriod = "Custom"; // Set timePeriod to "Custom" when using custom dates
      console.warn("Custom date params:", params);
    }

    const queryString = new URLSearchParams(params).toString();

    const response = await axios.get(
      `/api/locations/${locationId}?${queryString}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      }
    );

    if (response.status !== 200) {
      console.error(`❌ API error (${response.status}):`, response.data);
      return [];
    }

    const data = response.data;

    if (!data || !Array.isArray(data)) {
      console.error(`⚠️ Invalid data format received:`, data);
      return [];
    }

    return data;
  } catch (error) {
    console.error("❌ Error in fetchCabinetsForLocation:", error);
    // Always return an empty array instead of throwing
    return [];
  }
}

/**
 * Fetch detailed information for a specific cabinet at a location.
 *
 * @param locationId - The unique identifier for the location.
 * @param cabinetId - The unique identifier for the cabinet.
 * @param timePeriod - (Optional) Time period filter.
 * @param lang - (Optional) Language filter.
 * @returns Promise resolving to CabinetDetails or null on error.
 */
export async function fetchCabinetDetails(
  locationId: string,
  cabinetId: string,
  timePeriod?: string,
  lang?: string
): Promise<CabinetDetails | null> {
  // Fetching cabinet details for: ${cabinetId} at location: ${locationId}

  try {
    const params: Record<string, string> = {};

    if (timePeriod) {
      params.timePeriod = timePeriod;
    }

    if (lang) {
      params.lang = lang;
    }

    // Add a timestamp to prevent caching
    params.timestamp = new Date().getTime().toString();

    const queryString = new URLSearchParams(params).toString();
    const url = `/api/locations/${locationId}/cabinets/${cabinetId}${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status !== 200) {
      console.error(
        `❌ Cabinet details API error (${response.status}):`,
        response.data
      );
      return null;
    }

    const data = response.data;

    if (!data || typeof data !== "object") {
      console.error(`⚠️ Invalid cabinet details data format:`, data);
      return null;
    }

    return data as CabinetDetails;
  } catch (error) {
    console.error("❌ Error fetching cabinet details:", error);
    return null;
  }
}

/**
 * Update metrics data for a cabinet in a location.
 *
 * @param locationId - The ID of the location.
 * @param cabinetId - The ID of the cabinet.
 * @param timePeriod - The time period to fetch metrics for.
 * @returns Promise resolving to the updated cabinet data, or throws on error.
 */
export async function updateCabinetMetrics(
  locationId: string,
  cabinetId: string,
  timePeriod: string
) {
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const url = `/api/locations/${locationId}/cabinets/${cabinetId}?timePeriod=${timePeriod}&cacheBust=${timestamp}`;

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    if (response.status !== 200) {
      throw new Error(`Failed to update metrics. Status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error(`Error updating cabinet metrics:`, error);
    throw error;
  }
}

/**
 * Load cabinets for a specific location, with optional filters.
 *
 * @param locationId - The unique identifier for the location.
 * @param licencee - (Optional) Licencee filter.
 * @param timePeriod - (Optional) Time period filter.
 * @returns Promise resolving to an array of cabinets, or an empty array on error.
 */
export async function loadCabinetsForLocation(
  locationId: string,
  licencee?: string,
  timePeriod?: string
) {
  try {
    // Only proceed if timePeriod is provided - no fallback
    if (!timePeriod) {
      console.warn(
        "⚠️ No timePeriod provided to loadCabinetsForLocation, returning empty array"
      );
      return [];
    }

    // Fetching cabinets for location: ${locationId}

    // Create a cancel token for this request
    const cancelToken = axios.CancelToken.source();

    const params: Record<string, string> = {
      timePeriod: timePeriod,
    };

    if (licencee) {
      params.licencee = licencee;
    }

    const response = await axios.get(`/api/locations/${locationId}`, {
      params,
      cancelToken: cancelToken.token,
    });

    if (!Array.isArray(response.data)) {
      console.error("Cabinets data is not an array", response.data);
      return [];
    }

    return response.data;
  } catch (err) {
    if (axios.isCancel(err)) {
      return [];
    }
    console.error("Error fetching cabinet data:", err);
    return []; // Return empty array on error
  }
}

/**
 * Fetch collection meters history for a machine by ID.
 *
 * @param machineId - The unique identifier for the machine.
 * @returns Promise resolving to an array of collection meters history, or an empty array on error.
 */
export const fetchCollectionMetersHistory = async (machineId: string) => {
  try {
    const response = await axios.get(`/api/machines/${machineId}`, {
      params: { dataType: "collectionMetersHistory" },
    });
    return response.data?.data || [];
  } catch (error) {
    console.error(
      `Error fetching collection meters history for machine ${machineId}:`,
      error
    );
    return [];
  }
};

/**
 * Fetch machine events for a machine by ID.
 *
 * @param machineId - The unique identifier for the machine.
 * @returns Promise resolving to an array of machine events, or an empty array on error.
 */
export const fetchMachineEvents = async (machineId: string) => {
  try {
    const response = await axios.get(`/api/machines/${machineId}`, {
      params: { dataType: "machineEvents" },
    });
    return response.data?.data || [];
  } catch (error) {
    console.error(
      `Error fetching machine events for machine ${machineId}:`,
      error
    );
    return [];
  }
};

/**
 * Update machine's collectionMetersHistory array.
 *
 * @param machineId - The unique identifier for the machine.
 * @param collectionHistoryEntry - The collection history entry to add/update.
 * @param operation - The operation to perform: 'add', 'update', or 'delete'.
 * @param entryId - The ID of the entry to update or delete (required for 'update' and 'delete' operations).
 * @returns Promise resolving to success status.
 */
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
  operation: "add" | "update" | "delete" = "add",
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
