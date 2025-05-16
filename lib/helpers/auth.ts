import axios from "axios";
import { useUserStore } from "@/lib/store/userStore";

/**
 * Logs in a user with the provided email address and password.
 *
 * @param emailAddress - The user's email address.
 * @param password - The user's password.
 * @returns Promise resolving to an object indicating success or failure, and an optional message.
 */
export async function loginUser({
  emailAddress,
  password,
}: {
  emailAddress: string;
  password: string;
}) {
  try {
    const { data } = await axios.post(
      "/api/auth/login/",
      { emailAddress, password },
      { withCredentials: true }
    );

    if (data.success) {
      if (typeof window !== "undefined") {
        useUserStore.getState().setUser(data.user);
      }
      return { success: true };
    } else
      return {
        success: false,
        message: data.message || "Invalid Credentials.",
      };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: errorMessage };
  }
}

/**
 * Logs out the current user and clears user state.
 *
 * @returns Promise resolving to an object indicating success or failure, and an optional message.
 */
export async function logoutUser() {
  try {
    await axios.post("/api/auth/logout", {}, { withCredentials: true });
    if (typeof window !== "undefined") {
      useUserStore.getState().clearUser();
      window.location.href = "/login";
    }
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to log out." };
  }
}

/**
 * Sends a forgot password email to the provided email address.
 *
 * @param emailAddress - The user's email address.
 * @returns Promise resolving to an object indicating success or failure, and an optional message.
 */
export async function sendForgotPasswordEmail({
  emailAddress,
}: {
  emailAddress: string;
}) {
  try {
    const { data } = await axios.post("/api/auth/forgot-password/route", {
      emailAddress,
    });

    return data.success
      ? { success: true }
      : { success: false, message: data.message || "Request failed." };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message:
          error.response?.data?.message || "An unexpected error occurred.",
      };
    }
    return { success: false, message: "An unknown error occurred." };
  }
}
