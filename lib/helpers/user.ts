import axios from "axios";

export async function fetchUserId(): Promise<string | null> {
  try {
    const response = await axios.get<{ userId: string }>("/api/auth/token");
    return response.data.userId;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Check if we're on the login page or any auth-related page - if so, don't redirect or logout
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        if (currentPath === "/login" || currentPath.startsWith("/login")) {
          console.warn(
            "Token API returned 401 on login page - no action needed"
          );
          return null;
        }
      }

      // Check if there's any user data in localStorage - if not, it's a fresh device
      const hasUserData =
        typeof window !== "undefined" &&
        (localStorage.getItem("user-auth-store") ||
          document.cookie.includes("token=") ||
          document.cookie.includes("refreshToken="));

      if (!hasUserData) {
        console.warn(
          "Token API returned 401 with no stored auth data - fresh device, no action needed"
        );
        return null;
      }

      console.warn(
        "Token API returned 401 with stored auth data - auto-logging out and redirecting to /login"
      );
      try {
        const { logoutUser } = await import("./clientAuth");
        await logoutUser();
      } finally {
        if (typeof window !== "undefined") {
          window.location.replace("/login");
        }
      }
    } else {
      console.error("Failed to fetch userId:", error);
    }
    return null;
  }
}
