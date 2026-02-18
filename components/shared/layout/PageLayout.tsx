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

import Header from '@/components/shared/layout/Header';
import { FloatingActionButtons } from '@/components/shared/ui/FloatingActionButtons';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { ReactNode, useEffect, useState } from 'react';
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
    setSelectedLicencee?: (licensee: string) => void;
    disabled?: boolean;
    containerPaddingMobile?: string;
    hideCurrencyFilter?: boolean;
  };
  mainClassName?: string;
  showToaster?: boolean;
  toasterPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  toasterRichColors?: boolean;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
};

export default function PageLayout({
  children,
  pageTitle = '',
  hideOptions = false,
  hideLicenceeFilter = false,
  hideCurrencyFilter = false,
  showHeader = true,
  headerProps,
  mainClassName = 'flex-1 w-full max-w-full mx-auto px-2 py-4 sm:p-6 md:px-4 space-y-6 mt-4',
  showToaster = true,
  toasterPosition = 'top-right',
  toasterRichColors = false,
  onRefresh,
  refreshing = false,
}: PageLayoutProps) {
  // ============================================================================
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();
  const [showFloatingRefresh, setShowFloatingRefresh] = useState(false);

  // Handle scroll events for the floating refresh button
  useEffect(() => {
    if (!onRefresh) return undefined;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setShowFloatingRefresh(scrollTop > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onRefresh]);

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
            />
          )}
          {children}
        </main>
      </div>
      {showToaster && (
        <Toaster position={toasterPosition} richColors={toasterRichColors} />
      )}
      <FloatingActionButtons
        showRefresh={showFloatingRefresh}
        refreshing={refreshing}
        onRefresh={onRefresh || (() => {})}
      />
    </>
  );
}
