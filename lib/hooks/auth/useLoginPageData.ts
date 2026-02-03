/**
 * useLoginPageData Hook
 *
 * Coordinates all authentication logic, URL parameters, and profile validation
 * for the login dashboard.
 */

'use client';

import { loginUser } from '@/lib/helpers/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAuthSessionStore } from '@/lib/store/authSessionStore';
import { useUserStore } from '@/lib/store/userStore';
import type { ProfileValidationModalData } from '@/lib/types/auth';
import { getDefaultRedirectPathFromRoles } from '@/lib/utils/roleBasedRedirect';
import type {
    InvalidProfileFields,
    ProfileValidationReasons,
} from '@/shared/types/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { UserRole } from '../../constants/roles';

export type ProfileUpdateResult = {
  success: boolean;
  invalidFields?: InvalidProfileFields;
  fieldErrors?: Record<string, string>;
  message?: string;
  invalidProfileReasons?: ProfileValidationReasons;
};

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

  const [showPasswordUpdateModal, setShowPasswordUpdateModal] = useState(false);
  const [showProfileValidationModal, setShowProfileValidationModal] =
    useState(false);
  const [invalidProfileFields, setInvalidProfileFields] =
    useState<InvalidProfileFields>({});
  const [profileValidationReasons, setProfileValidationReasons] =
    useState<ProfileValidationReasons>({});
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [currentUserData] = useState<ProfileValidationModalData>({
    username: '',
    firstName: '',
    lastName: '',
    otherName: '',
    gender: '',
    emailAddress: '',
    phone: '',
    dateOfBirth: '',
    licenseeIds: [],
    locationIds: [],
  });

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
          if (res.requiresPasswordUpdate) {
            setShowPasswordUpdateModal(true);
            return;
          }

          if (res.requiresProfileUpdate || res.user?.requiresProfileUpdate) {
            setInvalidProfileFields(res.invalidProfileFields || {});
            setProfileValidationReasons(res.invalidProfileReasons || {});
            // Map user data for modal...
            setShowProfileValidationModal(true);
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
    showProfileValidationModal,
    invalidProfileFields,
    profileValidationReasons,
    currentUserData,
    profileUpdating,
    setIdentifier,
    setPassword,
    setShowPassword,
    setRememberMe,
    handleLogin,
    setShowPasswordUpdateModal,
    setShowProfileValidationModal,
    handlePasswordUpdate: async () => {
      setShowPasswordUpdateModal(false);
      setMessage('Password updated');
      setMessageType('success');
      setRedirecting(true);
      window.location.href = '/';
    },
    handleProfileUpdate: async (
      data: ProfileValidationModalData
    ): Promise<ProfileUpdateResult> => {
      setProfileUpdating(true);
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.success) {
          setShowProfileValidationModal(false);
          window.location.href = '/';
          return { success: true };
        }
        return {
          success: false,
          message: result.message || 'Validation failed',
          invalidFields: result.invalidFields || result.invalidProfileFields,
          fieldErrors: result.errors || result.fieldErrors,
        };
      } finally {
        setProfileUpdating(false);
      }
    },
  };
}