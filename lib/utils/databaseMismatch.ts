import { useUserStore } from '@/lib/store/userStore';

/**
 * Detects database mismatch and clears user state
 * This should be called when database connection changes
 */
export async function handleDatabaseMismatch() {
  if (typeof window === 'undefined') return;

  const { clearUser } = useUserStore.getState();

  // Clear user state from store
  clearUser();

  // Clear localStorage
  localStorage.removeItem('user-auth-store');
  localStorage.removeItem('rememberedIdentifier');
  localStorage.removeItem('rememberMe');

  // Clear sessionStorage
  sessionStorage.clear();

  // Call server-side session clearing API
  try {
    await fetch('/api/auth/clear-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.warn('Failed to clear server-side session:', error);
  }

  // Clear all cookies (client-side cleanup)
  document.cookie.split(';').forEach(c => {
    const eqPos = c.indexOf('=');
    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
  });

  console.warn('Database mismatch detected - cleared user state and storage');
}

