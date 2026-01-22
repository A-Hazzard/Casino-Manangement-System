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
  const { user } = useUserStore();

  // ============================================================================
  // Computed Values - Navigation Selection
  // ============================================================================
  // Select navigation config based on user's roles
  const navConfig = useMemo(() => {
    // CMS users (developer, admin, manager, location admin) get full CMS navigation
    // which includes both CMS links and vault/cashier links grouped in toggle sections
    if (hasCmsAccess(user?.roles)) {
      return getCmsNavigationConfig(user?.roles as string[]);
    }

    // Cashier-only users get cashier navigation
    if (isCashierOnly(user?.roles)) {
      return cashierNavigationConfig;
    }

    // Vault-manager-only users get vault navigation
    if (isVaultManagerOnly(user?.roles)) {
      return vaultNavigationConfig;
    }

    // Default fallback: CMS navigation (flat structure for safety)
    return getCmsNavigationConfig(user?.roles as string[]);
  }, [user?.roles]);

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
