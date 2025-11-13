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

/**
 * Shared page layout component
 * Provides consistent structure with sidebar, gradient background, and main content area
 * Used across all authenticated pages (except login)
 */
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
  const { selectedLicencee, setSelectedLicencee } = useDashBoardStore();

  // Use headerProps if provided, otherwise use default store values
  const headerSelectedLicencee =
    headerProps?.selectedLicencee ?? selectedLicencee;
  const headerSetSelectedLicencee =
    headerProps?.setSelectedLicencee ?? setSelectedLicencee;
  const headerDisabled = headerProps?.disabled ?? false;
  const headerContainerPaddingMobile = headerProps?.containerPaddingMobile;
  const headerHideCurrencyFilter =
    headerProps?.hideCurrencyFilter ?? hideCurrencyFilter;

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
