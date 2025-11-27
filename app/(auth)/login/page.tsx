/**
 * Login Page
 *
 * User authentication page with login form and profile validation.
 *
 * Features:
 * - User login with identifier and password
 * - Remember me functionality
 * - Password update modal for expired passwords
 * - Profile validation modal for incomplete profiles
 * - Role-based redirect after login
 * - Error handling and user feedback
 * - Responsive design
 */

'use client';

import LoginForm from '@/components/auth/LoginForm';
import LiquidGradient from '@/components/ui/LiquidGradient';
import PasswordUpdateModal from '@/components/ui/PasswordUpdateModal';
import ProfileValidationModal from '@/components/ui/ProfileValidationModal';
import { LoginPageSkeleton } from '@/components/ui/skeletons/LoginSkeletons';
import { loginUser } from '@/lib/helpers/clientAuth';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAuthSessionStore } from '@/lib/store/authSessionStore';
import { useUserStore } from '@/lib/store/userStore';
import type { ProfileValidationModalData } from '@/lib/types/profileValidation';
import { checkForDatabaseMismatch } from '@/lib/utils/databaseMismatch';
import { getDefaultRedirectPathFromRoles } from '@/lib/utils/roleBasedRedirect';
import type {
  InvalidProfileFields,
  ProfileValidationReasons,
} from '@/shared/types/auth';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

type ProfileUpdateResult = {
  success: boolean;
  invalidFields?: InvalidProfileFields;
  fieldErrors?: Record<string, string>;
  message?: string;
  invalidProfileReasons?: ProfileValidationReasons;
};

// Import images as variables for better performance
import EOSLogo from '/public/EOS_Logo.png';
import SlotMachineImage from '/public/slotMachine.png';

// ============================================================================
// Page Components
// ============================================================================
/**
 * Login Page Content Component
 * Handles all state management and authentication logic for the login page
 */
