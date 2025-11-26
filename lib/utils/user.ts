/**
 * Client-Side User Utilities
 *
 * Utility functions for managing and reading client-side user session data.
 *
 * Features:
 * - Clearing client-side session/token data
 * - Decoding JWT payloads on the client
 * - Guarding against server-side execution
 *
 * Note: Server-side user functions are in `app/api/lib/helpers/users.ts`.
 */

// ============================================================================
// Session Utilities
// ============================================================================

export function clearUserSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    sessionStorage.clear();
  }
}

// ============================================================================
// Token Helpers
// ============================================================================
export function getUserFromClient(): Record<string, unknown> | null {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Decode JWT payload (without verification for client-side)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
      } catch (error) {
        console.error('Failed to decode token:', error);
        return null;
      }
    }
  }
  return null;
}
