import axios from 'axios';
import { toast } from 'sonner';
import { handleDatabaseMismatch } from './databaseMismatch';

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
          errorCode === 'database_mismatch'
        ) {
          console.warn('🔒 Database mismatch detected in API response');
          handleDatabaseMismatch();

          // Try to clear all tokens via API first
          if (typeof window !== 'undefined') {
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
                window.location.href = '/login?error=database_mismatch';
              });
          }
        } else {
          // Any other 401 error (session invalidation, expired token, etc.)
          console.warn('🔒 Session invalidated or authentication failed');
          
          if (typeof window !== 'undefined') {
            // Determine the appropriate message based on context
            const currentPath = window.location.pathname;
            const requestUrl = error.config?.url || '';
            
            // Check if this is from a manual logout
            const isLogout = requestUrl.includes('/api/auth/logout');
            
            let message: string;
            let toastType: 'error' | 'success' = 'error';
            
            if (isLogout) {
              // Manual logout - show success message
              message = 'Logged out successfully';
              toastType = 'success';
            } else if (errorMessage.includes('session') || errorMessage.includes('permission')) {
              // Session version mismatch (permissions changed)
              message = 'Your permissions have changed. Please login again.';
            } else {
              // Regular session expiration
              message = 'Your session has expired. Please login again.';
            }
            
            // Show toast notification
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
              // Redirect after a short delay to allow toast to be visible
              const redirectDelay = isLogout ? 1000 : 1500;
              setTimeout(() => {
                // Only redirect if not already on login page
                if (currentPath !== '/authentication' && currentPath !== '/login') {
                  window.location.href = `/authentication?message=${encodeURIComponent(message)}`;
                }
              }, redirectDelay);
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

/**
 * Clears axios interceptors (useful for cleanup)
 */
export function clearAxiosInterceptors() {
  axios.interceptors.request.clear();
  axios.interceptors.response.clear();
}
