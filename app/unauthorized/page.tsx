/**
 * Unauthorized Access Page
 *
 * Displays an access denied message when a user tries to access a page they
 * don't have permission for. Provides role-based redirect options and
 * automatic redirection after 5 seconds.
 *
 * Features:
 * - Access denied message with user information
 * - Role-based redirect options
 * - Automatic redirect after 5 seconds
 * - Manual navigation buttons
 * - User role and name display
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUserStore } from '@/lib/store/userStore';
import { getRoleDisplayName } from '@/lib/utils/permissions';
import {
  getDefaultRedirectPathFromRoles,
  getRedirectDestinationNameFromRoles,
} from '@/lib/utils/roleBasedRedirect';
export default function UnauthorizedPage() {
  const router = useRouter();
  const { user } = useUserStore();

  /**
   * Auto-redirects user to their default page after 5 seconds.
   * Redirect path is determined by user's roles.
   */
  useEffect(() => {
    // Redirect after 5 seconds based on user role
    const timer = setTimeout(() => {
      const redirectPath = getDefaultRedirectPathFromRoles(user?.roles || []);
      router.push(redirectPath);
    }, 5000);

    return () => clearTimeout(timer);
  }, [router, user]);

  const userRole = user?.roles ? getRoleDisplayName(user.roles) : 'User';
  const userName =
    user?.profile?.firstName && user?.profile?.lastName
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user?.username || 'User';

  const redirectPath = getDefaultRedirectPathFromRoles(user?.roles || []);
  const redirectDestination = getRedirectDestinationNameFromRoles(
    user?.roles || []
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-gray-900">Access Denied</h1>

        <p className="mb-6 text-gray-600">
          You don&apos;t have permission to access this page.
        </p>

        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-700">
            <strong>User:</strong> {userName}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Role:</strong> {userRole}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push(redirectPath)}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Go to {redirectDestination}
          </button>

          <button
            onClick={() => router.back()}
            className="w-full rounded-md bg-gray-200 px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-300"
          >
            Go Back
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          You will be automatically redirected to {redirectDestination} in 5
          seconds.
        </p>
      </div>
    </div>
  );
}
