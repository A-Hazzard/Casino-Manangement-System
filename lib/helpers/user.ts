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
    // Don't log as error if it's a 401 - this is expected when auth is bypassed
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.warn(
        "Token API returned 401 - user may not be authenticated or auth is bypassed"
      );
    } else {
      console.error("Failed to fetch userId:", error);
    }
    return null;
  }
}
