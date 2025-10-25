'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { PageName, hasPageAccess } from '@/lib/utils/permissions';
import { hasAdminAccessDb, hasPageAccessDb } from '@/lib/utils/permissionsDb';

import type React from 'react';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireAdminAccess?: boolean;
  requiredPage?: PageName;
};

export default function ProtectedRoute({
  children,
  requireAdminAccess = false,
  requiredPage,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasWaitedForRoles, setHasWaitedForRoles] = useState(false);

  useEffect(() => {
    // Wait for auth to fully load
    if (isLoading) return;

    const checkAuthentication = async () => {
      // First check if user is authenticated
      if (!isAuthenticated || !user) {
        router.push('/login');
        return;
      }

      // Check if user has roles loaded
      if (!user.roles || user.roles.length === 0) {
        if (!hasWaitedForRoles) {
          // If user has no roles, wait a bit more for them to load
          setHasWaitedForRoles(true);
          setTimeout(() => {
            if (!user.roles || user.roles.length === 0) {
              console.warn(
                'User has no roles after timeout, redirecting to login'
              );
              router.push('/login');
            }
          }, 2000);
        }
        return;
      }

      // Check local permissions first (faster)
      if (requireAdminAccess && user.roles) {
        const hasAdminLocal =
          user.roles.includes('admin') ||
          user.roles.includes('evolution admin');
        if (!hasAdminLocal) {
          router.push('/'); // Redirect to dashboard if not admin
          return;
        }
      }

      if (requiredPage && user.roles) {
        const hasPageLocal = hasPageAccess(user.roles, requiredPage);
        if (!hasPageLocal) {
          router.push('/unauthorized'); // Redirect to unauthorized page
          return;
        }
      }

      // Only check database permissions if local check passed and we need to verify
      try {
        // Check admin access if required (only if local check didn't pass)
        if (
          requireAdminAccess &&
          (!user.roles ||
            (!user.roles.includes('admin') &&
              !user.roles.includes('evolution admin')))
        ) {
          const hasAdmin = await hasAdminAccessDb();
          if (!hasAdmin) {
            router.push('/'); // Redirect to dashboard if not admin
            return;
          }
        }

        // Check page access if required (only if local check didn't pass)
        if (
          requiredPage &&
          (!user.roles || !hasPageAccess(user.roles, requiredPage))
        ) {
          const hasPage = await hasPageAccessDb(requiredPage);
          if (!hasPage) {
            router.push('/unauthorized'); // Redirect to unauthorized page
            return;
          }
        }

        setIsChecking(false);
        return;
      } catch (error) {
        console.error('Error checking permissions:', error);
        // Only redirect on error if user definitely doesn't have local access
        if (
          requireAdminAccess &&
          user.roles &&
          !user.roles.includes('admin') &&
          !user.roles.includes('evolution admin')
        ) {
          router.push('/');
        } else if (
          requiredPage &&
          user.roles &&
          !hasPageAccess(user.roles, requiredPage)
        ) {
          router.push('/unauthorized');
        } else {
          setIsChecking(false);
        }
        return;
      }
    };

    checkAuthentication();
  }, [
    user,
    router,
    isLoading,
    isAuthenticated,
    requireAdminAccess,
    requiredPage,
    hasWaitedForRoles,
  ]);

  // Show loading while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
