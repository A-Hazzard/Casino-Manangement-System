/**
 * CMS Layout Wrapper Component
 *
 * Wraps the CMS application with necessary providers and layout components.
 * This is the top-level layout wrapper for the Casino Management System.
 *
 * Features:
 * - Query provider for React Query
 * - Currency provider for multi-currency support
 * - Sidebar provider with CMS navigation
 * - Profile validation gate with CMS context
 * - Toast notifications
 *
 * @module components/layout/LayoutWrapper
 */
'use client';

import GlobalSidebarWrapper from '@/components/shared/layout/GlobalSidebarWrapper';
import ProfileValidationGate from '@/components/shared/providers/ProfileValidationGate';
import { SidebarInset, SidebarProvider } from '@/components/shared/ui/sidebar';
import { getCmsNavigationConfig } from '@/lib/constants';
import { CurrencyProvider } from '@/lib/contexts/CurrencyContext';
import { QueryProvider } from '@/lib/providers/QueryProvider';
import { useUserStore } from '@/lib/store/userStore';
import { useMemo } from 'react';
import { Toaster } from 'sonner';

type LayoutWrapperProps = {
  children: React.ReactNode;
};

export default function LayoutWrapper({
  children,
}: LayoutWrapperProps) {
  const { user } = useUserStore();

  // Get CMS navigation config with grouping for high-priority CMS roles
  const navConfig = useMemo(() => {
    return getCmsNavigationConfig(user?.roles as string[]);
  }, [user?.roles]);

  return (
    <QueryProvider>
      <CurrencyProvider>
        <SidebarProvider>
          <GlobalSidebarWrapper navConfig={navConfig} />
          <ProfileValidationGate context="CMS" />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
        <Toaster position="top-right" />
      </CurrencyProvider>
    </QueryProvider>
  );
}
