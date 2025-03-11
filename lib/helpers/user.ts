import axios from "axios";

/**
 * Fetch the current user ID from the token API.
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
