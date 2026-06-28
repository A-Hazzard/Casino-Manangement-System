/**
 * Page Layout Component
 * Shared page layout component providing consistent structure for all authenticated pages.
 *
 * Features:
 * - Responsive layout with sidebar integration
 * - Configurable header with licencee/currency filters
 * - Toast notifications (Sonner)
 * - Customizable main content area styling
 * - Gradient background
 * - Hydration-safe rendering
 * - Centralized refresh via RefreshProvider in LayoutWrapper
 *
 * Used across all authenticated pages except login.
 *
 * @param children - Page content to render
 * @param pageTitle - Title to display in header
 * @param hideOptions - Hide header options
 * @param hideLicenceeFilter - Hide licencee dropdown
 * @param hideCurrencyFilter - Hide currency filter
 * @param showHeader - Show/hide header (default: true)
 * @param headerProps - Override header props
 * @param mainClassName - Custom classes for main content area
 * @param showToaster - Show/hide toast notifications
 * @param toasterPosition - Toast position on screen
 * @param toasterRichColors - Enable rich colors for toasts
 */
'use client';

import Header from '@/components/shared/layout/Header';
import { FloatingActionButtons } from '@/components/shared/ui/FloatingActionButtons';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';

type PageLayoutProps = {
  children: ReactNode;
  pageTitle?: string;
  hideOptions?: boolean;
  hideLicenceeFilter?: boolean;
  hideCurrencyFilter?: boolean;
  showHeader?: boolean;
  headerProps?: {
    selectedLicencee?: string;
    setSelectedLicencee?: (licencee: string) => void;
    disabled?: boolean;
    containerPaddingMobile?: string;
    hideCurrencyFilter?: boolean;
  };
  headerActions?: ReactNode;
  mainClassName?: string;
  showToaster?: boolean;
  toasterPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  toasterRichColors?: boolean;
};

export default function PageLayout({
  children,
  pageTitle,
  hideOptions = false,
  hideLicenceeFilter = false,
  hideCurrencyFilter = false,
  showHeader = true,
  headerProps,
  headerActions,
  mainClassName = 'flex-1 w-full max-w-full mx-auto px-4 py-8 sm:p-10 md:px-12 mt-6',
  showToaster = true,
  toasterPosition = 'top-right',
  toasterRichColors = true,
}: PageLayoutProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  // ============================================================================
  // Computed
  // ============================================================================
  const headerSelectedLicencee =
    headerProps?.selectedLicencee ?? selectedLicencee;
  const headerSetSelectedLicencee =
    headerProps?.setSelectedLicencee ?? setSelectedLicencee;
  const headerDisabled = headerProps?.disabled ?? false;
  const headerContainerPaddingMobile = headerProps?.containerPaddingMobile;
  const headerHideCurrencyFilter =
    headerProps?.hideCurrencyFilter ?? hideCurrencyFilter;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <>
      <div
        className="w-full max-w-full overflow-x-hidden bg-background transition-all duration-300 md:ml-10 md:w-11/12"
        suppressHydrationWarning
      >
        <main
          className={`${mainClassName} w-full max-w-full overflow-x-hidden`}
          suppressHydrationWarning
        >
          {showHeader && (
            <Header
              selectedLicencee={headerSelectedLicencee}
              setSelectedLicencee={headerSetSelectedLicencee}
              pageTitle={pageTitle}
              hideOptions={hideOptions}
              hideLicenceeFilter={hideLicenceeFilter}
              disabled={headerDisabled}
              containerPaddingMobile={headerContainerPaddingMobile}
              hideCurrencyFilter={headerHideCurrencyFilter}
              headerActions={headerActions}
            />
          )}
          {children}
        </main>
      </div>
      {showToaster && (
        <Toaster position={toasterPosition} richColors={toasterRichColors} />
      )}
      <FloatingActionButtons />
    </>
  );
}
