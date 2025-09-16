import axios from "axios";

export type Country = {
  _id: string;
  name: string;
  alpha2: string;
  alpha3: string;
  isoNumeric: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Fetches all countries from the API
 */
export async function fetchCountries(): Promise<Country[]> {
  try {
    const response = await axios.get("/api/countries");
    if (response.data.success) {
      return response.data.countries;
    }
    throw new Error("Failed to fetch countries");
  } catch (error) {
    console.error("Error fetching countries:", error);
    throw error;
  }
}
