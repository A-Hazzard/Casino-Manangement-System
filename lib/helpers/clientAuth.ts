import type { AuthResult } from "../types/auth";

/**
 * Client-side login function that makes an API call to authenticate user
 *
 * @param credentials - Object containing identifier and password
 * @returns Promise resolving to authentication result
 */
export async function loginUser(credentials: {
  identifier: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle different error status codes with specific messages
      let errorMessage = "Login failed";

      if (response.status === 400) {
        errorMessage =
          data.message || "Invalid email/username or password format";
      } else if (response.status === 401) {
        errorMessage =
          data.message ||
          "Invalid credentials. Please check your email/username and password";
      } else if (response.status === 500) {
        errorMessage = "Server error. Please try again later";
      } else if (response.status === 404) {
        errorMessage = "User not found. Please check your credentials";
      } else {
        errorMessage =
          data.message || data.error || `Login failed (${response.status})`;
      }

      return { success: false, message: errorMessage };
    }

    return data;
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Network error occurred. Please check your connection",
    };
  }
}

/**
 * Client-side logout function that clears user session
 *
 * @returns Promise resolving to logout result
 */
export async function logoutUser(): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Clear client-side storage regardless of API response
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      sessionStorage.clear();
    }

    if (!response.ok) {
      return { success: false, message: "Logout failed" };
    }

    return { success: true, message: "Logged out successfully" };
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear local storage even if API call fails
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      sessionStorage.clear();
    }
    return { success: true, message: "Logged out locally" };
  }
}
