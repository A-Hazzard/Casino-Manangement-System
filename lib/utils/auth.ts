/**
 * Returns a user-friendly error message for login/auth errors.
 */
export function getFriendlyErrorMessage(
  errorMsg: string,
  isUrlError: boolean = false
): string {
  if (!errorMsg) return "An unexpected error occurred. Please try again.";
  if (isUrlError) {
    switch (errorMsg) {
      case "server_config":
        return "Server configuration error. Please contact support.";
      case "invalid_token":
      case "token_expired":
        return "Your session has expired. Please log in again.";
      case "unauthorized":
        return "You are not authorized to access this resource.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }
  if (errorMsg.includes("401"))
    return "Your session has expired or you are not authorized. Please log in again.";
  if (errorMsg.includes("403"))
    return "You are not authorized to access this resource.";
  if (errorMsg.includes("500"))
    return "A server error occurred. Please try again later.";
  if (errorMsg.toLowerCase().includes("network"))
    return "Unable to connect. Please check your internet connection.";
  if (errorMsg.toLowerCase().includes("credential"))
    return "Invalid email or password. Please try again.";
  if (errorMsg.toLowerCase().includes("user not found"))
    return "No account found with this email address.";
  if (errorMsg.toLowerCase().includes("invalid"))
    return "Invalid email or password. Please try again.";
  return "An error occurred. Please try again.";
}

/**
 * Type guard to check if error has a message property.
 */
export function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

/**
 * Get authentication token from cookies (client-side)
 */
export function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const tokenCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("token=")
  );

  if (tokenCookie) {
    return tokenCookie.split("=")[1];
  }

  return null;
}

/**
 * Create authenticated axios request config
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
