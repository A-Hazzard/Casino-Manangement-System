/**
 * Header Component
 * Main application header with navigation, filters, and user controls.
 *
 * Features:
 * - Page title display
 * - Sidebar toggle for mobile/desktop
 * - Licensee selector dropdown with permissions check
 * - Currency filter for financial data
 * - User menu with profile and logout
 * - Mobile responsive design
 * - Real-time licensee data fetching
 * - Currency conversion integration
 * - Dashboard metrics refresh on licensee/currency change
 * - Navigation links with role-based visibility
 * - Animated mobile menu
 * - Loading states for filters
 *
 * Large component (~664 lines) managing top-level navigation and controls.
 *
 * @param selectedLicencee - Currently selected licensee ID
 * @param pageTitle - Title to display in header
 * @param setSelectedLicencee - Callback to update selected licensee
 * @param hideOptions - Hide user menu options
 * @param hideLicenceeFilter - Hide licensee dropdown
 * @param containerPaddingMobile - Custom mobile padding
 * @param disabled - Disable interactive elements
 * @param hideCurrencyFilter - Hide currency filter
 */
'use client';
import CurrencyFilter from '@/components/filters/CurrencyFilter';
import { ClientOnly } from '@/components/ui/ClientOnly';
import LicenceeSelect from '@/components/ui/LicenceeSelect';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { logoutUser } from '@/lib/helpers/clientAuth';
import {
  fetchLicenseeById,
  fetchLicensees,
} from '@/lib/helpers/clientLicensees';
import { fetchMetricsData } from '@/lib/helpers/dashboard';
import { getCountryCurrency, getLicenseeCurrency } from '@/lib/helpers/rates';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { HeaderProps } from '@/lib/types/componentProps';
import { cn } from '@/lib/utils';
import { shouldShowNavigationLink } from '@/lib/utils/permissions';
import type { CurrencyCode } from '@/shared/types/currency';
import { ExitIcon } from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeft } from 'lucide-react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function Header({
  selectedLicencee,
  pageTitle,
  setSelectedLicencee,
  hideOptions: _hideOptions,
  hideLicenceeFilter,
  containerPaddingMobile,
  disabled = false,
  hideCurrencyFilter = false,
}: HeaderProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isOpen } = useSidebar();
  const { user, clearUser } = useUserStore();
  const {
    activeMetricsFilter,
    customDateRange,
    setTotals,
    setChartData,
    setActiveFilters,
    setShowDatePicker,
    setLoadingChartData,
  } = useDashBoardStore();
  const {
    isAllLicensee: _isAllLicensee,
    displayCurrency,
    setDisplayCurrency,
  } = useCurrency();

  // Get user roles for permission checking
  const userRoles = user?.roles || [];
  const normalizedRoles = userRoles.map(role =>
    typeof role === 'string' ? role.toLowerCase() : role
  );

  // Get user's licensee assignments (memoized to prevent unnecessary re-renders)
  const userLicensees = useMemo(() => {
    return user?.rel?.licencee || [];
  }, [user?.rel?.licencee]);

  const isAdmin =
    normalizedRoles.includes('admin') || normalizedRoles.includes('developer');
  const isManager = normalizedRoles.includes('manager');
  const hasMultipleLicensees =
    Array.isArray(userLicensees) && userLicensees.length > 1;
  const hasSingleLicensee =
    Array.isArray(userLicensees) && userLicensees.length === 1;

  // Determine if licensee select should be shown
  // Show if: admin OR user has multiple licensees (including location admins with multiple licensees)
  // Hide if: user has 0 or 1 licensee (and not admin/dev) OR location admin with single/no licensee
  const shouldShowLicenseeSelect =
    isAdmin || hasMultipleLicensees;

  // Determine if we should show licensee name next to "Evolution CMS"
  // Show if: user has exactly one licensee AND not admin/dev AND (not manager OR manager with single licensee)
  const shouldShowLicenseeName =
    hasSingleLicensee && !isAdmin && (!isManager || hasSingleLicensee);
  const selectedLicenceeValue = selectedLicencee ?? '';
  const isAllLicenseeSelected =
    selectedLicenceeValue === '' || selectedLicenceeValue === 'all';
  const shouldRenderCurrencyFilter =
    !hideCurrencyFilter &&
    (isAdmin || (hasMultipleLicensees && isAllLicenseeSelected));

  const [licenseeCurrencyMap, setLicenseeCurrencyMap] = useState<
    Record<string, CurrencyCode>
  >({});
  const [singleLicenseeName, setSingleLicenseeName] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const loadLicensees = async () => {
      try {
        const result = await fetchLicensees();
        if (cancelled) return;
        
        // Extract licensees array from the result
        const licensees = Array.isArray(result.licensees) ? result.licensees : [];

        const map: Record<string, CurrencyCode> = {};
        licensees.forEach(licensee => {
          let currency = getLicenseeCurrency(licensee.name);
          if (
            currency === 'USD' &&
            (licensee.countryName || typeof licensee.country === 'string')
          ) {
            const fallback = licensee.countryName
              ? getCountryCurrency(licensee.countryName)
              : getCountryCurrency(licensee.country);
            currency = fallback || currency;
          }

          map[String(licensee._id)] = currency;
          map[licensee.name] = currency;
        });

        setLicenseeCurrencyMap(map);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to load licensee currencies:', error);
        }
      }
    };

    loadLicensees();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load single licensee name if applicable
  useEffect(() => {
    let cancelled = false;
    const loadSingleLicenseeName = async () => {
      if (
        !shouldShowLicenseeName ||
        !hasSingleLicensee ||
        userLicensees.length === 0
      ) {
        setSingleLicenseeName('');
        return;
      }

      try {
        const licenseeId = userLicensees[0];
        const licensee = await fetchLicenseeById(licenseeId);
        if (!cancelled && licensee?.name) {
          setSingleLicenseeName(licensee.name);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to load single licensee name:', error);
        }
        if (!cancelled) {
          setSingleLicenseeName('');
        }
      }
    };

    loadSingleLicenseeName();
    return () => {
      cancelled = true;
    };
  }, [shouldShowLicenseeName, hasSingleLicensee, userLicensees]);

  const resolveLicenseeCurrency = useCallback(
    async (licenseeId: string): Promise<CurrencyCode> => {
      if (!licenseeId || licenseeId === 'all' || licenseeId === '') {
        return 'USD';
      }

      const cached =
        licenseeCurrencyMap[licenseeId] ||
        licenseeCurrencyMap[licenseeId.trim()] ||
        licenseeCurrencyMap[
          Object.keys(licenseeCurrencyMap).find(
            key => key.toLowerCase() === licenseeId.toLowerCase()
          ) || ''
        ];

      if (cached) {
        return cached;
      }

      try {
        const licensee = await fetchLicenseeById(licenseeId);
        if (licensee?.name) {
          let currency = getLicenseeCurrency(licensee.name);
          if (
            currency === 'USD' &&
            (licensee.countryName || typeof licensee.country === 'string')
          ) {
            const fallback = licensee.countryName
              ? getCountryCurrency(licensee.countryName)
              : getCountryCurrency(licensee.country);
            currency = fallback || currency;
          }

          setLicenseeCurrencyMap(prev => ({
            ...prev,
            [licenseeId]: currency,
            [licensee.name]: currency,
          }));
          return currency;
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            'Failed to resolve currency for licensee:',
            licenseeId,
            error
          );
        }
      }

      return getLicenseeCurrency(licenseeId);
    },
    [licenseeCurrencyMap]
  );

  // Wrapper function to handle licensee changes
  const handleLicenseeChange = async (newLicensee: string) => {
    if (setSelectedLicencee) {
      setSelectedLicencee(newLicensee);
    }

    // Update currency context based on licensee selection
    const isAllLicensee =
      !newLicensee || newLicensee === 'all' || newLicensee === '';
    if (isAllLicensee) {
      // Reset to USD when "All Licensee" is selected
      setDisplayCurrency('USD');
    } else {
      const mappedCurrency = await resolveLicenseeCurrency(newLicensee);
      setDisplayCurrency(mappedCurrency);
    }

    // If we're on the dashboard and have an active filter, refresh data
    if (pathname === '/' && activeMetricsFilter) {
      setLoadingChartData(true);
      try {
        await fetchMetricsData(
          activeMetricsFilter,
          customDateRange,
          newLicensee,
          setTotals,
          setChartData,
          setActiveFilters,
          setShowDatePicker,
          displayCurrency
        );
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error refreshing data after licensee change:', error);
        }
      } finally {
        setLoadingChartData(false);
      }
    }

    // For reports page, the tabs will automatically re-fetch when selectedLicencee changes
    // because they have selectedLicencee in their useEffect dependencies
  };

  // Check if the current path is related to locations
  const isLocationPath =
    pathname === '/locations' || pathname.startsWith('/locations/');

  // Check if the current path is related to cabinets
  const isCabinetPath =
    pathname === '/cabinets' || pathname.startsWith('/cabinets/');

  // Check if the current path is related to reports
  const isReportsPath =
    pathname === '/reports' || pathname.startsWith('/reports/');

  // Check if the current path is related to members
  const isMembersPath =
    pathname === '/members' || pathname.startsWith('/members/');

  // Check if the current path is related to sessions
  const isSessionsPath =
    pathname === '/sessions' || pathname.startsWith('/sessions/');

  useEffect(() => {
    let cancelled = false;
    const syncCurrency = async () => {
      const isAll =
        !selectedLicencee ||
        selectedLicencee === 'all' ||
        selectedLicencee === '';
      if (isAll) {
        setDisplayCurrency('USD');
        return;
      }

      const currency = await resolveLicenseeCurrency(selectedLicencee);
      if (!cancelled) {
        setDisplayCurrency(currency);
      }
    };

    syncCurrency();

    return () => {
      cancelled = true;
    };
  }, [selectedLicencee, setDisplayCurrency, resolveLicenseeCurrency]);

  // Check if the current path is the specific location details page
  const isSpecificLocationPath =
    pathname.startsWith('/locations/') &&
    params.slug &&
    !pathname.includes('/details');

  return (
    <ClientOnly fallback={<div className="h-16 animate-pulse bg-gray-100" />}>
      <div className={`flex flex-col gap-2 ${containerPaddingMobile || ''}`}>
        {/* Header Section: Main header with title and licensee selector */}
        <header className="flex w-full flex-col p-0">
          {/* Menu Button and Main Title Row: Mobile sidebar trigger and title */}
          <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-4">
            {/* Left side: Menu button and title */}
            <div className="flex min-w-0 flex-shrink items-center gap-2">
              {/* Mobile sidebar trigger uses the same icon as sidebar, layered under opened sidebar */}
              <SidebarTrigger
                className={cn(
                  'relative z-20 flex-shrink-0 cursor-pointer p-2 text-foreground md:hidden',
                  isOpen && 'invisible'
                )}
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="h-6 w-6" suppressHydrationWarning />
              </SidebarTrigger>
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="shrink-0 whitespace-nowrap text-left text-base font-semibold tracking-tight sm:text-lg md:ml-0 xl:text-xl">
                  Evolution CMS
                </h1>
                {shouldShowLicenseeName && singleLicenseeName && (
                  <span className="inline-flex items-center rounded-full bg-buttonActive/10 px-3 py-1 text-xs font-medium text-buttonActive ring-1 ring-inset ring-buttonActive/20 sm:text-sm">
                    {singleLicenseeName}
                  </span>
                )}
              </div>
            </div>

            {/* Right side: Filters */}
            {(!hideLicenceeFilter && shouldShowLicenseeSelect) || shouldRenderCurrencyFilter ? (
              <div className="flex min-w-0 shrink items-center gap-1 sm:gap-2">
                {!hideLicenceeFilter && shouldShowLicenseeSelect && (
                  <div
                    className="min-w-0 overflow-hidden md:w-auto md:max-w-[200px] lg:max-w-[220px] xl:max-w-none"
                    style={{
                      width:
                        'clamp(120px, calc((100vw - 240px) * 0.5 + 120px), 200px)',
                    }}
                  >
                    <LicenceeSelect
                      selected={selectedLicencee || ''}
                      onChange={handleLicenseeChange}
                      userLicenseeIds={isAdmin ? undefined : userLicensees}
                      disabled={disabled}
                    />
                  </div>
                )}
                {shouldRenderCurrencyFilter && (
                  <CurrencyFilter
                    className="hidden md:flex"
                    disabled={disabled}
                    userRoles={userRoles}
                    hasMultipleLicensees={hasMultipleLicensees}
                    onCurrencyChange={newCurrency => {
                      // Trigger data refresh when currency changes
                      if (pathname === '/' && activeMetricsFilter) {
                        setLoadingChartData(true);
                        fetchMetricsData(
                          activeMetricsFilter,
                          customDateRange,
                          selectedLicencee,
                          setTotals,
                          setChartData,
                          setActiveFilters,
                          setShowDatePicker,
                          newCurrency
                        ).finally(() => setLoadingChartData(false));
                      }
                    }}
                  />
                )}
              </div>
            ) : null}
          </div>

          {/* Mobile Menu Overlay Section: Full-screen mobile navigation menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                {/* Mobile Menu Backdrop: Overlay background for mobile menu */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black bg-opacity-50"
                  onClick={() => setMobileMenuOpen(false)}
                />
                {/* Mobile Menu Panel: Slide-out navigation menu */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'tween', duration: 0.3 }}
                  className="fixed left-0 top-0 z-[100] flex h-full w-80 flex-col bg-container shadow-xl"
                >
                  {/* Mobile Navigation Menu: Navigation buttons for mobile users */}
                  <div className="flex h-full flex-col space-y-4 p-6">
                    {/* Dashboard Navigation Button */}
                    {shouldShowNavigationLink(userRoles, 'dashboard') && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`flex w-full items-center justify-center rounded-lg p-4 ${
                          pathname === '/'
                            ? 'bg-buttonActive text-container shadow-md'
                            : 'bg-muted text-foreground hover:bg-accent'
                        }`}
                        onClick={() => {
                          router.push('/');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Dashboard</span>
                      </motion.button>
                    )}

                    {/* Locations button */}
                    {shouldShowNavigationLink(userRoles, 'locations') && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`flex w-full items-center justify-center rounded-lg p-4 ${
                          isLocationPath
                            ? 'bg-buttonActive text-container shadow-md'
                            : 'bg-muted text-foreground hover:bg-accent'
                        }`}
                        onClick={() => {
                          router.push('/locations');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Locations</span>
                      </motion.button>
                    )}

                    {/* Cabinets button */}
                    {shouldShowNavigationLink(userRoles, 'machines') && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className={`flex w-full items-center justify-center rounded-lg p-4 ${
                          isCabinetPath
                            ? 'bg-buttonActive text-container shadow-md'
                            : 'bg-muted text-foreground hover:bg-accent'
                        }`}
                        onClick={() => {
                          router.push('/cabinets');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Cabinets</span>
                      </motion.button>
                    )}

                    {/* Collection Reports button */}
                    {shouldShowNavigationLink(
                      userRoles,
                      'collection-report'
                    ) && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className={`flex w-full items-center justify-center rounded-lg p-4 ${
                          pathname === '/collection-report'
                            ? 'bg-buttonActive text-container shadow-md'
                            : 'bg-muted text-foreground hover:bg-accent'
                        }`}
                        onClick={() => {
                          router.push('/collection-report');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">
                          Collection Reports
                        </span>
                      </motion.button>
                    )}

                    {/* Administration button */}
                    {shouldShowNavigationLink(userRoles, 'administration') && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className={`flex w-full items-center justify-center rounded-lg p-4 ${
                          pathname === '/administration'
                            ? 'bg-buttonActive text-container shadow-md'
                            : 'bg-muted text-foreground hover:bg-accent'
                        }`}
                        onClick={() => {
                          router.push('/administration');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">
                          Administration
                        </span>
                      </motion.button>
                    )}

                    {/* Reports button */}
                    {shouldShowNavigationLink(userRoles, 'reports') && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className={`flex w-full items-center justify-center rounded-lg p-4 ${
                          isReportsPath
                            ? 'bg-buttonActive text-container shadow-md'
                            : 'bg-muted text-foreground hover:bg-accent'
                        }`}
                        onClick={() => {
                          router.push('/reports');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Reports</span>
                      </motion.button>
                    )}

                    {/* Members button */}
                    {shouldShowNavigationLink(userRoles, 'members') && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className={`flex w-full items-center justify-center rounded-lg p-4 ${
                          isMembersPath
                            ? 'bg-buttonActive text-container shadow-md'
                            : 'bg-muted text-foreground hover:bg-accent'
                        }`}
                        onClick={() => {
                          router.push('/members');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Members</span>
                      </motion.button>
                    )}

                    {/* Members Summary button removed */}

                    {/* Sessions button */}
                    {shouldShowNavigationLink(userRoles, 'sessions') && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className={`flex w-full items-center justify-center rounded-lg p-4 ${
                          isSessionsPath
                            ? 'bg-buttonActive text-container shadow-md'
                            : 'bg-muted text-foreground hover:bg-accent'
                        }`}
                        onClick={() => {
                          router.push('/sessions');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="text-lg font-medium">Sessions</span>
                      </motion.button>
                    )}

                    {/* Mobile Currency Selector - only show when "All Licensee" is selected */}
                    {shouldRenderCurrencyFilter && (
                      <div className="mt-6 border-t border-gray-200 p-4">
                        <CurrencyFilter
                          className="w-full"
                          disabled={disabled}
                          userRoles={userRoles}
                          hasMultipleLicensees={hasMultipleLicensees}
                          onCurrencyChange={newCurrency => {
                            // Trigger data refresh when currency changes
                            if (pathname === '/' && activeMetricsFilter) {
                              setLoadingChartData(true);
                              fetchMetricsData(
                                activeMetricsFilter,
                                customDateRange,
                                selectedLicencee,
                                setTotals,
                                setChartData,
                                setActiveFilters,
                                setShowDatePicker,
                                newCurrency
                              ).finally(() => setLoadingChartData(false));
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Logout Button Section: User logout functionality */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    onClick={async () => {
                      await logoutUser();
                      clearUser();
                      setMobileMenuOpen(false);
                      router.push('/login');
                    }}
                    className="mx-auto mb-10 mt-auto flex items-center space-x-2 p-4 text-grayHighlight hover:text-buttonActive"
                    aria-label="Logout"
                  >
                    <ExitIcon className="h-6 w-6" suppressHydrationWarning />
                    <span className="font-medium">Logout</span>
                  </motion.button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Page Title Section: Dynamic page title and location information */}
          {pageTitle && (
            <div className="flex flex-col space-y-6 xl:flex-row">
              <div className="flex flex-col space-y-2">
                <h1 className="mb-2 text-2xl font-bold text-gray-800 sm:text-3xl">
                  {pageTitle}
                </h1>
                {isSpecificLocationPath && (
                  <p className="text-sm text-gray-600">
                    Location ID: {params.slug}
                  </p>
                )}
              </div>
            </div>
          )}
        </header>
      </div>
    </ClientOnly>
  );
}
