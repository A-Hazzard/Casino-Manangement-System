import axios, { CancelTokenSource } from "axios";
import {
  Cabinet,
  NewCabinetFormData,
  CabinetFormData,
} from "../types/cabinets";
import mongoose from "mongoose";
import { DateRange } from "react-day-picker";
import { getAuthHeaders } from "@/lib/utils/auth";

// Define the CabinetDetails type based on Cabinet with any additional properties that might be returned from API
export type CabinetDetails = Cabinet & {
  // Any additional properties specific to cabinet details endpoint
  gameConfig?: {
    accountingDenomination?: number;
    theoreticalRtp?: number;
    maxBet?: string;
    payTableId?: string;
  };
  smibVersion?: {
    firmware?: string;
    version?: string;
  };
  smibConfig?: {
    net?: {
      netMode?: number;
      netStaSSID?: string;
      netStaPwd?: string;
      netStaChan?: number;
    };
    mqtt?: {
      mqttSecure?: number;
      mqttQOS?: number;
      mqttURI?: string;
      mqttSubTopic?: string;
      mqttPubTopic?: string;
      mqttCfgTopic?: string;
      mqttIdleTimeS?: number;
    };
    coms?: {
      comsAddr?: number;
      comsMode?: number;
      comsRateMs?: number;
      comsRTE?: number;
      comsGPC?: number;
    };
  };
};

// Define CabinetMetrics type
export type CabinetMetrics = {
  moneyIn: number;
  moneyOut: number;
  jackpot: number;
  cancelledCredits: number;
  gross: number;
  gamesPlayed?: number;
  gamesWon?: number;
};

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

    if (customDateRange?.from && customDateRange?.to) {
      queryParams.push(`startDate=${customDateRange.from.toISOString()}`);
      queryParams.push(`endDate=${customDateRange.to.toISOString()}`);
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
 * Fetch a single cabinet by its ID.
 *
 * @param cabinetId - The unique identifier for the cabinet.
 * @returns Promise resolving to the cabinet details, or throws on error.
 */
export const fetchCabinetById = async (cabinetId: string) => {
  try {
    const response = await axios.get("/api/machines", {
      params: { id: cabinetId },
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
    let apiData;
    let endpoint = "/api/machines";

    if ("serialNumber" in data) {
      apiData = data;
      if (
        data.gamingLocation &&
        mongoose.Types.ObjectId.isValid(data.gamingLocation)
      ) {
        endpoint = `/api/locations/${data.gamingLocation}/cabinets`;
      }
    } else {
      apiData = {
        serialNumber: data.assetNumber,
        game: data.installedGame,
        gameType: "",
        isCronosMachine: false,
        accountingDenomination: data.accountingDenomination,
        cabinetType: "",
        assetStatus: data.status,
        gamingLocation: data.location,
        smibBoard: data.smbId,
        collectionSettings: {
          lastCollectionTime: new Date(),
          lastMetersIn: "0",
          lastMetersOut: "0",
        },
      };

      if (data.location && mongoose.Types.ObjectId.isValid(data.location)) {
        endpoint = `/api/locations/${data.location}/cabinets`;
      }
    }

    const response = await axios.post(endpoint, apiData);

    if (response.data && response.data.success) {
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
 * @returns Promise resolving to the updated cabinet data, or throws on error.
 */
export const updateCabinet = async (data: CabinetFormData) => {
  try {
    const response = await axios.put("/api/machines", data);

    if (response.data && response.data.success) {
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
 * @returns Promise resolving to true if deleted, or throws on error.
 */
export const deleteCabinet = async (cabinetId: string) => {
  try {
    const response = await axios.delete("/api/machines", {
      params: { id: cabinetId },
    });

    if (response.data && response.data.success) {
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
      console.log("Locations data:", locationsList);
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
 * @param searchTerm - (Optional) Search term filter.
 * @param timePeriod - (Optional) Time period filter.
 * @returns Promise resolving to an array of cabinets, or an empty array on error.
 */
export async function fetchCabinetsForLocation(
  locationId: string,
  licencee?: string,
  searchTerm?: string,
  timePeriod?: string
) {
  console.log(`🔍 Fetching cabinets for location: ${locationId}`);

  try {
    const params: Record<string, string> = {
      timePeriod: timePeriod || "today",
    };

    if (licencee) {
      params.licencee = licencee;
    }

    if (searchTerm) {
      params.search = searchTerm;
    }

    const queryString = new URLSearchParams(params).toString();
    console.log(`📡 API call to /api/locations/${locationId}?${queryString}`);

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
      // Don't throw, just return empty array
      console.log(`⚠️ Returning empty array due to API error`);
      return [];
    }

    const data = response.data;

    if (!data || !Array.isArray(data)) {
      console.error(`⚠️ Invalid data format received:`, data);
      return [];
    }

    console.log(`✅ Received ${data.length} cabinets from API`);
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
  console.log(
    `🔍 Fetching cabinet details for: ${cabinetId} at location: ${locationId}`
  );

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

    console.log(`📡 API call to ${url}`);

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

    console.log(`✅ Received cabinet details for ${cabinetId}`);
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
    console.log(`Fetching cabinets for location: ${locationId}`);

    // Create a cancel token for this request
    const cancelToken = axios.CancelToken.source();

    const params: Record<string, string> = {
      timePeriod: timePeriod || "today",
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

    console.log(`Found ${response.data.length} cabinets for location`);
    return response.data;
  } catch (err) {
    if (axios.isCancel(err)) {
      console.log("Cabinet fetch cancelled");
      return [];
    }
    console.error("Error fetching cabinet data:", err);
    return []; // Return empty array on error
  }
}

/**
 * Update cabinet metrics data from the API.
 *
 * @param cabinetId - The ID of the cabinet.
 * @param timePeriod - The time period to fetch metrics for.
 * @param cancelToken - (Optional) Axios cancel token for request cancellation.
 * @returns Promise resolving to the updated cabinet data or null if error.
 */
export async function updateCabinetMetricsData(
  cabinetId: string,
  timePeriod: string,
  cancelToken?: CancelTokenSource
): Promise<Cabinet | null> {
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const url = `/api/machines?id=${cabinetId}&timePeriod=${timePeriod}&cacheBust=${timestamp}`;

    const response = await axios.get(url, {
      cancelToken: cancelToken?.token,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.data || !response.data.data) {
      throw new Error("No data returned from metrics API");
    }

    return response.data.data;
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.error(`Error updating cabinet metrics data:`, error);
    }
    return null;
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
