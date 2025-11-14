import { useAuthSessionStore } from '@/lib/store/authSessionStore';
import type { AuthResult } from '@/shared/types/auth';

export async function loginUser(credentials: {
  identifier: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = 'Login failed';
      if (response.status === 401) {
        errorMessage = data.message || 'Invalid credentials';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later';
      }
      return { success: false, message: errorMessage };
    }

    // Extract user data from nested structure
    return {
      success: data.success,
      message: data.message,
      user: data.data?.user,
      expiresAt: data.data?.expiresAt,
      token: data.data?.token,
      refreshToken: data.data?.refreshToken,
      requiresPasswordUpdate: data.data?.requiresPasswordUpdate,
      requiresProfileUpdate: data.data?.requiresProfileUpdate,
      invalidProfileFields: data.data?.invalidProfileFields,
      invalidProfileReasons: data.data?.invalidProfileReasons,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Network error occurred. Please check your connection',
    };
  }
}

export async function logoutUser(): Promise<AuthResult> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    // Clear client-side storage regardless of API response
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user-auth-store');
      sessionStorage.clear();
    }
    useAuthSessionStore.getState().clearLastLoginPassword();

    if (!response.ok) {
      return { success: false, message: 'Logout failed' };
    }

    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    console.error('Logout error:', error);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user-auth-store');
      sessionStorage.clear();
    }
    useAuthSessionStore.getState().clearLastLoginPassword();
    return { success: true, message: 'Logged out locally' };
  }
}
