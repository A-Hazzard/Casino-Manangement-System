/**
 * Protected Route Component
 * Wrapper component that protects pages requiring authentication and authorization.
 *
 * Features:
 * - Authenticates user before allowing access
 * - Checks admin access requirements
 * - Validates page-specific permissions
 * - Redirects to login if unauthenticated
 * - Shows NoRoleAssigned message for users without roles
 * - Supports both local and database permission checks
 *
 * @param children - Child components to render if authorized
 * @param requireAdminAccess - Whether admin/developer role is required
 * @param requiredPage - Specific page permission required
 */
'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import { NoRoleAssigned } from '@/components/shared/ui/NoRoleAssigned';
import { useAuth } from '@/lib/hooks/useAuth';
import { shouldShowNoRoleMessage } from '@/lib/utils/licensee';
import {
  PageName,
  hasAdminAccessDb,
  hasPageAccess,
  hasPageAccessDb,
} from '@/lib/utils/permissions';
import {
  isCashierOnly,
  isVaultManagerOnly,
} from '@/lib/utils/permissions/client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type React from 'react';
import { UserAuthPayload } from '../../../shared/types';
import { UserRole } from '@/lib/constants';

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
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasWaitedForRoles, setHasWaitedForRoles] = useState(false);

  // ============================================================================
  // Effects - Authentication & Authorization Check
  // ============================================================================
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
              // User has no roles - allow them to see the NoRoleAssigned message
              setIsChecking(false);
            }
          }, 2000);
        }
        return;
      }

      // Check if user is cashier-only (has ONLY cashier role, no other roles)
      if (isCashierOnly(user.roles as UserRole[])) {
        // Allow access only to cashier routes
        const isCashierRoute =
          pathname === '/vault/cashier' ||
          pathname?.startsWith('/vault/cashier/');
        if (!isCashierRoute) {
          router.push('/vault/cashier/payouts');
          return;
        }
      }

      // Check if user is vault-manager-only (has ONLY vault-manager role, no other roles)
      if (isVaultManagerOnly(user.roles as UserRole[])) {
        // Allow access only to vault management routes
        const isVaultRoute =
          pathname === '/vault/management' ||
          pathname?.startsWith('/vault/management/');
        // Block CMS routes (dashboard, locations, cabinets, etc.)
        const isCmsRoute =
          pathname === '/' ||
          pathname?.startsWith('/locations') ||
          pathname?.startsWith('/cabinets') ||
          pathname?.startsWith('/collection-report') ||
          pathname?.startsWith('/sessions') ||
          pathname?.startsWith('/members') ||
          pathname?.startsWith('/reports') ||
          pathname?.startsWith('/administration');
        if (isCmsRoute || !isVaultRoute) {
          router.push('/vault/management');
          return;
        }
      }

      // Check if user is collector-only (has ONLY collector role, no other roles)
      const isCollectorOnly =
        user.roles.length === 1 && user.roles.includes('collector');

      // If collector-only, block access to all pages except collection-report
      if (isCollectorOnly) {
        // Allow access to collection-report pages (including report details)
        const isCollectionReportPage =
          pathname === '/collection-report' ||
          pathname?.startsWith('/collection-report/');
        if (!isCollectionReportPage) {
          router.push('/collection-report');
          return;
        }
      }

      // Check local permissions first (faster)
      if (requireAdminAccess && user.roles) {
        const hasAdminLocal =
          user.roles.includes('admin') || user.roles.includes('developer');
        if (!hasAdminLocal) {
          router.push('/'); // Redirect to dashboard if not admin
          return;
        }
      }

      if (requiredPage && user.roles) {
        const hasPageLocal = hasPageAccess(user.roles as UserRole[], requiredPage);
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
              !user.roles.includes('developer')))
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
          (!user.roles || !hasPageAccess(user.roles as UserRole[], requiredPage))
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
          !user.roles.includes('developer')
        ) {
          router.push('/');
        } else if (
          requiredPage &&
          user.roles &&
          !hasPageAccess(user.roles as UserRole[], requiredPage as PageName)
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
    pathname,
    isLoading,
    isAuthenticated,
    requireAdminAccess,
    requiredPage,
    hasWaitedForRoles,
  ]);

  // Show loading while checking authentication
  if (isLoading || isChecking) return <></>;

  // Show NoRoleAssigned message if user has no roles
  if (shouldShowNoRoleMessage(user as UserAuthPayload)) {
    return (
      <PageLayout
        headerProps={{
          selectedLicencee: '',
          setSelectedLicencee: () => {},
          disabled: false,
        }}
        pageTitle=""
        hideOptions={true}
        hideLicenceeFilter={true}
        mainClassName="flex flex-col flex-1 px-2 py-4 sm:p-6 w-full max-w-full"
        showToaster={false}
      >
        <NoRoleAssigned />
      </PageLayout>
    );
  }

  return <>{children}</>;
}
