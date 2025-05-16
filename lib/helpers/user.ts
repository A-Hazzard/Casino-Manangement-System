import axios from "axios";

/**
 * Fetches the current user ID from the token API.
 *
 * @returns Promise resolving to the user ID as a string, or null on error.
 */
export async function fetchUserId(): Promise<string | null> {
  try {
    const response = await axios.get<{ userId: string }>("/api/auth/token");
    return response.data.userId;
  } catch (error) {
    console.error("Failed to fetch userId:", error);
    return null;
  }
}
