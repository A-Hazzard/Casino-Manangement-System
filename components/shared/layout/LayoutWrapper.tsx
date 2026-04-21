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

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import GlobalSidebarWrapper from '@/components/shared/layout/GlobalSidebarWrapper';
import ProfileValidationGate from '@/components/shared/providers/ProfileValidationGate';
import TempPasswordGate from '@/components/shared/providers/TempPasswordGate';
import { SidebarInset, SidebarProvider } from '@/components/shared/ui/sidebar';
import { getCmsNavigationConfig } from '@/lib/constants';
import { CurrencyProvider } from '@/lib/contexts/CurrencyContext';
import { QueryProvider } from '@/lib/providers/QueryProvider';
import { useUserStore } from '@/lib/store/userStore';
import { useMemo } from 'react';
import { Toaster } from 'sonner';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

type LayoutWrapperProps = {
  children: ReactNode;
};

// Paths that should NOT have the CMS layout (sidebar, auth gates)
const AUTH_PATHS = ['/login', '/forgot-password', '/reset-password', '/install'];

export default function LayoutWrapper({
  children,
}: LayoutWrapperProps) {
  const pathname = usePathname();
  const { user } = useUserStore();

  const isAuthPage = AUTH_PATHS.includes(pathname);

  // Get CMS navigation config with grouping for high-priority CMS roles
  const navConfig = useMemo(() => {
    return getCmsNavigationConfig(user?.roles as string[]);
  }, [user?.roles]);

  // If it's an auth or setup page, render without the CMS layout wrapper
  if (isAuthPage) {
    return (
      <QueryProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          {children}
          <Toaster position="top-right" richColors />
        </LocalizationProvider>
      </QueryProvider>
    );
  }

  return (
    <QueryProvider>
      <CurrencyProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <SidebarProvider>
            <GlobalSidebarWrapper navConfig={navConfig} />
            <TempPasswordGate />
            <ProfileValidationGate context="CMS" />
            <SidebarInset>{children}</SidebarInset>
          </SidebarProvider>
        </LocalizationProvider>
        <Toaster position="top-right" richColors />
      </CurrencyProvider>
    </QueryProvider>
  );
}
