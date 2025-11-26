/**
 * Page Layout Component
 * Shared page layout component providing consistent structure for all authenticated pages.
 *
 * Features:
 * - Responsive layout with sidebar integration
 * - Configurable header with licensee/currency filters
 * - Toast notifications (Sonner)
 * - Customizable main content area styling
 * - Gradient background
 * - Hydration-safe rendering
 *
 * Used across all authenticated pages except login.
 *
 * @param children - Page content to render
 * @param pageTitle - Title to display in header
 * @param hideOptions - Hide header options
 * @param hideLicenceeFilter - Hide licensee dropdown
 * @param hideCurrencyFilter - Hide currency filter
 * @param showHeader - Show/hide header (default: true)
 * @param headerProps - Override header props
 * @param mainClassName - Custom classes for main content area
 * @param showToaster - Show/hide toast notifications
 * @param toasterPosition - Toast position on screen
 * @param toasterRichColors - Enable rich colors for toasts
 */
'use client';

import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import Header from '@/components/layout/Header';
import { useDashBoardStore } from '@/lib/store/dashboardStore';

type PageLayoutProps = {
  children: ReactNode;
  pageTitle?: string;
  hideOptions?: boolean;
  hideLicenceeFilter?: boolean;
  hideCurrencyFilter?: boolean;
  showHeader?: boolean;
  headerProps?: {
    selectedLicencee?: string;
    setSelectedLicencee?: (licensee: string) => void;
    disabled?: boolean;
    containerPaddingMobile?: string;
    hideCurrencyFilter?: boolean;
  };
  mainClassName?: string;
  showToaster?: boolean;
  toasterPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  toasterRichColors?: boolean;
};

export default function PageLayout({
  children,
  pageTitle = '',
  hideOptions = false,
  hideLicenceeFilter = false,
  hideCurrencyFilter = false,
  showHeader = true,
  headerProps,
  mainClassName = 'flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 space-y-6 mt-4',
  showToaster = true,
  toasterPosition = 'top-right',
  toasterRichColors = false,
}: PageLayoutProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  // ============================================================================
  // Computed Values
  // ============================================================================
  // Use headerProps if provided, otherwise use default store values
  const headerSelectedLicencee =
    headerProps?.selectedLicencee ?? selectedLicencee;
  const headerSetSelectedLicencee =
    headerProps?.setSelectedLicencee ?? setSelectedLicencee;
  const headerDisabled = headerProps?.disabled ?? false;
  const headerContainerPaddingMobile = headerProps?.containerPaddingMobile;
  const headerHideCurrencyFilter =
    headerProps?.hideCurrencyFilter ?? hideCurrencyFilter;

  // ============================================================================
  // Render - Layout Structure
  // ============================================================================
  return (
    <>
      <div
        className="flex min-h-screen w-full max-w-full overflow-hidden bg-background transition-all duration-300 md:ml-20 md:w-11/12"
        suppressHydrationWarning
      >
        <main className={mainClassName} suppressHydrationWarning>
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
            />
          )}
          {children}
        </main>
      </div>
      {showToaster && (
        <Toaster position={toasterPosition} richColors={toasterRichColors} />
      )}
    </>
  );
}
