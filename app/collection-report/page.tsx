'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
// Import Framer Motion with error handling
import { useAsyncError } from '@/components/ui/ErrorBoundary';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

// Dynamically import Framer Motion to avoid SSR issues
const MotionDiv = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.motion.div })),
  {
    ssr: false,
  }
);

const AnimatePresence = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.AnimatePresence })),
  {
    ssr: false,
  }
);

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PageLayout from '@/components/layout/PageLayout';
import { NoLicenseeAssigned } from '@/components/ui/NoLicenseeAssigned';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { shouldShowNoLicenseeMessage } from '@/lib/utils/licenseeAccess';
import { hasManagerAccess } from '@/lib/utils/permissions';

// GSAP will be loaded dynamically in useEffect

import {
  fetchAllLocationNames,
  fetchCollectionReportsByLicencee,
  fetchMonthlyReportSummaryAndDetails,
  getLocationsWithMachines,
} from '@/lib/helpers/collectionReport';
import {
  handlePaginationWithAnimation,
  handleTabChange,
  resetCollectorFilters,
  resetSchedulerFilters,
  syncStateWithURL,
} from '@/lib/helpers/collectionReportPage';
import {
  animateCards,
  animateContentTransition,
  animatePagination,
  animateTableRows,
  calculatePagination,
  fetchAndFormatSchedulers,
  filterCollectionReports,
  setLastMonthDateRange,
} from '@/lib/helpers/collectionReportPageV2';
import { fetchAndFormatCollectorSchedules } from '@/lib/helpers/collectorSchedules';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import type { CollectionReportLocationWithMachines } from '@/lib/types/api';
import type {
  CollectionReportRow,
  MonthlyReportDetailsRow,
  MonthlyReportSummary,
  SchedulerTableRow,
} from '@/lib/types/componentProps';
import type { LocationSelectItem } from '@/lib/types/location';
import { DateRange as RDPDateRange } from 'react-day-picker';

import CollectionDesktopUI from '@/components/collectionReport/CollectionDesktopUI';
import CollectionMobileUI from '@/components/collectionReport/CollectionMobileUI';
import CollectorDesktopUI from '@/components/collectionReport/CollectorDesktopUI';
import CollectorMobileUI from '@/components/collectionReport/CollectorMobileUI';
import EditCollectionModal from '@/components/collectionReport/EditCollectionModal';
import ManagerDesktopUI from '@/components/collectionReport/ManagerDesktopUI';
import ManagerMobileUI from '@/components/collectionReport/ManagerMobileUI';
import MobileCollectionModal from '@/components/collectionReport/mobile/MobileCollectionModal';
import MobileEditCollectionModal from '@/components/collectionReport/mobile/MobileEditCollectionModal';
import MonthlyDesktopUI from '@/components/collectionReport/MonthlyDesktopUI';
import MonthlyMobileUI from '@/components/collectionReport/MonthlyMobileUI';
import NewCollectionModal from '@/components/collectionReport/NewCollectionModal';
import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import ErrorBoundary from '@/components/ui/errors/ErrorBoundary';
import { CollectionReportPageSkeleton } from '@/components/ui/skeletons/CollectionReportPageSkeleton';

import type { CollectorSchedule } from '@/lib/types/components';

