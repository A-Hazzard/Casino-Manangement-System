import axios from "axios";

export type Manufacturer = string;

/**
 * Fetches unique manufacturers from the machines collection
 * @returns Promise<Manufacturer[]> - Array of unique manufacturer names
 */
export const fetchManufacturers = async (): Promise<Manufacturer[]> => {
  try {
    const response = await axios.get("/api/manufacturers");
    return response.data;
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    return [];
  }
};
