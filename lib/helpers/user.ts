import axios from "axios";

/**
 * Fetches the current user ID from the token API.
 *
 * @returns Promise resolving to the user ID as a string, or null on error.
 * 
 * Note: This function no longer auto-logs out on 401 to prevent random logouts.
 * The middleware and AuthProvider handle session expiration properly.
 */
export async function fetchUserId(): Promise<string | null> {
  try {
    const response = await axios.get<{ userId: string }>("/api/auth/token");
    return response.data.userId;
  } catch (error) {
    // Don't log as error if it's a 401 - this is expected when auth is bypassed
    // Just return null and let the calling component handle it
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Token API returned 401 - returning null");
      }
    } else {
      console.error("Failed to fetch userId:", error);
    }
    return null;
  }
}
