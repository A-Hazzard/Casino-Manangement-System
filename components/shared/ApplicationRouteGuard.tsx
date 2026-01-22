/**
 * Application Route Guard Component
 *
 * Prevents access to routes that don't belong to the current applicationMode mode.
 * Redirects users to the appropriate overview page if they try to access
 * routes from the other applicationMode.
 *
 * Features:
 * - Checks APPLICATION environment variable
 * - Validates current pathname against applicationMode routes
 * - Redirects to appropriate overview page
 * - No error messages, just silent redirect
 *
 * @module components/shared/ApplicationRouteGuard
 */
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

type ApplicationRouteGuardProps = {
  children: React.ReactNode;
  applicationMode?: 'CMS' | 'VAULT';
};

/**
 * Check if a pathname is a VAULT route.
 *
 * @param {string} pathname - The current route pathname to check.
 * @returns {boolean} - Returns true if the pathname starts with '/vault'.
 */
function isVaultRoute(pathname: string): boolean {
  return pathname.startsWith('/vault');
}

/**
 * Application Route Guard
 * Redirects users to the appropriate overview page if they try to access routes from the other application mode.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The JSX elements to render if access is permitted.
 * @param {'CMS'|'VAULT'} [props.applicationMode] - The current application mode, either 'CMS' or 'VAULT'.
 *
 * @returns {JSX.Element} - Returns the children if access is valid, otherwise redirects to the appropriate overview page.
 */
export default function ApplicationRouteGuard({
  children,
  applicationMode,
}: ApplicationRouteGuardProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const pathname = usePathname();
  const router = useRouter();
  // Use prop if provided, otherwise fall back to env var (for client-side)

  // ============================================================================
  // Effects - Route Protection
  // ============================================================================
  useEffect(() => {
    // Skip protection if applicationMode is not set
    if (!applicationMode) {
      return;
    }

    // Skip protection for API routes and login (handled separately)
    if (pathname.startsWith('/api') || pathname.startsWith('/login')) {
      return;
    }

    // Normalize applicationMode to handle case variations
    const normalizedMode = applicationMode.trim().toUpperCase();

    const isVault = normalizedMode === 'VAULT';

    // VAULT mode: Only allow /vault/* routes
    // CMS routes (/, /reports, /cabinets, etc.) should redirect to /vault/management
    if (isVault) {
      // If not a vault route, redirect to vault management
      // This catches root (/), /reports, /cabinets, and all other CMS routes
      if (!isVaultRoute(pathname)) {
        router.replace('/vault/management');
        return;
      }
    }

    // CMS mode: Allow CMS routes and vault routes (for Cash Desk and Vault Manager access)
    // CMS users can access vault routes through sidebar links
    // Role-based access control is handled by ProtectedRoute component
    // This allows: /, /reports, /cabinets, /sessions, /members, /locations, /vault/*, etc.
    // No redirect needed - let ProtectedRoute handle role-based access
  }, [pathname, router, applicationMode]);

  // ============================================================================
  // Render
  // ============================================================================
  return <>{children}</>;
}
