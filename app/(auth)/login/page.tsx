'use client';

import LoginForm from '@/components/auth/LoginForm';
import LiquidGradient from '@/components/ui/LiquidGradient';
import PasswordUpdateModal from '@/components/ui/PasswordUpdateModal';
import ProfileValidationModal from '@/components/ui/ProfileValidationModal';
import { LoginPageSkeleton } from '@/components/ui/skeletons/LoginSkeletons';
import { loginUser } from '@/lib/helpers/clientAuth';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUserStore } from '@/lib/store/userStore';
import { checkForDatabaseMismatch } from '@/lib/utils/databaseMismatch';
import { getDefaultRedirectPathFromRoles } from '@/lib/utils/roleBasedRedirect';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

// Import images as variables for better performance
import EOSLogo from '/public/EOS_Logo.png';
import SlotMachineImage from '/public/slotMachine.png';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { setUser, clearUser } = useUserStore();
  const [isMounted, setIsMounted] = useState(false);
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
  const [invalidProfileFields, setInvalidProfileFields] = useState<{
    username?: boolean;
    firstName?: boolean;
    lastName?: boolean;
  }>({});
  const [currentUserData, setCurrentUserData] = useState<{
    username: string;
    firstName: string;
    lastName: string;
  }>({
    username: '',
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    setIsMounted(true);

    // Load saved identifier if "Remember Me" was checked
    const savedIdentifier = localStorage.getItem('rememberedIdentifier');
    const wasRemembered = localStorage.getItem('rememberMe') === 'true';

    if (savedIdentifier && wasRemembered) {
      setIdentifier(savedIdentifier);
      setRememberMe(true);
    }

    // Check for database mismatch and handle it
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
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
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
  }, [user, loading, redirecting, authLoading, hasRedirected, router]);

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
        // Check if password update is required
        if (response.requiresPasswordUpdate) {
          setShowPasswordUpdateModal(true);
          setLoading(false);
          return;
        }

        // Check if profile update is required
        if (response.requiresProfileUpdate && response.invalidProfileFields) {
          setInvalidProfileFields(response.invalidProfileFields);
          setCurrentUserData({
            username: response.user?.username || '',
            firstName: response.user?.profile?.firstName || '',
            lastName: response.user?.profile?.lastName || '',
          });
          setShowProfileValidationModal(true);
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

        console.warn(
          '📝 Credentials validated, now verifying token and setting user store...'
        );

        // Set redirecting FIRST to prevent the useEffect redirect from interfering
        setRedirecting(true);

        // Verify that cookies are actually set by making a test request
        try {
          // Suppress console errors for this expected request
          const originalError = console.error;
          console.error = () => {}; // Temporarily disable console.error

          const testResponse = await fetch('/api/test-current-user');
          const testData = await testResponse.json();

          // Restore console.error
          console.error = originalError;

          // Debug: Log cookie verification result
          console.warn('🍪 Cookie Verification Result:', {
            status: testResponse.status,
            success: testData.success,
            userId: testData.userId,
            cookies: document.cookie,
          });

          if (!testData.success || !testData.userId) {
            console.error(
              '❌ Token verification failed - cookies not set properly'
            );
            setMessage(
              'Login failed - session could not be established. Please try again.'
            );
            setMessageType('error');
            setRedirecting(false);
            clearUser();
            setLoading(false);
            return;
          }

          console.warn(
            '✅ Token verified successfully, userId from cookie:',
            testData.userId
          );
        } catch (error) {
          console.error('❌ Token verification request failed:', error);
          setMessage(
            'Login failed - unable to verify session. Please try again.'
          );
          setMessageType('error');
          setRedirecting(false);
          clearUser();
          setLoading(false);
          return;
        }

        // Now store user data in the Zustand store (after token verification)
        setUser(response.user);

        // Wait a moment to ensure the store is updated
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify that the user was actually set in the store
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

        // Only show success message after everything is verified
        setMessage('Login successful. Redirecting...');
        setMessageType('success');

        // Get redirect path based on user roles
        const redirectPath = getDefaultRedirectPathFromRoles(
          response.user?.roles || []
        );

        console.warn('🚀 Login fully verified, redirecting to:', redirectPath);

        // Mark that we've handled the redirect
        setHasRedirected(true);

        // First, clean the URL by removing error parameters
        // This ensures we don't keep the database_mismatch parameter in history
        if (window.location.search) {
          console.warn('🧹 Cleaning URL parameters before redirect...');
          window.history.replaceState({}, '', '/login');
        }

        // Use window.location.href for a hard redirect
        // This ensures clean navigation and clears any lingering state
        setTimeout(() => {
          console.warn('⏰ Executing redirect now to:', redirectPath);
          console.warn('🔐 Final state check before redirect:', {
            userInStore: !!useUserStore.getState().user,
            cookies: document.cookie.includes('token'),
            redirectPath,
          });
          window.location.href = redirectPath;
        }, 800);
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

  const handleProfileUpdate = async (data: {
    username: string;
    firstName: string;
    lastName: string;
  }) => {
    // TODO: Implement profile update API call
    if (process.env.NODE_ENV === 'development') {
      console.warn('Profile update requested:', data);
    }
    setShowProfileValidationModal(false);
    setMessage('Profile updated successfully. Redirecting...');
    setMessageType('success');
    setRedirecting(true);
    const redirectPath = getDefaultRedirectPathFromRoles(user?.roles || []);

    console.warn('👤 Profile updated, redirecting to:', redirectPath);

    // Use router.push for redirects
    setTimeout(() => {
      router.push(redirectPath);
    }, 1000); // Small delay to show success message
  };

  if (!isMounted || authLoading) {
    return <LoginPageSkeleton />;
  }

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
        loading={loading}
        invalidFields={invalidProfileFields}
        currentData={currentUserData}
      />
    </>
  );
}
