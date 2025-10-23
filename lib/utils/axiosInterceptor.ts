import axios from "axios";
import { handleDatabaseMismatch } from "./databaseMismatch";

/**
 * Sets up axios interceptors to handle database mismatch errors
 */
export function setupAxiosInterceptors() {
  // Response interceptor to handle database mismatch errors
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // Check for database mismatch errors
      if (error.response?.status === 401) {
        const errorMessage = error.response.data?.message || "";

        // Check if it's a database mismatch error
        if (
          errorMessage.includes("database") ||
          errorMessage.includes("context") ||
          errorMessage.includes("mismatch") ||
          error.response.data?.error === "database_mismatch"
        ) {
          console.warn("Database mismatch detected in API response");
          handleDatabaseMismatch();

          // Try to clear all tokens via API first
          if (typeof window !== "undefined") {
            // Use promise-based approach instead of await in non-async function
            axios
              .post("/api/auth/clear-all-tokens")
              .then(() => {
                console.warn(" All tokens cleared via API");
              })
              .catch((clearError) => {
                console.warn("⚠️ Failed to clear tokens via API:", clearError);
              })
              .finally(() => {
                // Redirect to login with database mismatch error
                window.location.href = "/login?error=database_mismatch";
              });
          }
        }
      }

      return Promise.reject(error);
    }
  );

  // Request interceptor to add error handling context
  axios.interceptors.request.use(
    (config) => config,
    (error) => {
      console.error("Request interceptor error:", error);
      return Promise.reject(error);
    }
  );
}

/**
 * Clears axios interceptors (useful for cleanup)
 */
export function clearAxiosInterceptors() {
  axios.interceptors.request.clear();
  axios.interceptors.response.clear();
}
