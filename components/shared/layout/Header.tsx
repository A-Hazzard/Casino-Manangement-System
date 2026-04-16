/**
 * Header Component
 * Main application header with navigation, filters, and user controls.
 *
 * Features:
 * - Page title display
 * - Sidebar toggle for mobile/desktop
 * - Licencee selector dropdown with permissions check
 * - Currency filter for financial data
 * - User menu with profile and logout
 * - Mobile responsive design
 * - Real-time licencee data fetching
 * - Currency conversion integration
 * - Dashboard metrics refresh on licencee/currency change
 * - Navigation links with role-based visibility
 * - Animated mobile menu
 * - Loading states for filters
 *
 * Large component (~664 lines) managing top-level navigation and controls.
 *
 * @param selectedLicencee - Currently selected licencee ID
 * @param pageTitle - Title to display in header
 * @param setSelectedLicencee - Callback to update selected licencee
 * @param hideOptions - Hide user menu options
 * @param hideLicenceeFilter - Hide licencee dropdown
 * @param containerPaddingMobile - Custom mobile padding
 * @param disabled - Disable interactive elements
 * @param hideCurrencyFilter - Hide currency filter
 */
'use client';
import CurrencyFilter from '@/components/shared/layout/CurrencyFilter';
import { ClientOnly } from '@/components/shared/ui/ClientOnly';
import LicenceeSelect from '@/components/shared/ui/LicenceeSelect';
import { SidebarTrigger, useSidebar } from '@/components/shared/ui/sidebar';
import { UserRole } from '@/lib/constants';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import {
  fetchLicenceeById,
  fetchLicencees, logoutUser
} from '@/lib/helpers/client';
import { fetchMetricsData } from '@/lib/helpers/dashboard';
import { getCountryCurrency, getLicenceeCurrency } from '@/lib/helpers/rates';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { HeaderProps } from '@/lib/types/components';
import { cn } from '@/lib/utils';
import { shouldShowNavigationLink } from '@/lib/utils/permissions';
import type { CurrencyCode } from '@/shared/types/currency';
import { ExitIcon } from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function Header({
  selectedLicencee,
  pageTitle,
  setSelectedLicencee,
  hideLicenceeFilter,
  containerPaddingMobile,
  disabled = false,
  hideCurrencyFilter = false,
}: HeaderProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const pathname = usePathname();
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
    setGameDayOffset,
  } = useDashBoardStore();
  const {
    displayCurrency,
    setDisplayCurrency,
  } = useCurrency();

  // Get user roles for permission checking
  const userRoles = user?.roles || [];

  // Get user's licencee assignments (memoized to prevent unnecessary re-renders)
  const userLicencees = useMemo(() => {
    return Array.isArray(user?.assignedLicencees) ? user.assignedLicencees : [];
  }, [user?.assignedLicencees]);

  const isOwner = userRoles.includes('owner');
  const isAdmin =
    userRoles.includes('admin') || userRoles.includes('developer');
  const isManager = userRoles.includes('manager');
  const hasMultipleLicencees =
    Array.isArray(userLicencees) && userLicencees.length > 1;
  const hasSingleLicencee =
    Array.isArray(userLicencees) && userLicencees.length === 1;

  // Determine if licencee select should be shown
  // Show if: admin OR user has multiple licencees (including location admins with multiple licencees)
  // Hide if: user has 0 or 1 licencee (and not admin/dev) OR location admin with single/no licencee
  const shouldShowLicenceeSelect =
    isAdmin || (hasMultipleLicencees && !userRoles.includes('cashier'));

  // Determine if we should show licencee name next to "Evolution CMS"
  // Show if: user has exactly one licencee AND not admin/dev AND (not manager OR manager with single licencee)
  const shouldShowLicenceeName =
    hasSingleLicencee && !isAdmin && (!isManager || hasSingleLicencee);
  // Check if the current path is related to members
  const isMembersPath =
    pathname === '/members' || pathname.startsWith('/members/');

  // Check if the current path is related to sessions
  const isSessionsPath =
    pathname === '/sessions' || pathname.startsWith('/sessions/');

  // Hide currency selector on members, sessions, and member details pages
  const shouldHideCurrency = isMembersPath || isSessionsPath;

  const shouldRenderCurrencyFilter =
    !hideCurrencyFilter &&
    !shouldHideCurrency &&
    !userRoles.includes('vault-manager') &&
    !userRoles.includes('cashier');

  const [licenceeCurrencyMap, setLicenceeCurrencyMap] = useState<
    Record<string, CurrencyCode>
  >({});
  const [singleLicenceeName, setSingleLicenceeName] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const loadLicencees = async () => {
      try {
        const result = await fetchLicencees();
        if (cancelled) return;
        
        // Extract licencees array from the result
        const licencees = Array.isArray(result.licencees) ? result.licencees : [];

        const map: Record<string, CurrencyCode> = {};
        licencees.forEach(licencee => {
          let currency = getLicenceeCurrency(licencee.name);
          if (
            currency === 'USD' &&
            (licencee.countryName || typeof licencee.country === 'string')
          ) {
            const fallback = licencee.countryName
              ? getCountryCurrency(licencee.countryName)
              : getCountryCurrency(licencee.country);
            currency = fallback || currency;
          }

          map[String(licencee._id)] = currency;
          map[licencee.name] = currency;
        });

        setLicenceeCurrencyMap(map);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to load licencee currencies:', error);
        }
      }
    };

    loadLicencees();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load single licencee name if applicable
  useEffect(() => {
    let cancelled = false;
    const loadSingleLicenceeName = async () => {
      if (
        !shouldShowLicenceeName ||
        !hasSingleLicencee ||
        userLicencees.length === 0
      ) {
        setSingleLicenceeName('');
        return;
      }

      try {
        const licenceeId = userLicencees[0];
        const licencee = await fetchLicenceeById(licenceeId);
        if (!cancelled && licencee?.name) {
          setSingleLicenceeName(licencee.name);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to load single licencee name:', error);
        }
        if (!cancelled) {
          setSingleLicenceeName('');
        }
      }
    };

    loadSingleLicenceeName();
    return () => {
      cancelled = true;
    };
  }, [shouldShowLicenceeName, hasSingleLicencee, userLicencees]);

  // Load initial gameDayOffset on mount if selectedLicencee is present
  useEffect(() => {
    if (selectedLicencee && selectedLicencee !== 'all') {
      fetchLicenceeById(selectedLicencee).then(licencee => {
        if (licencee && typeof licencee.gameDayOffset === 'number') {
          setGameDayOffset(licencee.gameDayOffset);
        }
      });
    }
  }, [selectedLicencee, setGameDayOffset]);

  const resolveLicenceeCurrency = useCallback(
    async (licenceeId: string): Promise<CurrencyCode> => {
      if (!licenceeId || licenceeId === 'all' || licenceeId === '') {
        return 'USD';
      }

      const cached =
        licenceeCurrencyMap[licenceeId] ||
        licenceeCurrencyMap[licenceeId.trim()] ||
        licenceeCurrencyMap[
          Object.keys(licenceeCurrencyMap).find(
            key => key.toLowerCase() === licenceeId.toLowerCase()
          ) || ''
        ];

      if (cached) {
        return cached;
      }

      try {
        const licencee = await fetchLicenceeById(licenceeId);
        if (licencee?.name) {
          let currency = getLicenceeCurrency(licencee.name);
          if (
            currency === 'USD' &&
            (licencee.countryName || typeof licencee.country === 'string')
          ) {
            const fallback = licencee.countryName
              ? getCountryCurrency(licencee.countryName)
              : getCountryCurrency(licencee.country);
            currency = fallback || currency;
          }

          setLicenceeCurrencyMap(prev => ({
            ...prev,
            [licenceeId]: currency,
            [licencee.name]: currency,
          }));
          return currency;
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            'Failed to resolve currency for licencee:',
            licenceeId,
            error
          );
        }
      }

      return getLicenceeCurrency(licenceeId);
    },
    [licenceeCurrencyMap]
  );

  // Wrapper function to handle licencee changes
  const handleLicenceeChange = async (newLicencee: string) => {
    if (setSelectedLicencee) {
      setSelectedLicencee(newLicencee);
    }

    // Update currency context based on licencee selection
    const isAllLicencee =
      !newLicencee || newLicencee === 'all' || newLicencee === '';
    
    let targetCurrency = displayCurrency;
    if (!isAllLicencee && displayCurrency === 'USD') {
      targetCurrency = await resolveLicenceeCurrency(newLicencee);
      setDisplayCurrency(targetCurrency);
    }

    // Update gameDayOffset based on licencee
    if (!isAllLicencee) {
      try {
        const licencee = await fetchLicenceeById(newLicencee);
        if (licencee && typeof licencee.gameDayOffset === 'number') {
          setGameDayOffset(licencee.gameDayOffset);
        } else {
          setGameDayOffset(8);
        }
      } catch {
        setGameDayOffset(8);
      }
    } else {
      setGameDayOffset(8);
    }

    // If we're on the dashboard and have an active filter, refresh data
    if (pathname === '/' && activeMetricsFilter) {
      setLoadingChartData(true);
      try {
        await fetchMetricsData(
          activeMetricsFilter,
          customDateRange,
          newLicencee,
          setTotals,
          setChartData,
          setActiveFilters,
          setShowDatePicker,
          targetCurrency
        );
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error refreshing data after licencee change:', error);
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

  return (
    <ClientOnly fallback={<div className="h-16 animate-pulse bg-gray-100" />}>
      <div className={`flex flex-col gap-2 ${containerPaddingMobile || ''}`}>
        {/* Header Section: Main header with title and licencee selector */}
        <header className="flex w-full flex-col p-2 mb-4">
          {/* Menu Button and Main Title Row: Mobile sidebar trigger and title */}
          <div className="flex w-full min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {/* Left side: Menu button and title */}
            <div className="flex w-full min-w-0 flex-shrink items-center gap-2 sm:w-auto">
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
                <h1 className="shrink-0 whitespace-nowrap text-left text-base font-semibold tracking-tight sm:text-lg md:ml-0 xl:text-xl flex items-center gap-2">
                  Evolution CMS {isOwner && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 shadow-sm animate-pulse">
                      OWNER
                    </span>
                  )} {pageTitle && <span className="text-gray-400 font-normal"> — {pageTitle}</span>}
                </h1>
                {shouldShowLicenceeName && singleLicenceeName && (
                  <span className="inline-flex items-center rounded-full bg-buttonActive/10 px-3 py-1 text-xs font-medium text-buttonActive ring-1 ring-inset ring-buttonActive/20 sm:text-sm">
                    {singleLicenceeName}
                  </span>
                )}
              </div>
            </div>

            {/* Right side: Filters */}
            {(!hideLicenceeFilter && shouldShowLicenceeSelect) || shouldRenderCurrencyFilter ? (
              <div className="flex w-full min-w-0 shrink items-center gap-2 sm:w-auto sm:justify-end">
                {!hideLicenceeFilter && shouldShowLicenceeSelect && (
                  <div
                    className="min-w-0 w-full overflow-hidden sm:w-auto md:max-w-[200px] lg:max-w-[220px] xl:max-w-none"
                    style={{
                      // On strictly mobile, let it be 100% width or whatever flex permits, disable the clamp if on very small screen
                      width: '100%',
                      maxWidth: '100%',
                    }}
                  >
                    {/* Applying a media query class approach for the clamp to only apply on sm+ */}
                    <div className="w-full sm:w-[clamp(120px,calc((100vw-240px)*0.5+120px),200px)] md:w-auto lg:w-full">
                      <LicenceeSelect
                        selected={selectedLicencee || ''}
                        onChange={handleLicenceeChange}
                        userLicenceeIds={isAdmin ? undefined : userLicencees}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                )}
                {shouldRenderCurrencyFilter && (
                  <CurrencyFilter
                    className="hidden md:flex"
                    disabled={disabled}
                    userRoles={userRoles}
                    hasMultipleLicencees={hasMultipleLicencees}
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
                  className="fixed inset-0 z-[40000] bg-black bg-opacity-50"
                  onClick={() => setMobileMenuOpen(false)}
                />
                {/* Mobile Menu Panel: Slide-out navigation menu */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'tween', duration: 0.3 }}
                  className="fixed left-0 top-0 z-[50000] flex h-full w-80 flex-col bg-container shadow-xl"
                >
                  {/* Mobile Navigation Menu: Navigation buttons for mobile users */}
                  <div className="flex h-full flex-col space-y-4 p-6">
                    {/* Dashboard Navigation Button */}
                    {shouldShowNavigationLink(userRoles as UserRole[], 'dashboard') && (
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
                    {shouldShowNavigationLink(userRoles as UserRole[], 'locations') && (
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
                    {shouldShowNavigationLink(userRoles as UserRole[], 'machines') && (
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
                      userRoles as UserRole[],
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
                    {shouldShowNavigationLink(userRoles as UserRole[], 'administration') && (
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
                    {shouldShowNavigationLink(userRoles as UserRole[], 'reports') && (
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
                    {shouldShowNavigationLink(userRoles as UserRole[], 'members') && (
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
                    {shouldShowNavigationLink(userRoles as UserRole[], 'sessions') && (
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

                    {/* Mobile Currency Selector - only show when "All Licencee" is selected */}
                    {shouldRenderCurrencyFilter && (
                      <div className="mt-6 border-t border-gray-200 p-4">
                        <CurrencyFilter
                          className="w-full"
                          disabled={disabled}
                          userRoles={userRoles as UserRole[]}
                          hasMultipleLicencees={hasMultipleLicencees}
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

        
        </header>
      </div>
    </ClientOnly>
  );
}

