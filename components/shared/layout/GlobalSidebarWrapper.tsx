/**
 * Global Sidebar Wrapper Component
 * Config-driven wrapper for application sidebar that initializes global interceptors.
 *
 * Features:
 * - Conditionally renders sidebar (hidden on login page)
 * - Initializes axios interceptors for database mismatch detection
 * - Provides sidebar overlay for mobile responsiveness
 * - Manages sidebar visibility based on route
 * - Accepts navigation configuration for different application modes
 * - Automatically switches to cashier navigation when on cashier routes
 *
 * @param navConfig - Navigation configuration object with items array (defaults to provided config or CMS)
 * @returns AppSidebar with overlay or null for login page
 */
'use client';

import AppSidebar from '@/components/shared/layout/AppSidebar';
import { SidebarOverlay } from '@/components/shared/ui/sidebar';
import {
  cashierNavigationConfig,
  getCmsNavigationConfig,
} from '@/lib/constants';
import type { NavigationConfig } from '@/lib/types/layout/navigation';
import { setupAxiosInterceptors } from '@/lib/utils/axiosInterceptor';
import { useUserStore } from '@/lib/store/userStore';
import { hasCmsAccess, isCashierOnly } from '@/lib/utils/permissions/client';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';

type GlobalSidebarWrapperProps = {
  navConfig?: NavigationConfig;
};

export default function GlobalSidebarWrapper({
  navConfig,
}: GlobalSidebarWrapperProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const pathname = usePathname();
  const { user } = useUserStore();

  // ============================================================================
  // Effects - Initialize Interceptors
  // ============================================================================
  // Initialize axios interceptors for database mismatch detection
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  // ============================================================================
  // Computed Values - Navigation Selection
  // ============================================================================
  // Determine effective navigation config based on user roles and route
  const effectiveNavConfig = useMemo(() => {
    // CMS users (developer, admin, manager, location admin) always get CMS navigation
    // which includes both CMS links and vault/cashier links grouped in toggle sections
    if (hasCmsAccess(user?.roles)) {
      return getCmsNavigationConfig(user?.roles as string[]);
    }

    // If on a cashier route and user is cashier-only, use cashier navigation
    if (pathname?.startsWith('/vault/cashier') && isCashierOnly(user?.roles)) {
      return cashierNavigationConfig;
    }

    // Otherwise use the provided navigation config
    return navConfig;
  }, [pathname, navConfig, user?.roles]);

  // ============================================================================
  // Render - Conditional Sidebar
  // ============================================================================
  if (pathname === '/login') return null;
  return (
    <>
      <AppSidebar navConfig={effectiveNavConfig} />
      <SidebarOverlay />
    </>
  );
}
