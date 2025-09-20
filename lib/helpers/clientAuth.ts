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
      return { success: false, message: data.error || "Login failed" };
    }

    return data;
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Network error occurred" };
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      sessionStorage.clear();
    }

    if (!response.ok) {
      return { success: false, message: "Logout failed" };
    }

    return { success: true, message: "Logged out successfully" };
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear local storage even if API call fails
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      sessionStorage.clear();
    }
    return { success: true, message: "Logged out locally" };
  }
}