// Icons
import CollectionNavigation from '@/components/collectionReport/CollectionNavigation';
import { Button } from '@/components/ui/button';
import { COLLECTION_TABS_CONFIG } from '@/lib/constants/collection';
import { IMAGES } from '@/lib/constants/images';
import { useCollectionNavigation } from '@/lib/hooks/navigation';
import { useUrlProtection } from '@/lib/hooks/useUrlProtection';
import type { CollectionView } from '@/lib/types/collection';
import { PlusCircle, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import './animations.css';
/**
 * Main page component for the Collection Report.
 * Handles tab switching, data fetching, filtering, and pagination for:
 * - Collection Reports
 * - Monthly Reports
 * - Manager Schedules
 * - Collector Schedules
 */
const mapTimePeriodForAPI = (frontendTimePeriod: string): string => {
  switch (frontendTimePeriod) {
    case 'last7days':
      return '7d';
    case 'last30days':
      return '30d';
    case 'Today':
    case 'Yesterday':
    case 'All Time':
    case 'Custom':
    default:
      return frontendTimePeriod;
  }
};

function CollectionReportPageContent() {
  return (
    <Suspense fallback={<CollectionReportPageSkeleton />}>
      <CollectionReportContent />
    </Suspense>
  );
}

function CollectionReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { handleError } = useAsyncError();
  const {
    selectedLicencee,
    setSelectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();
  const user = useUserStore(state => state.user);

  // State for dynamically loaded GSAP
  const [gsap, setGsap] = useState<typeof import('gsap').gsap | null>(null);

  // Load GSAP dynamically
  useEffect(() => {
    import('gsap')
      .then(module => {
        setGsap(module.gsap);
      })
      .catch(error => {
        console.error('Failed to load GSAP:', error);
      });
  }, []);

  // Initialize selectedLicencee from user's assigned licensees if not set
  useEffect(() => {
    if (user && (!selectedLicencee || selectedLicencee === '')) {
      const userLicensees = user.rel?.licencee || [];

      // If user has exactly 1 licensee, auto-select it
      if (userLicensees.length === 1) {
        console.log(
          "[Collection Report] Auto-selecting user's only licensee:",
          userLicensees[0]
        );
        setSelectedLicencee(userLicensees[0]);
      } else if (userLicensees.length > 1) {
        // User has multiple licensees but none selected - they need to choose
        console.log(
          '[Collection Report] User has multiple licensees, waiting for selection'
        );
      }
    }
  }, [user, selectedLicencee, setSelectedLicencee]);

  // Read initial view from URL and sync on change
  const { pushToUrl } = useCollectionNavigation(COLLECTION_TABS_CONFIG);

  // Initialize activeTab from URL on first load
  const [activeTab, setActiveTab] = useState<CollectionView>(() => {
    const section = searchParams?.get('section');
    if (section === 'monthly') return 'monthly';
    if (section === 'manager') return 'manager';
    if (section === 'collector') return 'collector';
    if (section === 'collection') return 'collection';
    return 'collection'; // default
  });

  // URL protection for collection report tabs
  useUrlProtection({
    page: 'collection-report',
    allowedTabs: ['collection', 'monthly', 'manager', 'collector'],
    defaultTab: 'collection',
    redirectPath: '/unauthorized',
  });

  // Update URL when tab changes
  const handleTabChangeLocal = useCallback(
    (value: string) => {
      handleTabChange(value, setActiveTab, pushToUrl);
    },
    [pushToUrl]
  );

  // Keep state in sync with URL changes (for browser back/forward)
  useEffect(() => {
    syncStateWithURL(searchParams, activeTab, setActiveTab);
  }, [searchParams, activeTab]);

  // Refs for animation and pagination
  const contentRef = useRef<HTMLDivElement>(null);
  const mobilePaginationRef = useRef<HTMLDivElement>(null);
  const desktopPaginationRef = useRef<HTMLDivElement>(null);
  const mobileCardsRef = useRef<HTMLDivElement>(null);
  const desktopTableRef = useRef<HTMLDivElement>(null);
  const monthlyPaginationRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [mobilePage, setMobilePage] = useState(1);
  const [desktopPage, setDesktopPage] = useState(1);
  const itemsPerPage = 10;

  // Sorting state
  const [sortField, setSortField] = useState<keyof CollectionReportRow>('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sort handler
  const handleSort = (field: keyof CollectionReportRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setDesktopPage(1); // Reset to first page when sorting
    setMobilePage(1);
  };

  // Collection report data state
  const [reports, setReports] = useState<CollectionReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Collection Modal states - separate for mobile and desktop
  const [showMobileCollectionModal, setShowMobileCollectionModal] =
    useState(false);
  const [showDesktopCollectionModal, setShowDesktopCollectionModal] =
    useState(false);

  // Edit Collection Modal states - separate for mobile and desktop
  const [showMobileEditCollectionModal, setShowMobileEditCollectionModal] =
    useState(false);
  const [showDesktopEditCollectionModal, setShowDesktopEditCollectionModal] =
    useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  // Delete Confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  // Filter state for collection reports
  const [locations, setLocations] = useState<LocationSelectItem[]>([]);

  // Helper function to determine if mobile or desktop modal should be shown
  const isMobileSize = () => window.innerWidth < 1024;

  // Handle modal switching based on window size
  const handleModalResize = useCallback(() => {
    const isMobile = isMobileSize();

    if (showMobileCollectionModal && !isMobile) {
      setShowMobileCollectionModal(false);
      setShowDesktopCollectionModal(true);
    }

    if (showDesktopCollectionModal && isMobile) {
      setShowDesktopCollectionModal(false);
      setShowMobileCollectionModal(true);
    }
    if (showMobileEditCollectionModal && !isMobile) {
      setShowMobileEditCollectionModal(false);
      setShowDesktopEditCollectionModal(true);
    }

    if (showDesktopEditCollectionModal && isMobile) {
      setShowDesktopEditCollectionModal(false);
      setShowMobileEditCollectionModal(true);
    }
  }, [
    showMobileCollectionModal,
    showDesktopCollectionModal,
    showMobileEditCollectionModal,
    showDesktopEditCollectionModal,
  ]);

  // Add resize listener
  useEffect(() => {
    window.addEventListener('resize', handleModalResize);
    return () => window.removeEventListener('resize', handleModalResize);
  }, [handleModalResize]);

  const autoResumeHandledRef = useRef(false);

  // Handle explicit resume requests via query parameter (?resume=<reportId>)
  useEffect(() => {
    const resumeReportId = searchParams?.get('resume');

    if (resumeReportId) {
      autoResumeHandledRef.current = true;
      setEditingReportId(resumeReportId);

      toast.info('Resuming unfinished edit...', {
        duration: 3000,
        position: 'top-right',
      });

      if (isMobileSize()) {
        setShowMobileEditCollectionModal(true);
      } else {
        setShowDesktopEditCollectionModal(true);
      }

      // Remove the resume param from the URL to prevent re-triggering
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        params.delete('resume');
        const newQuery = params.toString();
        const newPath = newQuery
          ? `${window.location.pathname}?${newQuery}`
          : window.location.pathname;
        router.replace(newPath);
      }
    }
  }, [
    searchParams,
    router,
    setShowDesktopEditCollectionModal,
    setShowMobileEditCollectionModal,
  ]);

  // CRITICAL: Auto-reopen edit modal for reports with isEditing: true
  // This allows users to resume unfinished edits even after page refresh
  useEffect(() => {
    if (autoResumeHandledRef.current) {
      return;
    }

    const checkForUnfinishedEdits = async () => {
      try {
        // Query for most recent report with isEditing: true
        const response = await axios.get('/api/collection-reports', {
          params: {
            isEditing: true,
            limit: 1,
            sortBy: 'updatedAt',
            sortOrder: 'desc',
          },
        });

        if (response.data && response.data.length > 0) {
          const unfinishedReport = response.data[0];
          console.warn(
            `🔄 Found unfinished edit for report ${unfinishedReport._id}, auto-opening edit modal`
          );

          // Set the report ID to edit
          setEditingReportId(unfinishedReport._id);

          // Show toast notification
          toast.info('Resuming unfinished edit...', {
            duration: 3000,
            position: 'top-right',
          });

          // Open the appropriate modal based on screen size
          if (isMobileSize()) {
            setShowMobileEditCollectionModal(true);
          } else {
            setShowDesktopEditCollectionModal(true);
          }
        }
      } catch (error) {
        console.error('Error checking for unfinished edits:', error);
        // Don't show error to user - this is a background check
      }
    };

    checkForUnfinishedEdits();
  }, []); // Empty dependency array - run once on mount

  const [locationsWithMachines, setLocationsWithMachines] = useState<
    CollectionReportLocationWithMachines[]
  >([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [showUncollectedOnly, setShowUncollectedOnly] = useState(false);
  const [search, setSearch] = useState<string>('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Manager Schedule state
  const [schedulers, setSchedulers] = useState<SchedulerTableRow[]>([]);
  const [loadingSchedulers, setLoadingSchedulers] = useState(true);
  const [selectedSchedulerLocation, setSelectedSchedulerLocation] =
    useState('all');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [collectors, setCollectors] = useState<string[]>([]);

  // Collector Schedule state
  const [collectorSchedules, setCollectorSchedules] = useState<
    CollectorSchedule[]
  >([]);
  const [loadingCollectorSchedules, setLoadingCollectorSchedules] =
    useState(true);
  const [selectedCollectorLocation, setSelectedCollectorLocation] =
    useState('all');
  const [selectedCollectorFilter, setSelectedCollectorFilter] = useState('all');
  const [selectedCollectorStatus, setSelectedCollectorStatus] = useState('all');
  const [collectorsList, setCollectorsList] = useState<string[]>([]);

  // Monthly Report state
  const [monthlySummary, setMonthlySummary] = useState<MonthlyReportSummary>({
    drop: '-',
    cancelledCredits: '-',
    gross: '-',
    sasGross: '-',
  });
  const [monthlyDetails, setMonthlyDetails] = useState<
    MonthlyReportDetailsRow[]
  >([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyLocation, setMonthlyLocation] = useState<string>('all');
  const now = new Date();
  const [monthlyDateRange, setMonthlyDateRange] = useState<RDPDateRange>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: now,
  });
  const [pendingRange, setPendingRange] = useState<RDPDateRange>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: now,
  });
  const [allLocationNames, setAllLocationNames] = useState<string[]>([]);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const monthlyItemsPerPage = 10;

  // Fetch all gaming locations for filter dropdown
  useEffect(() => {
    fetchAllGamingLocations(selectedLicencee).then(locs => {
      console.warn(
        '[LOCATIONS FETCH] Fetched locations for licensee:',
        selectedLicencee
      );
      console.warn(`[LOCATIONS FETCH] Got ${locs.length} locations`);
      setLocations(locs.map(l => ({ _id: l.id, name: l.name })));

      // Reset selectedLocation to "all" when licensee changes to avoid filtering issues
      setSelectedLocation('all');
    });
  }, [selectedLicencee]);

  // Function to refresh locations data with machines
  const refreshLocations = useCallback(() => {
    console.log(
      '[refreshLocations] Fetching locations with machines for licensee:',
      selectedLicencee
    );
    getLocationsWithMachines(selectedLicencee).then(locs => {
      console.log(
        '[refreshLocations] Received locations with machines:',
        locs.length
      );
      setLocationsWithMachines(locs);
    });
  }, [selectedLicencee]);

  // Fetch locations with machines for the modal
  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  // Fetch collection reports data when collection tab is active
  useEffect(() => {
    if (activeTab === 'collection') {
      setLoading(true);

      // Determine parameters for fetch based on activeMetricsFilter
      let dateRangeForFetch = undefined;
      let timePeriodForFetch = undefined;

      if (activeMetricsFilter === 'Custom') {
        // For custom filter, check if both dates are set
        if (customDateRange?.startDate && customDateRange?.endDate) {
          dateRangeForFetch = {
            from: customDateRange.startDate,
            to: customDateRange.endDate,
          };
          timePeriodForFetch = 'Custom';
        } else {
          // Custom selected but no range: do not fetch
          setLoading(false);
          return;
        }
      } else {
        // For predefined periods (Today, Yesterday, last7days, last30days), pass the time period
        timePeriodForFetch = mapTimePeriodForAPI(activeMetricsFilter);
      }

      fetchCollectionReportsByLicencee(
        selectedLicencee === '' ? undefined : selectedLicencee,
        dateRangeForFetch,
        timePeriodForFetch
      )
        .then(async (data: CollectionReportRow[]) => {
          setReports(data);
          setLoading(false);

          // Report issues checking removed - no more global scans
        })
        .catch((error: unknown) => {
          // Error is already handled gracefully in fetchCollectionReportsByLicencee
          setReports([]);
          setLoading(false);
          if (error instanceof Error) {
            handleError(error);
          }
        });
    }
  }, [
    activeTab,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    handleError,
  ]);

  const refreshCollectionReports = useCallback(() => {
    if (activeTab === 'collection') {
      setLoading(true);

      let dateRangeForFetch = undefined;
      let timePeriodForFetch = undefined;

      if (activeMetricsFilter === 'Custom') {
        if (customDateRange?.startDate && customDateRange?.endDate) {
          dateRangeForFetch = {
            from: customDateRange.startDate,
            to: customDateRange.endDate,
          };
          timePeriodForFetch = 'Custom';
        } else {
          setLoading(false);
          return;
        }
      } else {
        timePeriodForFetch = mapTimePeriodForAPI(activeMetricsFilter);
      }

      fetchCollectionReportsByLicencee(
        selectedLicencee === '' ? undefined : selectedLicencee,
        dateRangeForFetch,
        timePeriodForFetch
      )
        .then(async (data: CollectionReportRow[]) => {
          setReports(data);
          setLoading(false);

          // Report issues checking removed - no more global scans
        })
        .catch((error: unknown) => {
          // Error is already handled gracefully in fetchCollectionReportsByLicencee
          setReports([]);
          setLoading(false);
          if (error instanceof Error) {
            handleError(error);
          }
        });
    }
  }, [
    activeTab,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    handleError,
  ]);

  useEffect(() => {
    if (contentRef.current) {
      animateContentTransition(contentRef);
    }
  }, [activeTab]);

  useEffect(() => {
    setDesktopPage(1);
    setMobilePage(1);
  }, [selectedLocation, search, showUncollectedOnly, selectedFilters]);
  useEffect(() => {
    if (!loading && !isSearching && activeTab === 'collection') {
      if (desktopTableRef.current) {
        animateTableRows(desktopTableRef);
      }
      if (mobileCardsRef.current) {
        animateCards(mobileCardsRef);
      }
    }
  }, [loading, isSearching, mobilePage, desktopPage, activeTab]);

  const filteredReports = useMemo(() => {
    console.warn('[COLLECTION REPORT FILTERING - LICENSEE CHANGE DEBUG]');
    console.warn(`Selected licensee: "${selectedLicencee}"`);
    console.warn(`Reports count: ${reports?.length || 0}`);
    console.warn(`Selected location: "${selectedLocation}"`);
    console.warn(`Locations count: ${locations?.length || 0}`);
    console.warn(`Search term: "${search}"`);
    console.warn(`Show uncollected only: ${showUncollectedOnly}`);
    console.warn(`Selected filters: ${JSON.stringify(selectedFilters)}`);

    if (!reports || !Array.isArray(reports)) {
      console.warn('No reports or reports is not an array');
      return [];
    }

    // Log first few reports to see what data we have
    if (reports.length > 0) {
      console.warn('First 3 reports:');
      reports.slice(0, 3).forEach((report, index) => {
        console.warn(
          `  ${index + 1}. Location: "${report.location}", Collector: "${
            report.collector
          }"`
        );
      });
    }

    // Log available locations
    if (locations.length > 0) {
      console.warn('Available locations:');
      locations.slice(0, 5).forEach((location, index) => {
        console.warn(
          `  ${index + 1}. ID: "${location._id}", Name: "${location.name}"`
        );
      });
      if (locations.length > 5) {
        console.warn(`  ... and ${locations.length - 5} more locations`);
      }
    }

    const filtered = filterCollectionReports(
      reports,
      selectedLocation,
      search,
      showUncollectedOnly,
      locations
    );

    console.warn(`After filterCollectionReports: ${filtered.length} reports`);

    // Apply SMIB filters
    if (selectedFilters.length > 0) {
      const smibFiltered = filtered.filter(report => {
        return selectedFilters.some(filter => {
          if (filter === 'SMIBLocationsOnly' && !report.noSMIBLocation)
            return true;
          if (filter === 'NoSMIBLocation' && report.noSMIBLocation === true)
            return true;
          if (filter === 'LocalServersOnly' && report.isLocalServer)
            return true;
          return false;
        });
      });
      console.warn(`After SMIB filters: ${smibFiltered.length} reports`);
      return smibFiltered;
    }

    console.warn(`Final filtered reports: ${filtered.length}`);

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // Special handling for time field - desc should show most recent first
      if (sortField === 'time') {
        const aTime =
          typeof aValue === 'string' || typeof aValue === 'number'
            ? new Date(aValue).getTime()
            : 0;
        const bTime =
          typeof bValue === 'string' || typeof bValue === 'number'
            ? new Date(bValue).getTime()
            : 0;
        return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return sorted;
  }, [
    reports,
    selectedLocation,
    showUncollectedOnly,
    search,
    locations,
    selectedFilters,
    selectedLicencee, // Add selectedLicencee to dependencies
    sortField,
    sortDirection,
  ]);

  // Check if user has permission to edit reports
  // Only collectors, location collectors, managers, admins, and developers can edit
  const isDeveloper = useMemo(() => {
    return user?.roles?.includes('developer') ?? false;
  }, [user?.roles]);

  const canUserEdit = useMemo(() => {
    if (!user || !user.roles) return false;
    return hasManagerAccess(user.roles);
  }, [user]);

  // Determine which reports can be edited (only most recent per location)
  const editableReportIds = useMemo(() => {
    // If user doesn't have permission, return empty set
    if (!canUserEdit) {
      return new Set<string>();
    }

    if (isDeveloper) {
      return new Set(filteredReports.map(report => report.locationReportId));
    }

    const reportsByLocation = new Map<string, CollectionReportRow>();

    // Group reports by location and find the most recent one for each
    filteredReports.forEach(report => {
      const existing = reportsByLocation.get(report.location);
      if (!existing) {
        reportsByLocation.set(report.location, report);
      } else {
        // Compare timestamps to find most recent
        const existingTime = new Date(existing.time).getTime();
        const currentTime = new Date(report.time).getTime();
        if (currentTime > existingTime) {
          reportsByLocation.set(report.location, report);
        }
      }
    });

    // Return set of locationReportIds that are the most recent for their location
    return new Set(
      Array.from(reportsByLocation.values()).map(r => r.locationReportId)
    );
  }, [filteredReports, canUserEdit, isDeveloper]);

  const fetchMonthlyData = useCallback(() => {
    if (!monthlyDateRange.from || !monthlyDateRange.to) return;
    setMonthlyLoading(true);
    setMonthlyPage(1);
    fetchMonthlyReportSummaryAndDetails({
      startDate: monthlyDateRange.from,
      endDate: monthlyDateRange.to,
      locationName: monthlyLocation !== 'all' ? monthlyLocation : undefined,
      licencee: selectedLicencee,
    })
      .then(({ summary, details }) => {
        // Calculate drop values for verification (development only)
        if (
          process.env.NODE_ENV === 'development' &&
          details &&
          details.length > 0
        ) {
          const dropValues = details.map(detail => parseInt(detail.drop) || 0);
          const dropSum = dropValues.reduce((sum, drop) => sum + drop, 0);
          console.warn(
            'DROP CALCULATION:',
            `${dropValues.join(' + ')} = ${dropSum}`
          );
        }

        setMonthlySummary(summary);
        setMonthlyDetails(details);
        setMonthlyLoading(false);
      })
      .catch(() => {
        setMonthlySummary({
          drop: '-',
          cancelledCredits: '-',
          gross: '-',
          sasGross: '-',
        });
        setMonthlyDetails([]);
        setMonthlyLoading(false);
      });
  }, [monthlyDateRange, monthlyLocation, selectedLicencee]);

  // Pagination calculations for mobile and desktop
  const mobileData = calculatePagination(
    filteredReports,
    mobilePage,
    itemsPerPage
  );
  const desktopData = calculatePagination(
    filteredReports,
    desktopPage,
    itemsPerPage
  );

  // Pagination handlers with animation
  const paginateMobile = (pageNumber: number) => {
    handlePaginationWithAnimation(
      pageNumber,
      setMobilePage,
      activeTab,
      mobilePaginationRef,
      animatePagination
    );
  };

  const paginateDesktop = (pageNumber: number) => {
    handlePaginationWithAnimation(
      pageNumber,
      setDesktopPage,
      activeTab,
      desktopPaginationRef,
      animatePagination
    );
  };

  // Fetch manager schedules and collectors when manager tab is active or filters change
  useEffect(() => {
    if (activeTab === 'manager') {
      setLoadingSchedulers(true);
      fetchAndFormatSchedulers(
        selectedSchedulerLocation,
        selectedCollector,
        selectedStatus,
        locations
      )
        .then(({ schedulers, collectors }) => {
          setCollectors(collectors);
          setSchedulers(schedulers);
          setLoadingSchedulers(false);
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching schedulers:', error);
          }
          setLoadingSchedulers(false);
        });
    }
  }, [
    activeTab,
    selectedSchedulerLocation,
    selectedCollector,
    selectedStatus,
    locations,
  ]);

  // Reset all manager schedule filters
  const handleResetSchedulerFilters = () => {
    resetSchedulerFilters(
      setSelectedSchedulerLocation,
      setSelectedCollector,
      setSelectedStatus
    );
  };

  // Fetch collector schedules when collector tab is active or filters change
  useEffect(() => {
    if (activeTab === 'collector') {
      setLoadingCollectorSchedules(true);
      fetchAndFormatCollectorSchedules(
        selectedLicencee === '' ? undefined : selectedLicencee,
        selectedCollectorLocation,
        selectedCollectorFilter,
        selectedCollectorStatus
      )
        .then(({ collectorSchedules, collectors }) => {
          setCollectorsList(collectors);
          setCollectorSchedules(collectorSchedules);
          setLoadingCollectorSchedules(false);
        })
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching collector schedules:', error);
          }
          setLoadingCollectorSchedules(false);
        });
    }
  }, [
    activeTab,
    selectedLicencee,
    selectedCollectorLocation,
    selectedCollectorFilter,
    selectedCollectorStatus,
  ]);

  // Reset all collector schedule filters
  const handleResetCollectorFilters = () => {
    resetCollectorFilters(
      setSelectedCollectorLocation,
      setSelectedCollectorFilter,
      setSelectedCollectorStatus
    );
  };

  // Fetch all location names and monthly data when monthly tab is active
  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchAllLocationNames()
        .then((names: string[]) => {
          setAllLocationNames(names);
        })
        .catch((error: Error) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching locations:', error);
          }
          setAllLocationNames([]);
        });
      fetchMonthlyData();
    }
  }, [activeTab, fetchMonthlyData]);

  // Refetch monthly data when date range or location changes
  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyData();
    }
  }, [monthlyDateRange, monthlyLocation, activeTab, fetchMonthlyData]);

  // Set date range to last month for monthly report
  const handleLastMonth = () => {
    setLastMonthDateRange(setMonthlyDateRange, setPendingRange);
  };

  // Apply the pending date range to the monthly report
  const applyPendingDateRange = () => {
    if (pendingRange?.from && pendingRange?.to) {
      setMonthlyDateRange(pendingRange);
    }
  };

  // Pagination for monthly report
  const paginateMonthly = (pageNumber: number) => {
    setMonthlyPage(pageNumber);
    if (monthlyPaginationRef.current && activeTab === 'monthly') {
      try {
        if (gsap) {
          gsap.fromTo(
            monthlyPaginationRef.current,
            { scale: 0.95, opacity: 0.8 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.3,
              ease: 'back.out(1.7)',
            }
          );
        }
      } catch (error) {
        console.error('GSAP animation error:', error);
      }
    }
  };

  // Paginated items for monthly report
  const monthlyCurrentItems = monthlyDetails.slice(
    (monthlyPage - 1) * monthlyItemsPerPage,
    monthlyPage * monthlyItemsPerPage
  );
  const monthlyTotalPages = Math.ceil(
    monthlyDetails.length / monthlyItemsPerPage
  );

  // Handle changes to the pending date range for monthly report
  const handlePendingRangeChange = (range?: RDPDateRange) => {
    if (range && range.from && range.to) {
      setPendingRange(range);
    } else if (range && range.from && !range.to) {
      setPendingRange({ from: range.from, to: undefined });
    } else {
      setPendingRange({ from: undefined, to: undefined });
    }
  };

  // Search functionality
  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleSearchSubmit = () => {
    if (search.trim()) {
      setIsSearching(true);
      // Trigger search animation
      setTimeout(() => {
        setIsSearching(false);
      }, 500);
    }
  };

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
  };

  const handleShowUncollectedOnlyChange = (checked: boolean) => {
    setShowUncollectedOnly(checked);
  };

  const handleFilterChange = (filter: string, checked: boolean) => {
    if (checked) {
      setSelectedFilters(prev => [...prev, filter]);
    } else {
      setSelectedFilters(prev => prev.filter(f => f !== filter));
    }
  };

  const handleClearFilters = () => {
    setSelectedLocation('all');
    setShowUncollectedOnly(false);
    setSearch('');
    setSelectedFilters([]);
  };

  // Handle edit collection report
  const handleEditCollectionReport = async (reportId: string) => {
    setEditingReportId(reportId);

    // Ensure locations are loaded before opening modal
    if (locationsWithMachines.length === 0) {
      console.warn('Locations not loaded yet, loading them now...');
      try {
        const locations = await getLocationsWithMachines(selectedLicencee);
        setLocationsWithMachines(locations);
      } catch (error) {
        console.error('Failed to load locations:', error);
        toast.error('Failed to load locations. Please try again.');
        return;
      }
    }

    // Check if mobile or desktop and show appropriate modal
    if (isMobileSize()) {
      setShowMobileEditCollectionModal(true);
    } else {
      setShowDesktopEditCollectionModal(true);
    }
  };

  // Handle delete collection report
  const handleDeleteCollectionReport = (reportId: string) => {
    setReportToDelete(reportId);
    setShowDeleteConfirmation(true);
  };

  // Confirm delete collection report
  const confirmDeleteCollectionReport = async () => {
    if (!reportToDelete) return;

    try {
      // Delete the collection report and all associated collections
      const response = await axios.delete(
        `/api/collection-report/${reportToDelete}`
      );

      if (response.data.success) {
        toast.success('Collection report deleted successfully!');
        // Refresh the reports list
        refreshCollectionReports();
      } else {
        toast.error('Failed to delete collection report');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting collection report:', error);
      }
      toast.error('Failed to delete collection report. Please try again.');
    } finally {
      setShowDeleteConfirmation(false);
      setReportToDelete(null);
    }
  };

  // Handle close edit modal
  const handleCloseEditModal = useCallback(() => {
    setShowMobileEditCollectionModal(false);
    setShowDesktopEditCollectionModal(false);
    // Delay clearing reportId to allow modal to cleanup properly
    setTimeout(() => {
      setEditingReportId(null);
    }, 300); // Wait for modal close animation
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCollectionReports();
    setRefreshing(false);
  };

  // Debugging: Log data and filters to diagnose empty UI (development only)
  // if (process.env.NODE_ENV === "development") {
  //   console.log("DEBUG: reports", reports);
  //   console.log("DEBUG: filteredReports", filteredReports);
  //   console.log("DEBUG: desktopData", desktopData);
  //   console.log("DEBUG: mobileData", mobileData);
  //   console.log("DEBUG: desktopPage", desktopPage);
  //   console.log("DEBUG: mobilePage", mobilePage);
  // }

  // Show "No Licensee Assigned" message for non-admin users without licensees
  const showNoLicenseeMessage = shouldShowNoLicenseeMessage(user);
  if (showNoLicenseeMessage) {
    return (
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
        }}
        pageTitle="Collection Reports"
        hideOptions
        hideLicenceeFilter={false}
        hideCurrencyFilter
        mainClassName="flex flex-col flex-1 p-4 md:p-6 overflow-x-hidden"
        showToaster={true}
      >
        <NoLicenseeAssigned />
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout
        headerProps={{
          selectedLicencee,
          setSelectedLicencee,
          disabled: false,
        }}
        hideCurrencyFilter
        mainClassName="flex flex-col flex-1 w-full max-w-full p-4 md:p-6 overflow-x-hidden"
        showToaster={true}
      >
        {/* <MaintenanceBanner /> */}
        {/* Header Section: Title, refresh icon, and create button */}
        <div className="mt-4 flex w-full max-w-full items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800 sm:text-2xl md:text-3xl">
            Collection Report
            <Image
              src={IMAGES.creditCardIcon}
              alt="Collection Report Icon"
              width={32}
              height={32}
              className="h-5 w-5 flex-shrink-0 sm:h-6 sm:w-6 md:h-8 md:w-8"
              suppressHydrationWarning
            />
          </h1>

          {/* Right side: Refresh icon and Create button */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {/* Refresh icon - always icon only */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-shrink-0 p-1.5 text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 md:p-2"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>

            {/* Create button - Desktop full button, Mobile icon only */}
            {activeTab === 'collection' && (
              <>
                {/* Desktop: Full button */}
                <div className="hidden md:block">
                  {refreshing || loading ? (
                    <div className="flex h-10 w-36 animate-pulse items-center justify-center rounded-md bg-gray-200" />
                  ) : (
                    <Button
                      onClick={() => {
                        setShowDesktopCollectionModal(true);
                      }}
                      className="flex items-center gap-2 bg-buttonActive text-white transition-colors hover:bg-purple-700"
                      disabled={refreshing}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Create Collection Report
                    </Button>
                  )}
                </div>
                {/* Mobile: Icon only */}
                <div className="md:hidden">
                  <button
                    onClick={() => {
                      setShowMobileCollectionModal(true);
                    }}
                    disabled={refreshing}
                    className="flex-shrink-0 p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Create Collection Report"
                  >
                    <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mb-8 mt-8">
          <CollectionNavigation
            tabs={COLLECTION_TABS_CONFIG}
            activeView={activeTab}
            onChange={v => handleTabChangeLocal(v)}
            isLoading={false}
          />
        </div>

        {activeTab !== 'monthly' && (
          <>
            <div className="hidden xl:block">
              <DashboardDateFilters
                disabled={false}
                onCustomRangeGo={() => {
                  if (activeTab === 'collection') {
                    setLoading(true);
                  }
                }}
                hideAllTime={false}
              />
            </div>
            <div className="mt-4 xl:hidden">
              <DashboardDateFilters
                mode="auto"
                disabled={false}
                onCustomRangeGo={() => {
                  if (activeTab === 'collection') {
                    setLoading(true);
                  }
                }}
                hideAllTime={false}
              />
            </div>
          </>
        )}

        <div className="mt-6 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <MotionDiv
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'collection' && (
                <div className="tab-content-wrapper">
                  <CollectionDesktopUI
                    loading={loading}
                    filteredReports={filteredReports}
                    desktopCurrentItems={desktopData.currentItems}
                    desktopTotalPages={desktopData.totalPages}
                    desktopPage={desktopPage}
                    onPaginateDesktop={paginateDesktop}
                    desktopPaginationRef={desktopPaginationRef}
                    desktopTableRef={desktopTableRef}
                    itemsPerPage={itemsPerPage}
                    locations={locations}
                    selectedLocation={selectedLocation}
                    onLocationChange={handleLocationChange}
                    search={search}
                    onSearchChange={handleSearchChange}
                    onSearchSubmit={handleSearchSubmit}
                    showUncollectedOnly={showUncollectedOnly}
                    reportIssues={{}}
                    onShowUncollectedOnlyChange={
                      handleShowUncollectedOnlyChange
                    }
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    isSearching={isSearching}
                    onEdit={handleEditCollectionReport}
                    onDelete={handleDeleteCollectionReport}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    selectedLicencee={selectedLicencee}
                    editableReportIds={editableReportIds}
                  />
                  <CollectionMobileUI
                    loading={loading}
                    filteredReports={filteredReports}
                    mobileCurrentItems={mobileData.currentItems}
                    mobileTotalPages={mobileData.totalPages}
                    mobilePage={mobilePage}
                    onPaginateMobile={paginateMobile}
                    mobilePaginationRef={mobilePaginationRef}
                    mobileCardsRef={mobileCardsRef}
                    itemsPerPage={itemsPerPage}
                    reportIssues={{}}
                    locations={locations}
                    selectedLocation={selectedLocation}
                    onLocationChange={handleLocationChange}
                    search={search}
                    onSearchChange={handleSearchChange}
                    onSearchSubmit={handleSearchSubmit}
                    showUncollectedOnly={showUncollectedOnly}
                    onShowUncollectedOnlyChange={
                      handleShowUncollectedOnlyChange
                    }
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    isSearching={isSearching}
                    onEdit={handleEditCollectionReport}
                    onDelete={handleDeleteCollectionReport}
                    selectedLicencee={selectedLicencee}
                    editableReportIds={editableReportIds}
                  />
                </div>
              )}
              {activeTab === 'monthly' && (
                <div className="tab-content-wrapper">
                  <MonthlyDesktopUI
                    allLocationNames={allLocationNames}
                    monthlyLocation={monthlyLocation}
                    onMonthlyLocationChange={setMonthlyLocation}
                    pendingRange={pendingRange}
                    onPendingRangeChange={handlePendingRangeChange}
                    onApplyDateRange={applyPendingDateRange}
                    onSetLastMonth={handleLastMonth}
                    monthlySummary={monthlySummary}
                    monthlyDetails={monthlyDetails}
                    monthlyCurrentItems={monthlyCurrentItems}
                    monthlyLoading={monthlyLoading}
                    monthlyTotalPages={monthlyTotalPages}
                    monthlyPage={monthlyPage}
                    onPaginateMonthly={paginateMonthly}
                    monthlyPaginationRef={monthlyPaginationRef}
                    monthlyFirstItemIndex={
                      (monthlyPage - 1) * monthlyItemsPerPage
                    }
                    monthlyLastItemIndex={monthlyPage * monthlyItemsPerPage}
                  />
                  <MonthlyMobileUI
                    allLocationNames={allLocationNames}
                    monthlyLocation={monthlyLocation}
                    onMonthlyLocationChange={setMonthlyLocation}
                    pendingRange={pendingRange}
                    onPendingRangeChange={handlePendingRangeChange}
                    onApplyDateRange={applyPendingDateRange}
                    onSetLastMonth={handleLastMonth}
                    monthlySummary={monthlySummary}
                    monthlyDetails={monthlyDetails}
                    monthlyLoading={monthlyLoading}
                  />
                </div>
              )}
              {activeTab === 'manager' && (
                <div className="tab-content-wrapper">
                  <ManagerDesktopUI
                    locations={locations}
                    collectors={collectors}
                    selectedSchedulerLocation={selectedSchedulerLocation}
                    onSchedulerLocationChange={setSelectedSchedulerLocation}
                    selectedCollector={selectedCollector}
                    onCollectorChange={setSelectedCollector}
                    selectedStatus={selectedStatus}
                    onStatusChange={setSelectedStatus}
                    onResetSchedulerFilters={handleResetSchedulerFilters}
                    schedulers={schedulers}
                    loadingSchedulers={loadingSchedulers}
                  />
                  <ManagerMobileUI
                    locations={locations}
                    collectors={collectors}
                    selectedSchedulerLocation={selectedSchedulerLocation}
                    onSchedulerLocationChange={setSelectedSchedulerLocation}
                    selectedCollector={selectedCollector}
                    onCollectorChange={setSelectedCollector}
                    selectedStatus={selectedStatus}
                    onStatusChange={setSelectedStatus}
                    onResetSchedulerFilters={handleResetSchedulerFilters}
                    schedulers={schedulers}
                    loadingSchedulers={loadingSchedulers}
                  />
                </div>
              )}
              {activeTab === 'collector' && (
                <div className="tab-content-wrapper">
                  <CollectorDesktopUI
                    locations={locations}
                    collectors={collectorsList}
                    selectedLocation={selectedCollectorLocation}
                    onLocationChange={setSelectedCollectorLocation}
                    selectedCollector={selectedCollectorFilter}
                    onCollectorChange={setSelectedCollectorFilter}
                    selectedStatus={selectedCollectorStatus}
                    onStatusChange={setSelectedCollectorStatus}
                    onResetFilters={handleResetCollectorFilters}
                    collectorSchedules={collectorSchedules}
                    loadingCollectorSchedules={loadingCollectorSchedules}
                  />
                  <CollectorMobileUI
                    locations={locations}
                    collectors={collectorsList}
                    selectedLocation={selectedCollectorLocation}
                    onLocationChange={setSelectedCollectorLocation}
                    selectedCollector={selectedCollectorFilter}
                    onCollectorChange={setSelectedCollectorFilter}
                    selectedStatus={selectedCollectorStatus}
                    onStatusChange={setSelectedCollectorStatus}
                    onResetFilters={handleResetCollectorFilters}
                    collectorSchedules={collectorSchedules}
                    loadingCollectorSchedules={loadingCollectorSchedules}
                  />
                </div>
              )}
            </MotionDiv>
          </AnimatePresence>
        </div>
      </PageLayout>

      <MobileCollectionModal
        show={showMobileCollectionModal}
        onClose={() => setShowMobileCollectionModal(false)}
        locations={locationsWithMachines}
        onRefresh={refreshCollectionReports}
        onRefreshLocations={refreshLocations}
      />

      <NewCollectionModal
        show={showDesktopCollectionModal}
        onClose={() => setShowDesktopCollectionModal(false)}
        locations={locationsWithMachines}
        onRefresh={refreshCollectionReports}
        onRefreshLocations={refreshLocations}
      />

      {editingReportId && (
        <MobileEditCollectionModal
          show={showMobileEditCollectionModal}
          onClose={handleCloseEditModal}
          locations={locationsWithMachines}
          onRefresh={refreshCollectionReports}
          reportId={editingReportId}
        />
      )}

      {editingReportId && (
        <ErrorBoundary>
          <EditCollectionModal
            show={showDesktopEditCollectionModal}
            onClose={handleCloseEditModal}
            reportId={editingReportId}
            locations={locationsWithMachines}
            onRefresh={refreshCollectionReports}
          />
        </ErrorBoundary>
      )}

      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setReportToDelete(null);
        }}
        onConfirm={confirmDeleteCollectionReport}
        title="Confirm Delete"
        message="Are you sure you want to delete this collection report? This will also delete all associated collections, remove them from machine history, and revert collection meters to their previous values. This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={false}
      />
    </>
  );
}

export default function CollectionReportPage() {
  return (
    <ProtectedRoute requiredPage="collection-report">
      <CollectionReportPageContent />
    </ProtectedRoute>
  );
}
