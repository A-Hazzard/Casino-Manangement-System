/**
 * Axios Interceptor Utility
 *
 * Sets up axios interceptors to handle authentication errors and database mismatches.
 *
 * Features:
 * - 401 error handling (unauthorized)
 * - Database mismatch detection and handling
 * - Session invalidation handling
 * - Automatic token clearing
 * - User-friendly error messages
 * - Redirect to login on authentication failures
 */

import axios from 'axios';
import { toast } from 'sonner';
import { handleDatabaseMismatch } from './databaseMismatch';

// ============================================================================
// Interceptor Setup
// ============================================================================
/**
 * Sets up axios interceptors to handle authentication errors
 */
export function setupAxiosInterceptors() {
  // Response interceptor to handle 401 errors (database mismatch, session invalidation, etc.)
  axios.interceptors.response.use(
    response => response,
    error => {
      // Check for 401 Unauthorized errors
      if (error.response?.status === 401) {
        const errorMessage = error.response.data?.message || '';
        const errorCode = error.response.data?.error || '';

        // Check if it's a database mismatch error
        if (
          errorMessage.includes('database') ||
          errorMessage.includes('context') ||
          errorMessage.includes('mismatch') ||
          errorCode === 'database_mismatch' ||
          errorCode === 'database_context_mismatch'
        ) {
          console.warn('🔒 Database mismatch detected in API response');
          handleDatabaseMismatch();

          // Clear all authentication-related cookies and storage
          if (typeof window !== 'undefined') {
            // Clear all cookies
            document.cookie.split(';').forEach((c) => {
              const cookieName = c.replace(/^ +/, '').split('=')[0];
              document.cookie = `${cookieName}=;expires=${new Date(0).toUTCString()};path=/`;
            });
            
            // Clear localStorage and sessionStorage
            localStorage.clear();
            sessionStorage.clear();

            // Try to clear all tokens via API first
            // Use promise-based approach instead of await in non-async function
            axios
              .post('/api/auth/clear-all-tokens')
              .then(() => {
                console.warn('✅ All tokens cleared via API');
              })
              .catch(clearError => {
                console.warn('⚠️ Failed to clear tokens via API:', clearError);
              })
              .finally(() => {
                // Redirect to login with database mismatch error
                toast.error('Database connection has changed. Please login again.', {
                  duration: 5000,
                });
                setTimeout(() => {
                  window.location.href = '/login?error=database_context_mismatch';
                }, 1000);
              });
          }
          
          return Promise.reject(error);
        } else {
          // Any other 401 error (session invalidation, expired token, etc.)
          console.warn('🔒 Session invalidated or authentication failed');
          
          if (typeof window !== 'undefined') {
            // Determine the appropriate message based on context
            const currentPath = window.location.pathname;
            const requestUrl = error.config?.url || '';
            
            // Check if we're already on the login page - if so, silently handle the error
            // This prevents annoying "session expired" messages when just visiting the login page
            const isOnLoginPage = 
              currentPath === '/login' || 
              currentPath === '/authentication' ||
              currentPath.startsWith('/login?') ||
              currentPath.startsWith('/authentication?');
            
            // Check if this is from a manual logout
            const isLogout = requestUrl.includes('/api/auth/logout');
            
            // Check if we just logged out (within last 5 seconds)
            // This helps show "Logged out successfully" instead of "session expired" for 401s after logout
            let justLoggedOut = false;
            if (typeof window !== 'undefined') {
              const justLoggedOutTimestamp = sessionStorage.getItem('just-logged-out');
              if (justLoggedOutTimestamp) {
                const timeSinceLogout = Date.now() - parseInt(justLoggedOutTimestamp, 10);
                if (timeSinceLogout < 5000) { // 5 seconds
                  justLoggedOut = true;
                } else {
                  // Clean up old flag
                  sessionStorage.removeItem('just-logged-out');
                }
              }
            }
            
            // Check if this is from the current-user endpoint on login page (expected 401)
            const isCurrentUserOnLoginPage = 
              isOnLoginPage && requestUrl.includes('/api/auth/current-user');
            
            // Skip showing error if we're on login page and it's a current-user check
            // This is expected behavior - no valid session on login page
            if (isCurrentUserOnLoginPage) {
              // Silently handle - this is expected when not logged in
              return Promise.reject(error);
            }
            
            let message: string;
            let toastType: 'error' | 'success' = 'error';
            let redirectUrl = '/login?error=token_expired';
            
            // Check if we're already on login page with logout=success - preserve it
            const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
            const hasLogoutSuccess = currentUrl.includes('logout=success');
            
            if (isLogout || justLoggedOut || hasLogoutSuccess) {
              // Manual logout or just logged out - show success message
              message = 'Logged out successfully';
              toastType = 'success';
              redirectUrl = '/login?logout=success'; // Use logout=success instead of error
            } else if (errorMessage.includes('session') || errorMessage.includes('permission')) {
              // Session version mismatch (permissions changed)
              message = 'Your permissions have changed. Please login again.';
            } else {
              // Regular session expiration
              message = 'Your session has expired. Please login again.';
            }
            
            // Show toast notification
            // Don't show toast for logout - the login page will show the success message
            // For other errors: only show if not on login page
            if (!isOnLoginPage && !(isLogout || justLoggedOut || hasLogoutSuccess)) {
              if (toastType === 'success') {
                toast.success(message, {
                  duration: 3000,
                  description: 'Redirecting to login page...',
                });
              } else {
                toast.error(message, {
                  duration: 5000,
                  description: 'Redirecting to login page...',
                });
              }
            }
            
            // Clear local storage
            localStorage.removeItem('user-auth-store');
            
            // Try to clear tokens via API (skip if already logging out)
            const clearTokensPromise = isLogout
              ? Promise.resolve()
              : axios
                  .post('/api/auth/clear-all-tokens')
                  .then(() => {
                    console.warn('✅ Session cleared');
                  })
                  .catch(clearError => {
                    console.warn('⚠️ Failed to clear tokens:', clearError);
                  });
            
            clearTokensPromise.finally(() => {
              // Only redirect if:
              // 1. Not on login page, OR
              // 2. On login page but it's a logout and we need to update URL to ?logout=success
              const isLogoutFlow = isLogout || justLoggedOut || hasLogoutSuccess;
              const needsUrlUpdate = isOnLoginPage && isLogoutFlow && !hasLogoutSuccess;
              const shouldRedirect = !isOnLoginPage || needsUrlUpdate;
              
              if (shouldRedirect) {
                // For logout, use a very short delay since we're already redirecting
                // For other errors, use a longer delay to show the toast
                const redirectDelay = isLogoutFlow ? 50 : 1500;
                setTimeout(() => {
                  // Only redirect if URL is different to avoid unnecessary navigation
                  const currentUrl = window.location.pathname + window.location.search;
                  if (currentUrl !== redirectUrl) {
                    window.location.href = redirectUrl;
                  }
                }, redirectDelay);
              }
            });
          }
        }
      }

      return Promise.reject(error);
    }
  );

  // Request interceptor to add error handling context
  axios.interceptors.request.use(
    config => config,
    error => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );
}

