/**
 * useLoginPageData Hook
 *
 * Coordinates all authentication logic, URL parameters, and profile validation
 * for the login dashboard.
 */

'use client';

import { loginUser, logoutUser } from '@/lib/helpers/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAuthSessionStore } from '@/lib/store/authSessionStore';
import { useUserStore } from '@/lib/store/userStore';
import { getDefaultRedirectPathFromRoles } from '@/lib/utils/roleBasedRedirect';

import type { UserAuthPayload } from '@/shared/types/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { UserRole } from '../../constants/roles';


export function useLoginPageData() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading } = useAuth();
  const { setUser, clearUser } = useUserStore();
  const { setLastLoginPassword, clearLastLoginPassword } =
    useAuthSessionStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<
    'error' | 'success' | 'info'
  >();
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // === Password Update Modal State ===
  const [showPasswordUpdateModal, setShowPasswordUpdateModal] = useState(false);
  // Stores the authenticated user pending password change
  const pendingUserRef = useRef<UserAuthPayload | null>(null);
  // Stores the plain-text password typed at login (for "currentPassword" in the modal)
  const loginPasswordRef = useRef<string>('');

  // Derived: is this a cashier changing their temp password?
  const isCashierTempChange =
    pendingUserRef.current?.roles?.includes('cashier') &&
    pendingUserRef.current?.tempPasswordChanged === false;

  // === Login Handler ===
  const handleLogin = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!identifier)
        return setErrors({ identifier: 'Enter email or username.' });

      setLoading(true);
      setErrors({});
      clearLastLoginPassword();
      clearUser();

      try {
        if (rememberMe) {
          localStorage.setItem('rememberedIdentifier', identifier);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberedIdentifier');
          localStorage.removeItem('rememberMe');
        }

        const res = await loginUser({ identifier, password });
        if (res.success) {
          setLastLoginPassword(password);
          loginPasswordRef.current = password;

          if (res.requiresPasswordUpdate) {
            // Store user data so modal can access it
            pendingUserRef.current = res.user ?? null;
            setShowPasswordUpdateModal(true);
            return;
          }

          setUser(res.user!);
          setMessage('Login successful. Redirecting...');
          setMessageType('success');
          setRedirecting(true);

          const path = getDefaultRedirectPathFromRoles(res.user?.roles as UserRole[] || []);
          window.location.href = path;
        } else {
          setMessage(res.message || 'Invalid credentials');
          setMessageType('error');
        }
      } catch {
        setMessage('An unexpected error occurred');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    },
    [
      identifier,
      password,
      rememberMe,
      clearLastLoginPassword,
      clearUser,
      setUser,
      setLastLoginPassword,
    ]
  );

  // === Password Update Handler (called from modal) ===
  const handlePasswordUpdate = useCallback(
    async (currentPassword: string, newPassword: string, phone?: string): Promise<string | null> => {
      setLoading(true);
      try {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            // Profile fields — pass existing data so validation doesn't fail
            username: pendingUserRef.current?.username || '',
            firstName: pendingUserRef.current?.profile?.firstName || '',
            lastName: pendingUserRef.current?.profile?.lastName || '',
            emailAddress: pendingUserRef.current?.emailAddress || '',
            phone: phone || '',
            // Password change fields
            currentPassword,
            newPassword,
            confirmPassword: newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          // Return error message for the modal to display
          return (
            data.errors?.currentPassword ||
            data.errors?.newPassword ||
            data.message ||
            'Failed to update password. Please try again.'
          );
        }

        // Success — set the user and redirect
        if (data.user) setUser(data.user);
        setShowPasswordUpdateModal(false);
        setMessage('Password updated successfully. Redirecting...');
        setMessageType('success');
        setRedirecting(true);

        const roles = (pendingUserRef.current?.roles as UserRole[]) || [];
        const path = getDefaultRedirectPathFromRoles(roles);
        window.location.href = path;

        return null; // null = success
      } catch {
        return 'An unexpected error occurred. Please try again.';
      } finally {
        setLoading(false);
      }
    },
    [setUser]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      clearUser();
      setShowPasswordUpdateModal(false);
      setMessage('Logged out');
      setMessageType('info');
    }
  }, [clearUser]);

  // URL Parameter Handling
  useEffect(() => {
    const logout = searchParams.get('logout');
    const error = searchParams.get('error');
    const msg = searchParams.get('message');

    if (logout === 'success') {
      setMessage('Logout successful');
      setMessageType('success');
    } else if (error) {
      setMessageType('error');
      setMessage(
        error === 'invalid_token' ? 'Session expired' : 'An error occurred'
      );
    } else if (msg) {
      setMessage(decodeURIComponent(msg));
      setMessageType('info');
    }

    if (logout || error || msg) router.replace('/login', { scroll: false });
  }, [searchParams, router]);

  // Remember Me Init
  useEffect(() => {
    const saved = localStorage.getItem('rememberedIdentifier');
    if (saved && localStorage.getItem('rememberMe') === 'true') {
      setIdentifier(saved);
      setRememberMe(true);
    }
  }, []);

  return {
    identifier,
    password,
    showPassword,
    rememberMe,
    errors,
    message,
    messageType,
    loading,
    redirecting,
    authLoading,
    showPasswordUpdateModal,
    isCashierTempChange: !!isCashierTempChange,
    setIdentifier,
    setPassword,
    setShowPassword,
    setRememberMe,
    handleLogin,
    setShowPasswordUpdateModal,
    handlePasswordUpdate,
    handleLogout,
  };
}