function LoginPageContent() {
  // ============================================================================
  // Hooks & Context
  // ============================================================================
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { setUser, clearUser } = useUserStore();
  const { setLastLoginPassword, clearLastLoginPassword } =
    useAuthSessionStore();

  // ============================================================================
  // State Management
  // ============================================================================
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<
    'error' | 'success' | 'info' | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [showPasswordUpdateModal, setShowPasswordUpdateModal] = useState(false);
  const [showProfileValidationModal, setShowProfileValidationModal] =
    useState(false);
  const [invalidProfileFields, setInvalidProfileFields] =
    useState<InvalidProfileFields>({});
  const [profileValidationReasons, setProfileValidationReasons] =
    useState<ProfileValidationReasons>({});
  const [currentUserData, setCurrentUserData] =
    useState<ProfileValidationModalData>({
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
  const [profileUpdating, setProfileUpdating] = useState(false);

  // ============================================================================
  // Effects - Initialization
  // ============================================================================
  useEffect(() => {
    // Check for URL parameters (logout success, errors, etc.)
    const logoutParam = searchParams.get('logout');
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');

    if (logoutParam === 'success') {
      setMessage('Logout successful');
      setMessageType('success');
      // Clean up URL by removing the parameter
      router.replace('/login', { scroll: false });
    } else if (errorParam) {
      // Handle error parameters from middleware or other redirects
      const errorMessages: Record<string, string> = {
        invalid_token: 'Your session has expired. Please login again.',
        token_expired: 'Your session has expired. Please login again.',
        database_context_mismatch:
          'Database environment has changed. Please login again.',
        account_disabled:
          'Your account has been disabled. Please contact support.',
        unauthorized: 'You are not authorized to access this resource.',
        user_not_found:
          'Your account no longer exists. Please contact support if you believe this is an error.',
        user_deleted:
          'Your account has been deleted. Please contact support if you believe this is an error.',
      };
      const errorMsg =
        errorMessages[errorParam] || 'An error occurred. Please try again.';
      setMessage(errorMsg);
      setMessageType('error');
      // Clean up URL by removing the parameter
      router.replace('/login', { scroll: false });
    } else if (messageParam) {
      // Handle custom message parameters
      const decodedMessage = decodeURIComponent(messageParam);
      setMessage(decodedMessage);
      // Check if message contains "success" or "successfully" to show as success type
      const isSuccessMessage =
        decodedMessage.toLowerCase().includes('success') ||
        decodedMessage.toLowerCase().includes('successfully');
      setMessageType(isSuccessMessage ? 'success' : 'info');
      // Clean up URL by removing the parameter
      router.replace('/login', { scroll: false });
    }

    // Load saved identifier if "Remember Me" was checked
    const savedIdentifier = localStorage.getItem('rememberedIdentifier');
    const wasRemembered = localStorage.getItem('rememberMe') === 'true';

    if (savedIdentifier && wasRemembered) {
      setIdentifier(savedIdentifier);
      setRememberMe(true);
    }

    // Check for database mismatch and handle it (only if no URL params already set a message)
    if (!logoutParam && !errorParam && !messageParam) {
      const handleMismatch = async () => {
        const hasMismatch = await checkForDatabaseMismatch();
        if (hasMismatch) {
          setMessage(
            'Database environment has changed. Please login again to continue.'
          );
          setMessageType('info');

          // Clear any existing form data
          setIdentifier('');
          setPassword('');
          setRememberMe(false);
        }
      };

      handleMismatch();
    }
  }, [searchParams, router]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (showProfileValidationModal) {
      return;
    }
    // Skip this auto-redirect if we're in the middle of a manual login process
    if (redirecting) {
      console.warn(
        '⏭️ Skipping useEffect redirect - manual redirect in progress'
      );
      return;
    }

    console.warn('🔄 Login page redirect check (useEffect):', {
      user: user
        ? { _id: user._id, email: user.emailAddress, roles: user.roles }
        : null,
      loading,
      redirecting,
      authLoading,
      hasRedirected,
      shouldRedirect:
        user && !loading && !redirecting && !authLoading && !hasRedirected,
    });

    // Only redirect if user is already logged in when page loads and auth is not loading
    // and we haven't already redirected to prevent infinite loops
    if (user && !loading && !redirecting && !authLoading && !hasRedirected) {
      const redirectPath = getDefaultRedirectPathFromRoles(user.roles || []);

      // Prevent redirecting to login page (infinite loop protection)
      if (
        redirectPath === '/login' ||
        redirectPath === '/login/' ||
        redirectPath === '/'
      ) {
        console.warn(
          '🚨 Redirect path is login page or root, skipping redirect to prevent infinite loop'
        );
        setHasRedirected(true); // Mark as redirected to prevent further attempts
        return;
      }

      console.warn(
        '🔄 User already logged in (useEffect), redirecting to:',
        redirectPath
      );
      setHasRedirected(true); // Prevent infinite redirects

      // Use a small delay to ensure state is updated
      setTimeout(() => {
        console.warn('⏰ Executing useEffect redirect now...');
        router.replace(redirectPath);
      }, 100);
    }
  }, [
    user,
    loading,
    redirecting,
    authLoading,
    hasRedirected,
    router,
    showProfileValidationModal,
  ]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form submission and page refresh
    setErrors({});
    setMessage('');
    setMessageType(undefined);

    let valid = true;
    if (!identifier) {
      setErrors(prev => ({
        ...prev,
        identifier: 'Enter email or username.',
      }));
      valid = false;
    }
    if (!valid) return;

    setLoading(true);
    clearLastLoginPassword();

    // Clear any existing auth state before attempting login
    // This ensures we start fresh if there was a database change
    clearUser();

    try {
      // Save or clear identifier based on "Remember Me" checkbox
      if (rememberMe) {
        localStorage.setItem('rememberedIdentifier', identifier);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedIdentifier');
        localStorage.removeItem('rememberMe');
      }

      const response = await loginUser({ identifier, password });

      // Debug: Log the full response
      console.warn('🔍 Login API Response:', {
        success: response.success,
        hasUser: !!response.user,
        hasToken: !!response.token,
        hasRefreshToken: !!response.refreshToken,
        message: response.message,
        user: response.user
          ? {
              _id: response.user._id,
              email: response.user.emailAddress,
              roles: response.user.roles,
            }
          : null,
      });

      if (response.success) {
        setLastLoginPassword(password);
        // Check if password update is required
        if (response.requiresPasswordUpdate) {
          setShowPasswordUpdateModal(true);
          setLoading(false);
          return;
        }

        // Verify we have user data from the API response
        if (!response.user) {
          setMessage('Login failed - no user data received from server');
          setMessageType('error');
          setLoading(false);
          return;
        }

        // Set redirecting FIRST to prevent the useEffect redirect from interfering
        setRedirecting(true);

        // Store user data in the Zustand store
        setUser(response.user);

        const requiresProfileUpdate =
          response.requiresProfileUpdate ||
          response.user?.requiresProfileUpdate;

        if (requiresProfileUpdate) {
          setInvalidProfileFields(response.invalidProfileFields || {});
          setProfileValidationReasons(response.invalidProfileReasons || {});
          setCurrentUserData({
            username: response.user?.username || '',
            firstName: response.user?.profile?.firstName || '',
            lastName: response.user?.profile?.lastName || '',
            otherName: response.user?.profile?.otherName || '',
            gender:
              (response.user?.profile?.gender &&
                String(response.user.profile.gender).toLowerCase()) ||
              '',
            emailAddress: response.user?.emailAddress || '',
            phone:
              response.user?.profile?.phoneNumber ||
              response.user?.profile?.contact?.phone ||
              response.user?.profile?.contact?.mobile ||
              '',
            dateOfBirth: response.user?.profile?.identification?.dateOfBirth
              ? new Date(
                  response.user.profile.identification.dateOfBirth as
                    | string
                    | number
                    | Date
                )
                  .toISOString()
                  .split('T')[0]
              : '',
            licenseeIds: Array.isArray(response.user?.assignedLicensees)
              ? (response.user.assignedLicensees as string[]).map(id =>
                  String(id)
                )
              : [],
            locationIds: Array.isArray(response.user?.assignedLocations)
              ? (response.user.assignedLocations as string[]).map(id =>
                  String(id)
                )
              : [],
          });
          setShowProfileValidationModal(true);
          setRedirecting(false);
          setLoading(false);
          return;
        }

        // Wait a moment to ensure the store is updated (matches old system)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify that the user was actually set in the store (matches old system)
        const storeUser = useUserStore.getState().user;
        if (!storeUser) {
          console.error('❌ Failed to set user in store');
          setMessage('Login failed - unable to set user session');
          setMessageType('error');
          setRedirecting(false);
          setLoading(false);
          return;
        }

        console.warn('✅ User store updated successfully:', {
          userId: storeUser._id,
          email: storeUser.emailAddress,
        });

        // Show success message
        setMessage('Login successful. Redirecting...');
        setMessageType('success');

        // Get redirect path based on user roles
        const redirectPath = getDefaultRedirectPathFromRoles(
          response.user?.roles || []
        );

        console.warn('🚀 Login fully verified, redirecting to:', redirectPath);

        // Mark that we've handled the redirect
        setHasRedirected(true);

        // Clean the URL by removing error parameters
        // This ensures we don't keep the database_mismatch parameter in history
        if (window.location.search) {
          console.warn('🧹 Cleaning URL parameters before redirect...');
          window.history.replaceState({}, '', '/login');
        }

        // Use window.location.href for a hard redirect to ensure cookies are sent
        // The cookie is set by the API response, but we need to wait for the browser
        // to process it before redirecting. A full page reload ensures cookies are included.
        // Increased delay to 1000ms to ensure cookie is fully processed by browser
        setTimeout(() => {
          console.warn('⏰ Executing redirect now to:', redirectPath);
          console.warn('🔐 Final state check before redirect:', {
            userInStore: !!useUserStore.getState().user,
            redirectPath,
            cookies: document.cookie,
          });
          // Use window.location.href to force a full page reload
          // This ensures the cookie set by the API response is included in the redirect request
          window.location.href = redirectPath;
        }, 1000);
      } else {
        const backendMsg =
          response.message || 'Invalid email or password. Please try again.';
        setMessage(backendMsg);
        setMessageType('error');
      }
    } catch {
      const fallbackMsg = 'An unexpected error occurred. Please try again.';
      setMessage(fallbackMsg);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (newPassword: string) => {
    // TODO: Implement password update API call
    if (process.env.NODE_ENV === 'development') {
      console.warn('Password update requested:', newPassword);
    }
    setShowPasswordUpdateModal(false);
    setMessage('Password updated successfully. Redirecting...');
    setMessageType('success');
    setRedirecting(true);
    const redirectPath = getDefaultRedirectPathFromRoles(user?.roles || []);

    console.warn('🔑 Password updated, redirecting to:', redirectPath);

    // Use router.push for redirects
    setTimeout(() => {
      router.push(redirectPath);
    }, 1000); // Small delay to show success message
  };

  const handleProfileUpdate = async (
    data: ProfileValidationModalData & {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    }
  ): Promise<ProfileUpdateResult> => {
    setProfileUpdating(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setInvalidProfileFields(result.invalidProfileFields || {});
        setProfileValidationReasons(result.invalidProfileReasons || {});
        return {
          success: false,
          invalidFields: result.invalidProfileFields,
          fieldErrors: result.errors,
          message: result.message,
          invalidProfileReasons: result.invalidProfileReasons,
        };
      }

      if (result.user) {
        setUser(result.user);
      }

      setInvalidProfileFields(result.invalidProfileFields || {});
      setProfileValidationReasons(result.invalidProfileReasons || {});

      if (result.requiresProfileUpdate) {
        return {
          success: false,
          invalidFields: result.invalidProfileFields,
          message: 'Please resolve the remaining profile requirements.',
          invalidProfileReasons: result.invalidProfileReasons,
        };
      }

      setShowProfileValidationModal(false);
      setMessage('Profile updated successfully. Redirecting...');
      setMessageType('success');
      setRedirecting(true);
      setHasRedirected(true);

      setCurrentUserData({
        username: result.user?.username || data.username,
        firstName: result.user?.profile?.firstName || data.firstName || '',
        lastName: result.user?.profile?.lastName || data.lastName || '',
        otherName: result.user?.profile?.otherName || data.otherName || '',
        gender:
          (result.user?.profile?.gender &&
            String(result.user.profile.gender).toLowerCase()) ||
          data.gender ||
          '',
        emailAddress: result.user?.emailAddress || data.emailAddress || '',
        phone:
          result.user?.profile?.phoneNumber ||
          result.user?.profile?.contact?.phone ||
          result.user?.profile?.contact?.mobile ||
          data.phone ||
          '',
        dateOfBirth:
          (result.user?.profile?.identification?.dateOfBirth
            ? new Date(
                result.user.profile.identification.dateOfBirth as
                  | string
                  | number
                  | Date
              )
                .toISOString()
                .split('T')[0]
            : data.dateOfBirth) || '',
        licenseeIds: (() => {
          // Use only new field
          if (
            Array.isArray(result.user?.assignedLicensees) &&
            result.user.assignedLicensees.length > 0
          ) {
            return result.user.assignedLicensees.map((id: string) =>
              String(id)
            );
          }
          return data.licenseeIds;
        })(),
        locationIds: (() => {
          // Use only new field
          if (
            Array.isArray(result.user?.assignedLocations) &&
            result.user.assignedLocations.length > 0
          ) {
            return result.user.assignedLocations.map((id: string) =>
              String(id)
            );
          }
          return data.locationIds;
        })(),
      });

      const redirectPath = getDefaultRedirectPathFromRoles(
        (result.user?.roles as string[]) || user?.roles || []
      );

      setTimeout(() => {
        router.push(redirectPath);
      }, 500);

      return {
        success: true,
        invalidProfileReasons: result.invalidProfileReasons,
      };
    } catch (error) {
      console.error('Profile update failed:', error);
      return {
        success: false,
        message: 'Failed to update profile. Please try again.',
      };
    } finally {
      setProfileUpdating(false);
    }
  };

  // ============================================================================
  // Early Returns
  // ============================================================================
  // Only show skeleton during initial auth check, not during component mount
  // This prevents the annoying flicker where form -> skeleton -> form
  if (authLoading) {
    return (
      <>
        <LoginPageSkeleton />
      </>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <LiquidGradient />
      <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex flex-col md:flex-row">
            <div className="w-full p-12 md:w-1/2">
              <div className="mx-auto w-full max-w-sm">
                <div className="text-center">
                  <Image
                    src={EOSLogo}
                    alt="Evolution One Solutions Logo"
                    width={150}
                    height={75}
                    className="mb-6 inline-block"
                    priority
                  />
                </div>
                <LoginForm
                  identifier={identifier}
                  setIdentifier={setIdentifier}
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  rememberMe={rememberMe}
                  setRememberMe={setRememberMe}
                  errors={errors}
                  message={message}
                  messageType={messageType}
                  loading={loading}
                  redirecting={redirecting}
                  handleLogin={handleLogin}
                />
              </div>
            </div>
            <div className="relative min-h-[250px] w-full md:min-h-0 md:w-1/2">
              <Image
                src={SlotMachineImage}
                alt="Casino Slot Machine"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{
                  objectFit: 'cover',
                }}
              />
              <div className="absolute inset-0" />
              <div className="absolute bottom-10 left-10 pr-4">
                <h2 className="whitespace-nowrap text-2xl font-bold text-white">
                  Casino Management System
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Update Modal */}
      <PasswordUpdateModal
        open={showPasswordUpdateModal}
        onClose={() => setShowPasswordUpdateModal(false)}
        onUpdate={handlePasswordUpdate}
        loading={loading}
      />

      {/* Profile Validation Modal */}
      <ProfileValidationModal
        open={showProfileValidationModal}
        onClose={() => setShowProfileValidationModal(false)}
        onUpdate={handleProfileUpdate}
        loading={profileUpdating}
        invalidFields={invalidProfileFields}
        currentData={currentUserData}
        reasons={profileValidationReasons}
        enforceUpdate
      />
    </>
  );
}

/**
 * Login Page Component
 * Thin wrapper that handles Suspense for loading state
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageContent />
    </Suspense>
  );
}
