/**
 * Vault Layout Wrapper Component
 *
 * Wraps the VAULT application with necessary providers and layout components.
 * This is the top-level layout wrapper for the Vault Management application.
 *
 * Features:
 * - Query provider for React Query
 * - Currency provider for multi-currency support
 * - Sidebar provider with VAULT navigation
 * - Profile validation gate with VAULT context
 * - Toast notifications
 *
 * @module components/VAULT/layout/VaultLayoutWrapper
 */
'use client';

import GlobalSidebarWrapper from '@/components/shared/layout/GlobalSidebarWrapper';
import ProfileValidationGate from '@/components/shared/providers/ProfileValidationGate';
import { SidebarInset, SidebarProvider } from '@/components/shared/ui/sidebar';
import {
    cashierNavigationConfig,
    getCmsNavigationConfig,
    vaultNavigationConfig,
} from '@/lib/constants';
import { CurrencyProvider } from '@/lib/contexts/CurrencyContext';
import { QueryProvider } from '@/lib/providers/QueryProvider';
import { useUserStore } from '@/lib/store/userStore';
import {
    hasCmsAccess,
    isCashierOnly,
    isVaultManagerOnly,
} from '@/lib/utils/permissions/client';
import { useMemo } from 'react';
import { Toaster } from 'sonner';

type VaultLayoutWrapperProps = {
  children: React.ReactNode;
};

export default function VaultLayoutWrapper({
  children,
}: VaultLayoutWrapperProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user, hasActiveVaultShift } = useUserStore();

  // ============================================================================
  // Computed Values - Navigation Selection
  // ============================================================================
  /**
   * Filter navigation items based on shift status
   */
   /**
    * Filter navigation items based on shift status
    */
   const filterNavItems = (config: any) => {
     // Currently no complex filtering needed as end-of-day is handled via dashboard
     return config;
   };

  // Select navigation config based on user's roles
  const navConfig = useMemo(() => {
    let config;
    if (hasCmsAccess(user?.roles)) {
      config = getCmsNavigationConfig(user?.roles as string[]);
    } else if (isCashierOnly(user?.roles)) {
      config = cashierNavigationConfig;
    } else if (isVaultManagerOnly(user?.roles)) {
      config = vaultNavigationConfig;
    } else {
      config = getCmsNavigationConfig(user?.roles as string[]);
    }

    return filterNavItems(config);
  }, [user?.roles, hasActiveVaultShift]);

  return (
    // React Query provider for data fetching and caching
    <QueryProvider>
      <CurrencyProvider>
        <SidebarProvider>
          <GlobalSidebarWrapper navConfig={navConfig} />
          <ProfileValidationGate context="VAULT" />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
        <Toaster position="top-right" />
      </CurrencyProvider>
    </QueryProvider>
  );
}
