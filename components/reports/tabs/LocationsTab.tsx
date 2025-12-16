'use client';

import {
  Activity,
  BarChart3,
  ChevronDown,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Home,
  Monitor,
  RefreshCw,
  Server,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import PaginationControls from '@/components/ui/PaginationControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LocationsRevenueAnalysisSkeleton,
  LocationsSASEvaluationSkeleton,
  MachineHourlyChartsSkeleton,
  RevenueAnalysisChartsSkeleton,
  SummaryCardsSkeleton,
  TopMachinesTableSkeleton,
} from '@/components/ui/skeletons/ReportsSkeletons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { formatCurrency } from "@/lib/utils/formatting";
import LocationMap from '@/components/reports/common/LocationMap';
import { fetchDashboardTotals } from '@/lib/helpers/dashboard';
import { fetchAggregatedLocationsData } from '@/lib/helpers/locations';
import { handleExportSASEvaluation as handleExportSASEvaluationHelper } from '@/lib/helpers/reportsPage';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useReportsStore } from '@/lib/store/reportsStore';
import { DashboardTotals } from '@/lib/types';
import { getDefaultChartGranularity } from '@/lib/utils/chartGranularity';
import type { ExtendedLegacyExportData } from '@/lib/utils/exportUtils';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financialColors';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
// Error handling imports removed - using wrapper component instead

// Recharts imports for CasinoLocationCard charts - Commented out since Top 5 Locations section is hidden
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";

// SAS Evaluation Components
import EnhancedLocationTable from '@/components/reports/common/EnhancedLocationTable';
import RevenueAnalysisTable from '@/components/reports/common/RevenueAnalysisTable';
import LocationMultiSelect from '@/components/ui/common/LocationMultiSelect';

import { LocationTrendChart } from '@/components/ui/LocationTrendChart';

// Reports helpers and components
import { AggregatedLocation } from '@/lib/types/location';
import axios from 'axios';

// Types for location data
import { LocationExportData, TopLocationData } from '@/lib/types';
import { TimePeriod } from '@/lib/types/api';
import { LocationMetrics, TopLocation } from '@/shared/types';
import { MachineData } from '@/shared/types/machines';

// Skeleton loader components - now imported from ReportsSkeletons

// TopLocationsSkeleton - Commented out since Top 5 Locations section is hidden
// const TopLocationsSkeleton = () => (
//   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//     {[1, 2, 3, 4, 5].map((i) => (
//       <div
//         key={i}
//         className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-pulse"
//       >
//         {/* Header */}
//         <div className="flex items-center justify-between mb-2">
//           <div className="flex items-center gap-2">
//             <div className="h-6 bg-gray-200 rounded w-32"></div>
//             <div className="h-5 bg-gray-200 rounded w-16"></div>
//           </div>
//           <div className="h-5 w-5 bg-gray-200 rounded"></div>
//         </div>
//         <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>

//         {/* Metrics Grid */}
//         <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
//           {[1, 2, 3, 4].map((j) => (
//             <div key={j}>
//               <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
//               <div className="h-5 bg-gray-200 rounded w-16"></div>
//             </div>
//           ))}
//         </div>

//         {/* Chart */}
//         <div className="h-24 bg-gray-200 rounded mb-4"></div>

//         {/* Daily Trend */}
//         <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>

//         {/* Top Performer */}
//         <div className="border-t pt-3">
//           <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
//           <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
//           <div className="h-3 bg-gray-200 rounded w-20"></div>
//         </div>
//       </div>
//     ))}
//   </div>
// );

// Casino Location Card Component - Commented out since Top 5 Locations section is hidden

export default function LocationsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formatAmount, shouldShowCurrency, displayCurrency } =
    useCurrencyFormat();
  const { activeMetricsFilter, customDateRange, selectedLicencee } =
    useDashBoardStore();

  const { selectedDateRange, setLoading } = useReportsStore();

  // Separate state management for each tab
  const [selectedSasLocations, setSelectedSasLocations] = useState<string[]>(
    []
  );
  const [selectedRevenueLocations, setSelectedRevenueLocations] = useState<
    string[]
  >([]);

  const [metricsOverview, setMetricsOverview] =
    useState<LocationMetrics | null>(null);
  const [topLocations, setTopLocations] = useState<TopLocation[]>([]);

  // Separate state for metrics totals (from dedicated API call)
  const [metricsTotals, setMetricsTotals] = useState<DashboardTotals | null>(
    null
  );
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(false);

  // Add state for top machines data
  const [topMachinesData, setTopMachinesData] = useState<MachineData[]>([]);
  const [topMachinesLoading, setTopMachinesLoading] = useState(false);

  // Add state for location trend data (hourly or daily based on time period)
  const [locationTrendData, setLocationTrendData] = useState<{
    trends: Array<{
      day: string;
      time?: string;
      [locationId: string]:
        | {
            handle: number;
            winLoss: number;
            jackpot: number;
            plays: number;
            drop: number;
            gross: number;
          }
        | string
        | undefined;
    }>;
    totals: Record<
      string,
      {
        handle: number;
        winLoss: number;
        jackpot: number;
        plays: number;
        drop: number;
        gross: number;
      }
    >;
    locations: string[];
    locationNames?: Record<string, string>;
    isHourly?: boolean;
  } | null>(null);
  const [locationTrendLoading, setLocationTrendLoading] = useState(false);

  // Add chart granularity state
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    () =>
      getDefaultChartGranularity(
        activeMetricsFilter || 'Today',
        customDateRange?.startDate,
        customDateRange?.endDate
      )
  );

  // Show granularity selector for Today/Yesterday/Custom (only if Custom spans ≤ 1 gaming day)
  const showGranularitySelector = useMemo(() => {
    if (
      activeMetricsFilter === 'Today' ||
      activeMetricsFilter === 'Yesterday'
    ) {
      return true;
    }
    if (
      activeMetricsFilter === 'Custom' &&
      customDateRange?.startDate &&
      customDateRange?.endDate
    ) {
      // Check if spans more than 1 gaming day
      try {
        const range = getGamingDayRangeForPeriod(
          'Custom',
          8, // Default gaming day start hour
          customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate),
          customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate)
        );
        const hoursDiff =
          (range.rangeEnd.getTime() - range.rangeStart.getTime()) /
          (1000 * 60 * 60);
        return hoursDiff <= 24; // Show toggle only if ≤ 24 hours
      } catch (error) {
        console.error('Error calculating gaming day range:', error);
        return false;
      }
    }
    return false;
  }, [activeMetricsFilter, customDateRange]);

  // Recalculate default granularity when date filters change
  useEffect(() => {
    const updateGranularity = () => {
      const defaultGranularity = getDefaultChartGranularity(
        activeMetricsFilter || 'Today',
        customDateRange?.startDate,
        customDateRange?.endDate
      );
      setChartGranularity(defaultGranularity);
    };

    // Update immediately
    updateGranularity();

    // For "Today" filter, set up interval to recalculate every minute
    if (activeMetricsFilter === 'Today') {
      const interval = setInterval(updateGranularity, 60000); // Every minute
      return () => clearInterval(interval);
    }

    return undefined;
  }, [
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
  ]);

  // Two-phase loading: gaming locations (fast) + financial data (slow)
  const [gamingLocations, setGamingLocations] = useState<
    Record<string, unknown>[]
  >([]);
  const [gamingLocationsLoading, setGamingLocationsLoading] = useState(true);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize from URL parameter immediately
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ltab') || 'overview';
    }
    return 'overview';
  });

  // Independent loading states for each tab (currently unused but available for future use)
  // const [sasLoading, setSasLoading] = useState(false);
  // const [revenueLoading, setRevenueLoading] = useState(false);

  // Track if user has manually selected a location (prevents auto-selection after manual selection)
  const hasManuallySelectedLocationRef = useRef(false);

  // Helper function to set current selected locations based on active tab
  const setCurrentSelectedLocations = useCallback(
    (locations: string[]) => {
      // Mark as manually selected if locations array is not empty and was set by user action
      if (locations.length > 0) {
        hasManuallySelectedLocationRef.current = true;
      }
      if (
        activeTab === 'sas-evaluation' ||
        activeTab === 'location-evaluation'
      ) {
        setSelectedSasLocations(locations);
      } else {
        setSelectedRevenueLocations(locations);
      }
    },
    [activeTab]
  );

  // Pagination state (0-based for PaginationControls)
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10; // Items per page for overview table
  const itemsPerBatch = 50; // Items per batch (5 pages of 10 items each)
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  // Store accumulated locations for batch loading (like locations page)
  const [accumulatedLocations, setAccumulatedLocations] = useState<
    AggregatedLocation[]
  >([]);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  const [paginatedLocations, setPaginatedLocations] = useState<
    AggregatedLocation[]
  >([]);
  const [paginationLoading, setPaginationLoading] = useState(true); // Start with loading true

  // Combined loading state for better UX (kept for potential future use)
  // const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Store all locations for dropdown selection (not just paginated ones)
  const [allLocationsForDropdown, setAllLocationsForDropdown] = useState<
    AggregatedLocation[]
  >([]);

  // ============================================================================
  // Computed Values - Financial Totals for Selected Locations
  // ============================================================================
  // Calculate totals from all selected locations (not paginated) for location-evaluation and location-revenue tabs
  // Overview tab uses metricsTotals from fetchDashboardTotals (all locations)
  const selectedLocationsTotals = useMemo(() => {
    // Only calculate for location-evaluation and location-revenue tabs
    if (
      activeTab !== 'location-evaluation' &&
      activeTab !== 'sas-evaluation' &&
      activeTab !== 'location-revenue'
    ) {
      return null;
    }

    // Get selected locations based on active tab
    const currentSelectedLocations =
      activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
        ? selectedSasLocations
        : selectedRevenueLocations;

    // Filter accumulated locations by selected locations
    const filteredLocations = accumulatedLocations.filter(loc =>
      currentSelectedLocations.includes(loc.location || loc._id)
    );

    // Calculate totals from filtered locations
    return filteredLocations.reduce(
      (acc, loc) => ({
        moneyIn: acc.moneyIn + (loc.moneyIn || 0),
        moneyOut: acc.moneyOut + (loc.moneyOut || 0),
        gross: acc.gross + (loc.gross || 0),
      }),
      { moneyIn: 0, moneyOut: 0, gross: 0 }
    );
  }, [
    activeTab,
    accumulatedLocations,
    selectedSasLocations,
    selectedRevenueLocations,
  ]);

  // Determine which totals to use based on active tab
  const displayTotals = useMemo(() => {
    // Overview tab uses metricsTotals from fetchDashboardTotals
    if (activeTab === 'overview') {
      // Return metricsTotals if available, otherwise return null (will show loading skeleton)
      return metricsTotals;
    }
    // Other tabs use calculated totals from selected locations
    return selectedLocationsTotals;
  }, [activeTab, metricsTotals, selectedLocationsTotals]);

  // ============================================================================
  // Abort Controllers
  // ============================================================================
  const makeLocationDataRequest = useAbortableRequest();
  const makeTopMachinesRequest = useAbortableRequest();
  const makeTrendDataRequest = useAbortableRequest();
  const makeMetricsRequest = useAbortableRequest();
  const makeGamingLocationsRequest = useAbortableRequest();

  // Fast fetch for gaming locations (Phase 1)
  const fetchGamingLocationsAsync = useCallback(async () => {
    await makeGamingLocationsRequest(async signal => {
      setGamingLocationsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedLicencee && selectedLicencee !== 'all') {
          params.append('licencee', selectedLicencee);
        }

        const response = await axios.get(
          `/api/locations?${params.toString()}`,
          {
            signal,
          }
        );
        const { locations: locationsData } = response.data;
        console.warn(
          `🗺️ Gaming locations fetched: ${locationsData?.length || 0} locations`
        );
        setGamingLocations(locationsData || []);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Error loading gaming locations:', error);
          setGamingLocations([]);
        }
      } finally {
        setGamingLocationsLoading(false);
      }
    });
  }, [selectedLicencee, makeGamingLocationsRequest]);

  // Calculate which batch we need based on current page (0-based, like admin page)
  // pagesPerBatch is a constant (5) so adding it to deps is safe but unnecessary
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  // Fetch a specific batch of locations (like locations page)
  const fetchBatch = useCallback(
    async (page: number = 1, limit: number = 50, signal?: AbortSignal) => {
      const effectiveLicencee =
        selectedLicencee && selectedLicencee !== 'all' ? selectedLicencee : '';

      // Build date range for custom dates
      let dateRange: { from: Date; to: Date } | undefined;
      if (
        activeMetricsFilter === 'Custom' &&
        customDateRange?.startDate &&
        customDateRange?.endDate
      ) {
        dateRange = {
          from:
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate as string),
          to:
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate as string),
        };
      }

      // Convert activeMetricsFilter to TimePeriod
      let timePeriod: string = 'Today';
      if (activeMetricsFilter === 'Today') {
        timePeriod = 'Today';
      } else if (activeMetricsFilter === 'Yesterday') {
        timePeriod = 'Yesterday';
      } else if (
        activeMetricsFilter === 'last7days' ||
        activeMetricsFilter === '7d'
      ) {
        timePeriod = '7d';
      } else if (
        activeMetricsFilter === 'last30days' ||
        activeMetricsFilter === '30d'
      ) {
        timePeriod = '30d';
      } else if (activeMetricsFilter === 'Quarterly') {
        timePeriod = 'Quarterly';
      } else if (activeMetricsFilter === 'All Time') {
        timePeriod = 'All Time';
      } else if (activeMetricsFilter === 'Custom') {
        timePeriod = 'Custom';
      }

      // Determine locations to fetch based on active tab
      let locationsToFetch: string[] = [];
      if (
        activeTab === 'sas-evaluation' ||
        activeTab === 'location-evaluation'
      ) {
        locationsToFetch = selectedSasLocations;
      } else if (activeTab === 'location-revenue') {
        locationsToFetch = selectedRevenueLocations;
      }

      return await fetchAggregatedLocationsData(
        timePeriod as TimePeriod,
        effectiveLicencee,
        '', // No filter string for reports page
        dateRange,
        displayCurrency,
        page,
        limit,
        signal,
        locationsToFetch
      );
    },
    [
      activeMetricsFilter,
      customDateRange,
      displayCurrency,
      selectedLicencee,
      activeTab,
      selectedSasLocations,
      selectedRevenueLocations,
    ]
  );

  // Simplified data fetching for locations with batch loading
  const fetchLocationDataAsync = useCallback(
    async (_specificLocations?: string[]) => {
      const result = await makeLocationDataRequest(async signal => {
        // Removed excessive debug logging
        setGamingLocationsLoading(true);
        setLocationsLoading(true);
        setMetricsLoading(true);
        setPaginationLoading(true);
        setLoading(true); // Set reports store loading state
        // setIsInitialLoadComplete(false);

        // Fetch gaming locations first (for map) - show immediately when ready
        await fetchGamingLocationsAsync();
        setGamingLocationsLoading(false);

        // Reset accumulated locations and batches when filters change
        setAccumulatedLocations([]);
        setLoadedBatches(new Set());
        setCurrentPage(0);

        // Determine effective selected locations
        const currentSelectedLocations =
          activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
            ? selectedSasLocations
            : activeTab === 'location-revenue'
              ? selectedRevenueLocations
              : [];

        const effectiveLocations =
          _specificLocations || currentSelectedLocations;

        // Optimization: For SAS Evaluation and Revenue Analysis, do NOT fetch table data
        // until locations are explicitly selected. This prevents slow initial load.
        // For 'overview' or other tabs, we might still want default data.
        const shouldSkipTableFetch =
          (activeTab === 'sas-evaluation' ||
            activeTab === 'location-evaluation' ||
            activeTab === 'location-revenue') &&
          effectiveLocations.length === 0;

        // Fetch first batch (50 items) for table ONLY if we shouldn't skip
        let firstBatchResult;

        if (shouldSkipTableFetch) {
          console.log('⚡ Skipping initial table fetch for optimization');
          firstBatchResult = {
            data: [],
            pagination: { totalCount: 0, totalPages: 0, total: 0 },
          };
        } else {
          firstBatchResult = await fetchBatch(1, itemsPerBatch, signal);
        }

        return firstBatchResult;
      });

      if (!result) {
        // Request aborted - keep existing state
        return;
      }

      try {
        const firstBatchResult = result;

        if (firstBatchResult.pagination) {
          const pagination = firstBatchResult.pagination;
          const total = pagination.totalCount ?? pagination.total ?? 0;
          setTotalCount(total);
          setTotalPages(
            pagination.totalPages ?? Math.ceil(total / itemsPerPage)
          );
        } else {
          setTotalCount(firstBatchResult.data.length);
          setTotalPages(Math.ceil(firstBatchResult.data.length / itemsPerPage));
        }

        setAccumulatedLocations(firstBatchResult.data);
        setLoadedBatches(new Set([1]));
        setPaginationLoading(false);
        setLocationsLoading(false);

        // Build API parameters for dropdown (use same API as locations page for consistency and performance)
        // Use /api/reports/locations instead of /api/locationAggregation for better performance
        const params: Record<string, string> = {
          limit: '1000', // Get all locations for dropdown
          page: '1',
          showAllLocations: 'true',
          summary: 'true', // Use fast summary mode (avoids expensive financial aggregation)
        };

        if (selectedLicencee && selectedLicencee !== 'all') {
          params.licencee = selectedLicencee;
        }

        // Add currency parameter for conversion
        if (displayCurrency) {
          params.currency = displayCurrency;
        }

        // Note: We don't add selectedLocations filter here to ensure dropdown always shows all locations
        // The selectedLocations filter will be applied separately for data display

        // Add SAS evaluation filter for SAS Evaluation tab
        if (activeTab === 'location-evaluation') {
          params.sasEvaluationOnly = 'true';
        }
        // For revenue analysis tab, we want all locations (SAS and non-SAS)
        // No additional filter needed as it will fetch all locations by default

        // Use appropriate date parameter based on active filter
        if (activeMetricsFilter === 'Today') {
          params.timePeriod = 'Today';
        } else if (activeMetricsFilter === 'Yesterday') {
          params.timePeriod = 'Yesterday';
        } else if (
          activeMetricsFilter === 'last7days' ||
          activeMetricsFilter === '7d'
        ) {
          params.timePeriod = '7d';
        } else if (
          activeMetricsFilter === 'last30days' ||
          activeMetricsFilter === '30d'
        ) {
          params.timePeriod = '30d';
        } else if (activeMetricsFilter === 'Quarterly') {
          params.timePeriod = 'Quarterly';
        } else if (activeMetricsFilter === 'All Time') {
          params.timePeriod = 'All Time';
        } else if (
          activeMetricsFilter === 'Custom' &&
          customDateRange?.startDate &&
          customDateRange?.endDate
        ) {
          const sd =
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate as string);
          const ed =
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate as string);

          // Send dates in local format (YYYY-MM-DD) to avoid double timezone conversion
          // The API will treat these as Trinidad time and convert to UTC
          params.startDate = sd.toISOString().split('T')[0];
          params.endDate = ed.toISOString().split('T')[0];
        } else {
          // Fallback to Today if no valid filter
          params.timePeriod = 'Today';
        }

        // API call to get location data with financial metrics
        // Use /api/reports/locations instead of /api/locationAggregation for better performance and consistency
        const response = await axios.get('/api/reports/locations', {
          params,
          timeout: 60000, // 60 second timeout to prevent hanging
        });

        // Check for error response
        if (response.data.error) {
          console.error('❌ LocationData API Error:', response.data.error);
          toast.error('Failed to fetch location data. Please try again.', {
            duration: 3000,
          });
          throw new Error(response.data.error);
        }

        // Handle response structure from /api/reports/locations
        // Response structure: { data: [...], pagination: {...} }
        const locationData = response.data.data || [];

        // Normalize location data
        const normalizedLocations = locationData.map(
          (loc: Record<string, unknown>) => ({
            ...loc,
            gross: loc.gross || 0,
            locationName:
              loc.locationName || loc.name || loc.location || 'Unknown',
          })
        );

        // Store locations for dropdown selection (always all locations) - show immediately
        setAllLocationsForDropdown(normalizedLocations);
        setLocationsLoading(false); // Show dropdown immediately

        // Filter data based on selected locations if any are selected
        const currentSelectedLocations =
          activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
            ? selectedSasLocations
            : selectedRevenueLocations;

        // Removed excessive debug logging

        const filteredData =
          currentSelectedLocations.length > 0
            ? normalizedLocations.filter((loc: Record<string, unknown>) => {
                const locId = String(loc.location || '');
                const isIncluded = currentSelectedLocations.some(
                  selectedId => String(selectedId) === locId
                );
                // Removed excessive debug logging
                return isIncluded;
              })
            : normalizedLocations; // Show all locations when none are selected

        // Removed excessive debug logging

        // Note: Table data is now handled by batch loading above
        // This section only handles dropdown data and metrics calculation

        // Calculate metrics overview
        // Use dashboard totals API when no specific locations are selected (more efficient and consistent)
        // Otherwise calculate from filtered location data
        let overview: LocationMetrics;

        if (currentSelectedLocations.length === 0) {
          // No locations selected - use dashboard totals for overview
          const dashboardTotals: DashboardTotals = metricsTotals || {
            moneyIn: 0,
            moneyOut: 0,
            gross: 0,
          };

          // Get machine counts from location data
          const machineCounts = normalizedLocations.reduce(
            (
              acc: { onlineMachines: number; totalMachines: number },
              loc: Record<string, unknown>
            ) => {
              acc.onlineMachines += (loc.onlineMachines as number) || 0;
              acc.totalMachines += (loc.totalMachines as number) || 0;
              return acc;
            },
            { onlineMachines: 0, totalMachines: 0 }
          );

          overview = {
            totalGross: dashboardTotals.gross || 0,
            totalDrop: dashboardTotals.moneyIn || 0,
            totalCancelledCredits: dashboardTotals.moneyOut || 0,
            onlineMachines: machineCounts.onlineMachines,
            totalMachines: machineCounts.totalMachines,
          };
        } else {
          // Specific locations selected - calculate from filtered location data
          const dataForMetrics = filteredData;
          overview = dataForMetrics.reduce(
            (acc: LocationMetrics, loc: Record<string, unknown>) => {
              acc.totalGross += (loc.gross as number) || 0;
              acc.totalDrop += (loc.moneyIn as number) || 0;
              acc.totalCancelledCredits += (loc.moneyOut as number) || 0;
              acc.onlineMachines += (loc.onlineMachines as number) || 0;
              acc.totalMachines += (loc.totalMachines as number) || 0;
              return acc;
            },
            {
              totalGross: 0,
              totalDrop: 0,
              totalCancelledCredits: 0,
              onlineMachines: 0,
              totalMachines: 0,
            }
          );
        }

        setMetricsOverview(overview);
        setMetricsLoading(false);

        // Get top 5 locations for overview (use filtered data if locations are selected)
        const dataForTopLocations =
          currentSelectedLocations.length > 0
            ? filteredData
            : normalizedLocations;
        const sorted = dataForTopLocations
          .sort(
            (a: Record<string, unknown>, b: Record<string, unknown>) =>
              ((b.gross as number) || 0) - ((a.gross as number) || 0)
          )
          .slice(0, 5)
          .map((loc: Record<string, unknown>) => ({
            locationId: loc.location,
            locationName:
              loc.locationName || loc.name || loc.location || 'Unknown',
            gross: loc.gross || 0,
            drop: loc.moneyIn || 0,
            cancelledCredits: loc.moneyOut || 0,
            onlineMachines: loc.onlineMachines || 0,
            totalMachines: loc.totalMachines || 0,
            performance: 'average' as const,
            sasEnabled: loc.hasSasMachines || (loc.sasMachines as number) > 0,
            coordinates: undefined,
            holdPercentage:
              (loc.moneyIn as number) > 0
                ? ((loc.gross as number) / (loc.moneyIn as number)) * 100
                : 0,
          }));

        setTopLocations(sorted);
        setLocationsLoading(false);

        console.warn(
          '🔍 Location data successful - setting loading states to false'
        );

        // Set loading states
        setGamingLocationsLoading(false);
        setPaginationLoading(false);
        setLoading(false); // Clear reports store loading state
        // setIsInitialLoadComplete(true);

        return true; // Success
      } catch (error) {
        if (axios.isCancel(error)) {
          // Request cancelled - don't show error
          return null;
        }

        console.error('❌ Error fetching location data:', error);

        // Show user-friendly error message
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 500) {
            toast.error(
              'Server error: Database query timeout. Please try again.',
              { duration: 3000 }
            );
          } else if (error.response?.status === 404) {
            toast.error('Location data not found. Please check your filters.', {
              duration: 3000,
            });
          } else {
            toast.error('Failed to load location data. Please try again.', {
              duration: 3000,
            });
          }
        } else {
          toast.error('Failed to load location data. Please try again.', {
            duration: 3000,
          });
        }

        // Reset loading states and data
        setGamingLocationsLoading(false);
        setLocationsLoading(false);
        setMetricsLoading(false);
        setPaginationLoading(false);
        setLoading(false); // Clear reports store loading state
        // setIsInitialLoadComplete(false);
        setAllLocationsForDropdown([]);
        setPaginatedLocations([]);
        setMetricsOverview(null);
        setTopLocations([]);

        return null; // Error
      }
    },
    [
      selectedLicencee,
      activeTab,
      activeMetricsFilter,
      customDateRange,
      fetchGamingLocationsAsync,
      selectedSasLocations,
      selectedRevenueLocations,
      displayCurrency,
      setLoading,
      fetchBatch,
      metricsTotals,
      itemsPerBatch,
      makeLocationDataRequest,
    ]
  );

  // Function to fetch top machines data
  const fetchTopMachines = useCallback(async () => {
    const currentSelectedLocations =
      activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
        ? selectedSasLocations
        : selectedRevenueLocations;
    if (currentSelectedLocations.length === 0) {
      setTopMachinesData([]);
      return;
    }

    await makeTopMachinesRequest(async signal => {
      setTopMachinesLoading(true);
      setLoading(true); // Set reports store loading state
      try {
        const params: Record<string, string | string[]> = {
          type: 'all', // Get all machines for the selected locations
        };

        // Pass location IDs to API for server-side filtering
        // This is more efficient than fetching all machines and filtering client-side
        if (currentSelectedLocations.length > 0) {
          // If only one location, use locationId parameter
          // If multiple locations, we'll filter client-side (API might not support multiple)
          if (currentSelectedLocations.length === 1) {
            params.locationId = currentSelectedLocations[0];
          }
          // For multiple locations, we'll still filter client-side after fetching
        }

        if (selectedLicencee && selectedLicencee !== 'all') {
          params.licencee = selectedLicencee;
        }

        // Add date parameters
        if (activeMetricsFilter === 'Today') {
          params.timePeriod = 'Today';
        } else if (activeMetricsFilter === 'Yesterday') {
          params.timePeriod = 'Yesterday';
        } else if (
          activeMetricsFilter === 'last7days' ||
          activeMetricsFilter === '7d'
        ) {
          params.timePeriod = '7d';
        } else if (
          activeMetricsFilter === 'last30days' ||
          activeMetricsFilter === '30d'
        ) {
          params.timePeriod = '30d';
        } else if (activeMetricsFilter === 'Quarterly') {
          params.timePeriod = 'Quarterly';
        } else if (activeMetricsFilter === 'All Time') {
          params.timePeriod = 'All Time';
        } else if (
          activeMetricsFilter === 'Custom' &&
          customDateRange?.startDate &&
          customDateRange?.endDate
        ) {
          params.timePeriod = 'Custom';
          const sd =
            customDateRange.startDate instanceof Date
              ? customDateRange.startDate
              : new Date(customDateRange.startDate as string);
          const ed =
            customDateRange.endDate instanceof Date
              ? customDateRange.endDate
              : new Date(customDateRange.endDate as string);

          // Send dates in local format (YYYY-MM-DD) to avoid double timezone conversion
          params.startDate = sd.toISOString().split('T')[0];
          params.endDate = ed.toISOString().split('T')[0];
        } else {
          params.timePeriod = 'Today';
        }

        const response = await axios.get('/api/reports/machines', {
          params,
          signal,
        });
        const { data: machinesData } = response.data;

        // Removed excessive debug logging

        // Filter machines by selected locations and sort by netWin
        // Convert both to strings for comparison to handle ObjectId vs string mismatches
        const filteredMachines = (machinesData || [])
          .filter((machine: MachineData) => {
            const machineLocationId = String(machine.locationId || '');
            const matches = currentSelectedLocations.some(
              selectedId => String(selectedId) === machineLocationId
            );
            return matches;
          })
          .sort(
            (a: MachineData, b: MachineData) =>
              (b.netWin || 0) - (a.netWin || 0)
          )
          .slice(0, 5);

        setTopMachinesData(filteredMachines);
      } catch (error) {
        if (!axios.isCancel(error)) {
          const errorMessage = axios.isAxiosError(error)
            ? error.response?.data?.error || error.message
            : error instanceof Error
              ? error.message
              : 'Failed to fetch top machines data';
          console.error('Error fetching top machines:', errorMessage, error);
          toast.error(`Failed to fetch top machines: ${errorMessage}`, {
            duration: 3000,
          });
          setTopMachinesData([]);
        }
      } finally {
        setTopMachinesLoading(false);
        setLoading(false); // Clear reports store loading state
      }
    });
  }, [
    selectedSasLocations,
    selectedRevenueLocations,
    activeTab,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
    setLoading,
    makeTopMachinesRequest,
  ]);

  // Function to fetch location trend data (daily or hourly based on time period)
  const fetchLocationTrendData = useCallback(
    async (overrideLocationIds?: string[]) => {
      const currentSelectedLocations =
        activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
          ? selectedSasLocations
          : selectedRevenueLocations;

      // Use override location IDs if provided, otherwise use selected locations
      const locationsToFetch = overrideLocationIds || currentSelectedLocations;

      if (locationsToFetch.length === 0) {
        setLocationTrendData(null);
        return;
      }

      await makeTrendDataRequest(async signal => {
        setLocationTrendLoading(true);
        setLoading(true); // Set reports store loading state
        try {
          const params: Record<string, string> = {
            locationIds: locationsToFetch.join(','),
          };

          if (selectedLicencee && selectedLicencee !== 'all') {
            params.licencee = selectedLicencee;
          }

          // Add currency parameter
          if (displayCurrency) {
            params.currency = displayCurrency;
          }

          // Add date parameters
          if (activeMetricsFilter === 'Today') {
            params.timePeriod = 'Today';
          } else if (activeMetricsFilter === 'Yesterday') {
            params.timePeriod = 'Yesterday';
          } else if (
            activeMetricsFilter === 'last7days' ||
            activeMetricsFilter === '7d'
          ) {
            params.timePeriod = '7d';
          } else if (
            activeMetricsFilter === 'last30days' ||
            activeMetricsFilter === '30d'
          ) {
            params.timePeriod = '30d';
          } else if (activeMetricsFilter === 'All Time') {
            params.timePeriod = 'All Time';
          } else if (
            activeMetricsFilter === 'Custom' &&
            customDateRange?.startDate &&
            customDateRange?.endDate
          ) {
            const sd =
              customDateRange.startDate instanceof Date
                ? customDateRange.startDate
                : new Date(customDateRange.startDate as string);
            const ed =
              customDateRange.endDate instanceof Date
                ? customDateRange.endDate
                : new Date(customDateRange.endDate as string);

            // Send dates in local format (YYYY-MM-DD) to avoid double timezone conversion
            params.startDate = sd.toISOString().split('T')[0];
            params.endDate = ed.toISOString().split('T')[0];
          } else {
            params.timePeriod = 'Today';
          }

          // Add granularity parameter
          if (chartGranularity) {
            params.granularity = chartGranularity;
          }

          const response = await axios.get('/api/analytics/location-trends', {
            params,
            signal,
            timeout: 120000, // 2 minute timeout to prevent hanging
          });
          setLocationTrendData(response.data);
        } catch (error) {
          if (!axios.isCancel(error)) {
            console.error('Error fetching location trend data:', error);
            // Don't show toast for 500 errors - they're logged in console
            // Only show toast for network errors or other issues
            if (axios.isAxiosError(error) && error.response?.status !== 500) {
              toast.error('Failed to fetch location trend data', {
                duration: 3000,
              });
            }
            setLocationTrendData(null);
          }
        } finally {
          setLocationTrendLoading(false);
          setLoading(false); // Clear reports store loading state
        }
      });
    },
    [
      selectedSasLocations,
      selectedRevenueLocations,
      activeTab,
      selectedLicencee,
      activeMetricsFilter,
      customDateRange,
      displayCurrency,
      setLoading,
      makeTrendDataRequest,

      chartGranularity, // Included to trigger refetch when granularity changes (used in params.granularity)
    ]
  );

  // Separate useEffect to fetch metrics totals independently (like dashboard does)
  // This ensures metrics cards always show totals from all locations, separate from table pagination
  // Fetch metrics totals only for overview tab (uses fetchDashboardTotals for all locations)
  // Other tabs calculate totals from selected locations in accumulatedLocations
  useEffect(() => {
    const fetchMetrics = async () => {
      // Only fetch dashboard totals for overview tab
      if (activeTab !== 'overview') {
        // Don't reset loading state or metricsTotals when switching away from overview
        // This preserves the data when switching back
        return;
      }

      if (!activeMetricsFilter) {
        console.log(
          '🔍 [LocationsTab] Skipping metrics fetch - no activeMetricsFilter'
        );
        setMetricsTotalsLoading(false);
        return;
      }

      // Removed excessive debug logging

      await makeMetricsRequest(async signal => {
        setMetricsTotalsLoading(true);
        try {
          // Create effective date range matching dashboard pattern
          // For Custom period, use customDateRange; otherwise use default (today's range)
          let effectiveDateRange: { startDate: Date; endDate: Date };
          if (
            activeMetricsFilter === 'Custom' &&
            customDateRange?.startDate &&
            customDateRange?.endDate
          ) {
            // Ensure Date objects for Custom period
            effectiveDateRange = {
              startDate:
                customDateRange.startDate instanceof Date
                  ? customDateRange.startDate
                  : new Date(customDateRange.startDate),
              endDate:
                customDateRange.endDate instanceof Date
                  ? customDateRange.endDate
                  : new Date(customDateRange.endDate),
            };
          } else {
            // For non-Custom periods, use today's date range (same as dashboard)
            const today = new Date();
            const start = new Date(today);
            start.setHours(0, 0, 0, 0);
            const end = new Date(today);
            end.setHours(23, 59, 59, 999);
            effectiveDateRange = { startDate: start, endDate: end };
          }

          await fetchDashboardTotals(
            activeMetricsFilter || 'Today',
            effectiveDateRange,
            selectedLicencee,
            totals => {
              console.log(
                '🔍 [LocationsTab] fetchDashboardTotals callback received:',
                {
                  totals,
                  moneyIn: totals?.moneyIn,
                  moneyOut: totals?.moneyOut,
                  gross: totals?.gross,
                }
              );
              setMetricsTotals(totals);
              console.log(
                '🔍 [LocationsTab] setMetricsTotals called with:',
                totals
              );
            },
            displayCurrency,
            signal
          );
        } catch (error) {
          if (!axios.isCancel(error)) {
            console.error(
              '❌ [LocationsTab] Failed to fetch metrics totals:',
              error
            );
            setMetricsTotals(null);
          }
        } finally {
          setMetricsTotalsLoading(false);
          // Removed excessive debug logging
        }
      });
    };

    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    activeMetricsFilter,
    selectedLicencee,
    customDateRange?.startDate?.getTime(),
    customDateRange?.endDate?.getTime(),
    displayCurrency,
    // makeMetricsRequest is stable from useAbortableRequest hook, but including it causes dependency array size issues
    // The hook ensures requests are properly aborted when dependencies change
  ]);

  // Consolidated useEffect to handle all data fetching
  // Use refs to prevent unnecessary re-fetches when function references change
  const hasFetchedForSelectedLocationsRef = useRef<string>('');
  const hasMountedRef = useRef(false);
  const initialMountCheckRef = useRef(false);

  useEffect(() => {
    const currentSelectedLocations =
      activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
        ? selectedSasLocations
        : selectedRevenueLocations;

    // Create a stable key for the current selection
    const selectionKey = [
      activeTab,
      currentSelectedLocations.sort().join(','),
      selectedLicencee,
      activeMetricsFilter,
      customDateRange?.startDate?.toString(),
      customDateRange?.endDate?.toString(),
      displayCurrency,
    ].join('|');

    // On initial mount, always allow the fetch to run
    const isInitialMount = !hasMountedRef.current;
    if (isInitialMount) {
      hasMountedRef.current = true;
    }

    // Only skip fetch if selection key hasn't changed AND we're not on initial mount
    if (
      !isInitialMount &&
      selectionKey === hasFetchedForSelectedLocationsRef.current
    ) {
      return;
    }

    hasFetchedForSelectedLocationsRef.current = selectionKey;

    // Fetch location data when filters change or when locations are selected
    fetchLocationDataAsync(
      currentSelectedLocations.length > 0 ? currentSelectedLocations : undefined
    );

    // Fetch additional data when locations are explicitly selected
    if (currentSelectedLocations.length > 0) {
      fetchTopMachines();
      fetchLocationTrendData();
    } else {
      // Only clear data if we're not on revenue tab with paginated locations
      // On revenue tab, we want to keep data for displayed locations
      if (activeTab !== 'location-revenue') {
        setTopMachinesData([]);
        setLocationTrendData(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedLicencee,
    activeTab,
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
    selectedSasLocations,
    selectedRevenueLocations,
    displayCurrency,
    chartGranularity, // Include to trigger refetch when granularity changes
    // Don't include function references in dependencies to prevent cascading re-renders
    // fetchLocationDataAsync,
    // fetchTopMachines,
    // fetchLocationTrendData,
    // setTopMachinesData,
    // setLocationTrendData,
  ]);

  // Separate useEffect to ensure initial fetch runs on mount for revenue tab
  // This handles the case where the main useEffect might not trigger properly on initial mount
  useEffect(() => {
    // Only run once on mount
    if (initialMountCheckRef.current) {
      return;
    }
    initialMountCheckRef.current = true;

    // On initial mount, if we're on revenue tab, reset the fetch ref
    // This ensures the main useEffect can run the fetch
    // The main useEffect will handle the actual fetch with proper dependencies
    if (activeTab === 'location-revenue') {
      hasFetchedForSelectedLocationsRef.current = '';
    }
  }, [activeTab]); // Include activeTab to handle URL-based initial tab

  // Separate useEffect to fetch trend data for displayed locations when none are selected
  // This ensures charts show data for locations in the table
  // Use refs to track what we've already fetched to prevent infinite loops and re-queries
  const lastFetchedLocationIdsRef = useRef<string>('');
  const isFetchingRef = useRef(false);

  useEffect(() => {
    // Only for revenue analysis tab
    if (activeTab !== 'location-revenue') {
      return;
    }

    const currentSelectedLocations = selectedRevenueLocations;

    // Only fetch if no locations are selected but we have paginated locations
    if (
      currentSelectedLocations.length === 0 &&
      paginatedLocations.length > 0 &&
      !isFetchingRef.current
    ) {
      const displayedLocationIds = paginatedLocations
        .map(loc => String(loc.location || loc._id || ''))
        .filter(id => id !== '')
        .sort()
        .join(',');

      // Only fetch if location IDs have changed
      if (
        displayedLocationIds &&
        displayedLocationIds !== lastFetchedLocationIdsRef.current
      ) {
        lastFetchedLocationIdsRef.current = displayedLocationIds;
        isFetchingRef.current = true;
        const locationIdsArray = displayedLocationIds
          .split(',')
          .filter(id => id);

        if (locationIdsArray.length > 0) {
          // Fetch trend data for displayed locations
          // Use void to explicitly ignore the promise (we handle it in the function)
          void fetchLocationTrendData(locationIdsArray);
          // Also fetch top machines for displayed locations (don't wait for it)
          void fetchTopMachines();
          // Reset fetching flag after a short delay to allow requests to start
          setTimeout(() => {
            isFetchingRef.current = false;
          }, 100);
        } else {
          isFetchingRef.current = false;
        }
      }
    } else if (currentSelectedLocations.length > 0) {
      // Reset ref when locations are selected (handled by main useEffect)
      lastFetchedLocationIdsRef.current = '';
      isFetchingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    paginatedLocations,
    selectedRevenueLocations,
    // Don't include fetchLocationTrendData and fetchTopMachines in dependencies
    // to prevent re-triggering when function references change
  ]);

  // Recovery check: Detect and fix stuck loading states
  // If loading states are true but no fetch is in progress and no data exists, trigger fetch
  const recoveryCheckRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Only check after component has mounted
    if (!hasMountedRef.current) {
      return;
    }

    // Clear any existing timeout
    if (recoveryCheckRef.current) {
      clearTimeout(recoveryCheckRef.current);
    }

    // Debounce the recovery check to avoid running too frequently
    recoveryCheckRef.current = setTimeout(() => {
      // Check if we're stuck in loading state
      const isStuck =
        (paginationLoading || metricsLoading) &&
        paginatedLocations.length === 0 &&
        !allLocationsForDropdown.length;

      // Only trigger recovery if we're on revenue tab and stuck
      if (isStuck && activeTab === 'location-revenue') {
        console.warn(
          '🔧 Recovery: Detected stuck loading state, triggering data fetch'
        );
        // Reset ref to allow fetch
        hasFetchedForSelectedLocationsRef.current = '';
        // Trigger fetch
        const currentSelectedLocations = selectedRevenueLocations;
        fetchLocationDataAsync(
          currentSelectedLocations.length > 0
            ? currentSelectedLocations
            : undefined
        );
      }
    }, 1000); // Wait 1 second before checking for stuck state

    return () => {
      if (recoveryCheckRef.current) {
        clearTimeout(recoveryCheckRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paginationLoading,
    metricsLoading,
    paginatedLocations.length,
    allLocationsForDropdown.length,
    activeTab,
    selectedRevenueLocations,
    // Don't include fetchLocationDataAsync to prevent loops
  ]);

  // Auto-select location if only one is available for SAS or Revenue tabs
  useEffect(() => {
    // Only auto-select for location-evaluation and location-revenue tabs
    if (
      activeTab !== 'location-evaluation' &&
      activeTab !== 'location-revenue'
    ) {
      return;
    }

    // Get available locations based on tab
    const availableLocations =
      activeTab === 'location-evaluation'
        ? allLocationsForDropdown.filter(loc => (loc.sasMachines as number) > 0)
        : allLocationsForDropdown;

    // Get current selected locations
    const currentSelectedLocations =
      activeTab === 'location-evaluation'
        ? selectedSasLocations
        : selectedRevenueLocations;

    // Auto-select ONLY if:
    // 1. Exactly one location is available
    // 2. No location is currently selected
    // 3. User has not manually selected a location before
    if (
      availableLocations.length === 1 &&
      currentSelectedLocations.length === 0 &&
      !hasManuallySelectedLocationRef.current
    ) {
      const singleLocationId = String(
        availableLocations[0].location || availableLocations[0]._id || ''
      );
      if (singleLocationId) {
        console.warn(
          `🔍 Auto-selecting single location: ${singleLocationId} for tab: ${activeTab}`
        );
        setCurrentSelectedLocations([singleLocationId]);
      }
    }
  }, [
    allLocationsForDropdown,
    activeTab,
    selectedSasLocations,
    selectedRevenueLocations,
    setCurrentSelectedLocations,
  ]);

  // Reset manual selection flag when tab changes
  useEffect(() => {
    hasManuallySelectedLocationRef.current = false;
  }, [activeTab]);

  // Initialize from URL
  useEffect(() => {
    const initial = searchParams?.get('ltab') || 'overview';
    if (initial !== activeTab) {
      setActiveTab(initial);
      // Reset fetch ref when tab changes to allow fresh fetch
      hasFetchedForSelectedLocationsRef.current = '';
    }
  }, [searchParams, activeTab, setActiveTab]);

  const handleLocationsTabChange = (tab: string) => {
    setActiveTab(tab);
    // Reset fetch ref when tab changes to allow fresh fetch
    hasFetchedForSelectedLocationsRef.current = '';
    try {
      const sp = new URLSearchParams(searchParams?.toString() || '');
      sp.set('ltab', tab);
      sp.set('section', 'locations');
      router.replace(`${pathname}?${sp.toString()}`);
    } catch {}
  };
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [activeMetricsFilter, selectedDateRange, selectedLicencee]);

  // Filter displayed data when selectedLocations changes
  useEffect(() => {
    if (allLocationsForDropdown.length > 0) {
      const currentSelectedLocations =
        activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
          ? selectedSasLocations
          : selectedRevenueLocations;

      // Overview tab always shows all locations (no filtering)
      // Other tabs filter by selected locations, or show all if none selected
      const filteredData =
        activeTab === 'overview'
          ? allLocationsForDropdown // Overview tab: always show all locations
          : currentSelectedLocations.length > 0
            ? allLocationsForDropdown.filter(loc => {
                // Check both _id and location fields as they can be used interchangeably
                const locationId = (loc._id || loc.location) as string;
                return currentSelectedLocations.includes(locationId);
              })
            : allLocationsForDropdown; // Other tabs: show all locations when none are selected

      console.warn(
        `🔍 Filtering locations - allLocationsForDropdown: ${allLocationsForDropdown.length}, filteredData: ${filteredData.length}, selectedLocations: ${currentSelectedLocations.length}`
      );

      // Note: Table data is now handled by batch loading
      // This section only handles dropdown filtering for other tabs
      // For overview tab, batch loading handles table data

      // Recalculate metrics overview
      const overview = filteredData.reduce(
        (acc: Record<string, unknown>, loc: Record<string, unknown>) => {
          (acc.totalGross as number) += (loc.gross as number) || 0;
          (acc.totalDrop as number) += (loc.moneyIn as number) || 0;
          (acc.totalCancelledCredits as number) +=
            (loc.moneyOut as number) || 0;
          (acc.onlineMachines as number) += (loc.onlineMachines as number) || 0;
          (acc.totalMachines as number) += (loc.totalMachines as number) || 0;
          return acc;
        },
        {
          totalGross: 0,
          totalDrop: 0,
          totalCancelledCredits: 0,
          onlineMachines: 0,
          totalMachines: 0,
        }
      ) as LocationMetrics;
      setMetricsOverview(overview);

      // Recalculate top locations
      const sorted = filteredData
        .sort(
          (a: Record<string, unknown>, b: Record<string, unknown>) =>
            ((b.gross as number) || 0) - ((a.gross as number) || 0)
        )
        .slice(0, 5)
        .map((loc: Record<string, unknown>) => ({
          locationId: loc.location as string,
          locationName: (loc.locationName ||
            loc.name ||
            loc.location ||
            'Unknown') as string,
          gross: (loc.gross || 0) as number,
          drop: (loc.moneyIn || 0) as number,
          cancelledCredits: (loc.moneyOut || 0) as number,
          onlineMachines: (loc.onlineMachines || 0) as number,
          totalMachines: (loc.totalMachines || 0) as number,
          performance: 'average' as const,
          sasEnabled: (loc.hasSasMachines ||
            (loc.sasMachines as number) > 0) as boolean,
          coordinates: undefined,
          holdPercentage:
            (loc.moneyIn as number) > 0
              ? ((loc.gross as number) / (loc.moneyIn as number)) * 100
              : 0,
        })) as TopLocation[];
      setTopLocations(sorted);
    }
  }, [
    selectedSasLocations,
    selectedRevenueLocations,
    activeTab,
    allLocationsForDropdown,
  ]);

  // Fetch new batch when crossing batch boundary (like locations page)
  useEffect(() => {
    if (paginationLoading || !activeMetricsFilter) return; // Skip while loading or no filter

    const currentBatch = calculateBatchNumber(currentPage);

    // Check if we're on the last page of the current batch (0-based: pages 0-4 are batch 1, pages 5-9 are batch 2, etc.)
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => {
        const newSet = new Set(prev);
        newSet.add(nextBatch);
        return newSet;
      });
      fetchBatch(nextBatch, itemsPerBatch).then(result => {
        if (result.data.length > 0) {
          setAccumulatedLocations(prev => {
            const existingIds = new Set(
              prev.map(loc => loc._id || loc.location)
            );
            const newLocations = result.data.filter(
              loc => !existingIds.has(loc._id || loc.location)
            );
            return [...prev, ...newLocations];
          });
        }
      });
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => {
        const newSet = new Set(prev);
        newSet.add(currentBatch);
        return newSet;
      });
      fetchBatch(currentBatch, itemsPerBatch).then(result => {
        if (result.data.length > 0) {
          setAccumulatedLocations(prev => {
            const existingIds = new Set(
              prev.map(loc => loc._id || loc.location)
            );
            const newLocations = result.data.filter(
              loc => !existingIds.has(loc._id || loc.location)
            );
            return [...prev, ...newLocations];
          });
        }
      });
    }
  }, [
    currentPage,
    paginationLoading,
    activeMetricsFilter,
    loadedBatches,
    itemsPerBatch,
    itemsPerPage,
    calculateBatchNumber,
    fetchBatch,
    pagesPerBatch,
  ]);

  // Debug effect to log state changes
  useEffect(() => {
    console.warn(
      `🔍 State Debug - paginationLoading: ${paginationLoading}, locations count: ${accumulatedLocations.length}, currentPage: ${currentPage}, totalPages: ${totalPages}, totalCount: ${totalCount}`
    );
    console.warn(
      `🔍 Table Props Debug - totalPages: ${totalPages}, totalCount: ${totalCount}`
    );
    console.warn(
      `🔍 Loading State Debug - paginationLoading: ${paginationLoading}, should show skeleton: ${paginationLoading}`
    );
  }, [
    paginationLoading,
    accumulatedLocations.length,
    currentPage,
    totalPages,
    totalCount,
  ]);

  // Calculate total pages based on batch pagination (max 5 pages per batch of 50 items)
  // This matches the behavior of locations page and cabinets page
  const calculatedTotalPages = useMemo(() => {
    const totalItems = accumulatedLocations.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    // Cap at pagesPerBatch (5 pages) per batch, or actual pages if less than 5
    return Math.min(
      pagesPerBatch,
      totalPagesFromItems > 0 ? totalPagesFromItems : 1
    );
  }, [accumulatedLocations.length, itemsPerPage, pagesPerBatch]);

  // Update totalPages when calculatedTotalPages changes
  useEffect(() => {
    setTotalPages(calculatedTotalPages);
  }, [calculatedTotalPages]);

  // Calculate paginated items for overview table (from accumulated locations) - 0-based page
  // pagesPerBatch is a constant (5) so adding it to deps is safe but unnecessary
  const paginatedTableItems = useMemo(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    return accumulatedLocations.slice(startIndex, endIndex);
  }, [accumulatedLocations, currentPage, itemsPerPage, pagesPerBatch]);

  // Update paginatedLocations state from accumulatedLocations (for Location Evaluation and Revenue Analysis tabs) - 0-based page
  // pagesPerBatch is a constant (5) so adding it to deps is safe but unnecessary
  useEffect(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedLocations(accumulatedLocations.slice(startIndex, endIndex));
  }, [accumulatedLocations, currentPage, itemsPerPage, pagesPerBatch]);

  const handleLocationSelect = (locationIds: string[]) => {
    setCurrentSelectedLocations(locationIds);
  };

  // Handle export for location overview
  const handleExportLocationOverview = async (format: 'pdf' | 'excel') => {
    // For export, use dropdown data (all locations) or accumulated locations
    const locationsToExport =
      allLocationsForDropdown.length > 0
        ? allLocationsForDropdown
        : accumulatedLocations;

    if (locationsToExport.length === 0) {
      toast.error('No location data to export', {
        duration: 3000,
      });
      return;
    }

    try {
      // Calculate totals from all locations if metricsOverview is not available
      const calculatedTotals = locationsToExport.reduce(
        (acc, loc) => {
          acc.totalGross += (loc.gross as number) || 0;
          acc.totalDrop += (loc.moneyIn as number) || 0;
          acc.totalCancelledCredits += (loc.moneyOut as number) || 0;
          acc.totalMachines += loc.totalMachines || 0;
          acc.onlineMachines += loc.onlineMachines || 0;
          return acc;
        },
        {
          totalGross: 0,
          totalDrop: 0,
          totalCancelledCredits: 0,
          totalMachines: 0,
          onlineMachines: 0,
        }
      );

      // Use metricsOverview if available, otherwise use calculated totals
      const finalTotals = metricsOverview || {
        totalGross: calculatedTotals.totalGross,
        totalDrop: calculatedTotals.totalDrop,
        totalCancelledCredits: calculatedTotals.totalCancelledCredits,
        totalMachines: calculatedTotals.totalMachines,
        onlineMachines: calculatedTotals.onlineMachines,
      };

      // Calculate overall hold percentage
      const overallHoldPercentage =
        finalTotals.totalDrop > 0
          ? ((finalTotals.totalGross / finalTotals.totalDrop) * 100).toFixed(2)
          : '0.00';

      // Prepare location data rows
      const locationRows = locationsToExport.map(loc => [
        loc.locationName || loc.name || 'Unknown',
        (loc.totalMachines || 0).toString(),
        (loc.onlineMachines || 0).toString(),
        shouldShowCurrency()
          ? formatAmount(loc.moneyIn || 0)
          : `$${((loc.moneyIn as number) || 0).toLocaleString()}`,
        shouldShowCurrency()
          ? formatAmount(loc.moneyOut || 0)
          : `$${((loc.moneyOut as number) || 0).toLocaleString()}`,
        shouldShowCurrency()
          ? formatAmount(loc.gross || 0)
          : `$${((loc.gross as number) || 0).toLocaleString()}`,
        ((loc.moneyIn as number) || 0) > 0
          ? `${((((loc.gross as number) || 0) / ((loc.moneyIn as number) || 1)) * 100).toFixed(2)}%`
          : '0%',
      ]);

      // Add totals row at the end
      const totalsRow = [
        'TOTAL',
        finalTotals.totalMachines.toString(),
        finalTotals.onlineMachines.toString(),
        shouldShowCurrency()
          ? formatAmount(finalTotals.totalDrop)
          : `$${finalTotals.totalDrop.toLocaleString()}`,
        shouldShowCurrency()
          ? formatAmount(finalTotals.totalCancelledCredits)
          : `$${finalTotals.totalCancelledCredits.toLocaleString()}`,
        shouldShowCurrency()
          ? formatAmount(finalTotals.totalGross)
          : `$${finalTotals.totalGross.toLocaleString()}`,
        `${overallHoldPercentage}%`,
      ];

      const exportDataObj: ExtendedLegacyExportData = {
        title: 'Location Overview Report',
        subtitle: `Location performance metrics for ${activeMetricsFilter || 'Today'}`,
        metadata: {
          generatedBy: 'Evolution CMS',
          generatedAt: new Date().toISOString(),
          dateRange: activeMetricsFilter || 'Today',
          tab: 'location-overview',
          selectedLocations: locationsToExport.length,
        },
        summary: [
          {
            label: 'Total Gross Revenue',
            value: shouldShowCurrency()
              ? formatAmount(finalTotals.totalGross)
              : `$${finalTotals.totalGross.toLocaleString()}`,
          },
          {
            label: 'Money In',
            value: shouldShowCurrency()
              ? formatAmount(finalTotals.totalDrop)
              : `$${finalTotals.totalDrop.toLocaleString()}`,
          },
          {
            label: 'Money Out',
            value: shouldShowCurrency()
              ? formatAmount(finalTotals.totalCancelledCredits)
              : `$${finalTotals.totalCancelledCredits.toLocaleString()}`,
          },
          {
            label: 'Online Machines',
            value: `${finalTotals.onlineMachines}/${finalTotals.totalMachines}`,
          },
          { label: 'Overall Hold %', value: `${overallHoldPercentage}%` },
        ],
        headers: [
          'Location Name',
          'Total Machines',
          'Online Machines',
          'Money In',
          'Money Out',
          'Gross Revenue',
          'Hold %',
        ],
        data: [...locationRows, totalsRow],
      };

      if (format === 'pdf') {
        const { ExportUtils } = await import('@/lib/utils/exportUtils');
        await ExportUtils.exportToPDF(exportDataObj);
      } else {
        // Excel export (synchronous)
        const { ExportUtils } = await import('@/lib/utils/exportUtils');
        ExportUtils.exportToExcel(exportDataObj);
      }

      toast.success(
        `Successfully exported ${locationsToExport.length} locations to ${format.toUpperCase()}`,
        {
          duration: 3000,
        }
      );
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast.error(
        `Failed to export location overview report as ${format.toUpperCase()}: ${errorMessage}`,
        {
          duration: 3000,
        }
      );
    }
  };

  const handleExportSASEvaluation = async (format: 'pdf' | 'excel') => {
    const currentSelectedLocations =
      activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
        ? selectedSasLocations
        : selectedRevenueLocations;
    await handleExportSASEvaluationHelper(
      currentSelectedLocations,
      allLocationsForDropdown as unknown as LocationExportData[],
      topLocations as TopLocationData[],
      selectedDateRange,
      activeMetricsFilter,
      format,
      toast
    );
  };

  const handleExportRevenueAnalysis = async (format: 'pdf' | 'excel') => {
    try {
      const currentSelectedLocations =
        activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
          ? selectedSasLocations
          : selectedRevenueLocations;
      const filteredData =
        currentSelectedLocations.length > 0
          ? allLocationsForDropdown.filter(loc => {
              // Find the corresponding topLocation to get the correct locationId
              const topLocation = topLocations.find(
                tl => tl.locationName === loc.name
              );
              return topLocation
                ? currentSelectedLocations.includes(topLocation.locationId)
                : false;
            })
          : allLocationsForDropdown;

      const exportDataObj: ExtendedLegacyExportData = {
        title: 'Revenue Analysis Report',
        subtitle:
          'Location revenue metrics with machine numbers, drop, cancelled credits, and gross revenue',
        headers: [
          'Location Name',
          'Machine Numbers',
          'Drop',
          'Cancelled Credits',
          'Gross Revenue',
        ],
        data: filteredData.map(loc => [
          loc.name,
          loc.totalMachines?.toString() || '0',
          (loc.moneyIn || 0).toLocaleString(),
          (loc.moneyOut || 0).toLocaleString(),
          (loc.gross || 0).toLocaleString(),
        ]),
        summary: [
          { label: 'Total Locations', value: filteredData.length.toString() },
          {
            label: 'Total Machines',
            value: filteredData
              .reduce(
                (sum, loc) => sum + ((loc.totalMachines as number) || 0),
                0
              )
              .toString(),
          },
          {
            label: 'Money In',
            value: `$${filteredData
              .reduce((sum, loc) => sum + ((loc.moneyIn as number) || 0), 0)
              .toLocaleString()}`,
          },
          {
            label: 'Money Out',
            value: `$${filteredData
              .reduce((sum, loc) => sum + ((loc.moneyOut as number) || 0), 0)
              .toLocaleString()}`,
          },
          {
            label: 'Total Gross Revenue',
            value: `$${filteredData
              .reduce((sum, loc) => sum + ((loc.gross as number) || 0), 0)
              .toLocaleString()}`,
          },
        ],
        metadata: {
          generatedBy: 'Reports System',
          generatedAt: new Date().toISOString(),
          dateRange:
            selectedDateRange?.start && selectedDateRange?.end
              ? `${selectedDateRange.start.toLocaleDateString()} - ${selectedDateRange.end.toLocaleDateString()}`
              : `${activeMetricsFilter}`,
          tab: 'Revenue Analysis',
          selectedLocations:
            currentSelectedLocations.length > 0
              ? currentSelectedLocations.length
              : 'All',
        },
      };

      const { ExportUtils } = await import('@/lib/utils/exportUtils');
      if (format === 'pdf') {
        await ExportUtils.exportToPDF(exportDataObj);
      } else {
        ExportUtils.exportToExcel(exportDataObj);
      }
      toast.success(
        `Revenue analysis report exported successfully as ${format.toUpperCase()}`,
        {
          duration: 3000,
        }
      );
    } catch (error) {
      toast.error('Failed to export report', {
        duration: 3000,
      });
      console.error('Export error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Location Performance Overview
          </h2>
          <p className="text-sm text-gray-600">
            Compare performance across all casino locations
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
            <span role="img" aria-label="lightbulb">
              💡
            </span>{' '}
            Click any location card to view detailed information
          </p>
        </div>
      </div>

      {/* Three-Tab Navigation System */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Navigation Tabs
        </h3>
        <Tabs
          value={activeTab}
          onValueChange={handleLocationsTabChange}
          className="w-full"
        >
          {/* Desktop Navigation */}
          <TabsList className="mb-6 hidden w-full grid-cols-3 rounded-lg bg-gray-100 p-2 shadow-sm md:grid">
            <TabsTrigger
              value="overview"
              className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="location-evaluation"
              className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              SAS Evaluation
            </TabsTrigger>
            <TabsTrigger
              value="location-revenue"
              className="flex-1 rounded bg-white px-4 py-3 text-sm font-medium transition-all hover:bg-gray-50 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Revenue Analysis
            </TabsTrigger>
          </TabsList>

          {/* Mobile Navigation */}
          <div className="mb-6 md:hidden">
            <select
              value={activeTab}
              onChange={e => handleLocationsTabChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
            >
              <option value="overview">Overview</option>
              <option value="location-evaluation">SAS Evaluation</option>
              <option value="location-revenue">Revenue Analysis</option>
            </select>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Metrics Overview */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Metrics Overview
              </h3>
              <div className="mb-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Set loading states but don't clear data immediately
                    setPaginationLoading(true);
                    setLocationsLoading(true);
                    setMetricsLoading(true);
                    setLoading(true);

                    try {
                      const currentSelectedLocations =
                        activeTab === 'sas-evaluation' ||
                        activeTab === 'location-evaluation'
                          ? selectedSasLocations
                          : selectedRevenueLocations;

                      // Reset batches and page
                      setAccumulatedLocations([]);
                      setLoadedBatches(new Set());
                      setCurrentPage(0);

                      // Fetch first batch
                      const firstBatchResult = await fetchBatch(
                        1,
                        itemsPerBatch
                      );

                      if (firstBatchResult.pagination) {
                        const pagination = firstBatchResult.pagination;
                        const total =
                          pagination.totalCount ?? pagination.total ?? 0;
                        setTotalCount(total);
                        setTotalPages(
                          pagination.totalPages ??
                            Math.ceil(total / itemsPerPage)
                        );
                      } else {
                        setTotalCount(firstBatchResult.data.length);
                        setTotalPages(
                          Math.ceil(firstBatchResult.data.length / itemsPerPage)
                        );
                      }

                      setAccumulatedLocations(firstBatchResult.data);
                      setLoadedBatches(new Set([1]));
                      setCurrentPage(0);

                      // Also refresh dropdown data
                      await fetchLocationDataAsync(
                        currentSelectedLocations.length > 0
                          ? currentSelectedLocations
                          : undefined
                      );
                    } catch (error) {
                      console.error('Error refreshing data:', error);
                      toast.error('Failed to refresh data', { duration: 3000 });
                    } finally {
                      setPaginationLoading(false);
                      setLocationsLoading(false);
                      setMetricsLoading(false);
                      setLoading(false);
                    }
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>
              {metricsLoading || metricsTotalsLoading ? (
                <SummaryCardsSkeleton />
              ) : metricsTotals ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <div
                        className={`break-words text-lg font-bold sm:text-xl lg:text-2xl ${getGrossColorClass(metricsTotals.gross || 0)}`}
                      >
                        {shouldShowCurrency()
                          ? formatAmount(metricsTotals.gross || 0)
                          : `$${(metricsTotals.gross || 0).toLocaleString()}`}
                      </div>
                      <p className="break-words text-xs text-muted-foreground sm:text-sm">
                        Total Gross Revenue
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div
                        className={`break-words text-lg font-bold sm:text-xl lg:text-2xl ${getMoneyInColorClass(metricsTotals.moneyIn || 0)}`}
                      >
                        {shouldShowCurrency()
                          ? formatAmount(metricsTotals.moneyIn || 0)
                          : `$${(metricsTotals.moneyIn || 0).toLocaleString()}`}
                      </div>
                      <p className="break-words text-xs text-muted-foreground sm:text-sm">
                        Money In
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div
                        className={`break-words text-lg font-bold sm:text-xl lg:text-2xl ${getMoneyOutColorClass(metricsTotals.moneyOut || 0, metricsTotals.moneyIn || 0)}`}
                      >
                        {shouldShowCurrency()
                          ? formatAmount(metricsTotals.moneyOut || 0)
                          : `$${(metricsTotals.moneyOut || 0).toLocaleString()}`}
                      </div>
                      <p className="break-words text-xs text-muted-foreground sm:text-sm">
                        Money Out
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="break-words text-lg font-bold text-blue-600 sm:text-xl lg:text-2xl">
                        {allLocationsForDropdown.reduce(
                          (sum: number, loc: AggregatedLocation) =>
                            sum + (loc.onlineMachines || 0),
                          0
                        )}
                        /
                        {allLocationsForDropdown.reduce(
                          (sum: number, loc: AggregatedLocation) =>
                            sum + (loc.totalMachines || 0),
                          0
                        )}
                      </div>
                      <p className="break-words text-xs text-muted-foreground sm:text-sm">
                        Online Machines
                      </p>
                      <Progress
                        value={
                          (allLocationsForDropdown.reduce(
                            (sum: number, loc: AggregatedLocation) =>
                              sum + (loc.onlineMachines || 0),
                            0
                          ) /
                            (allLocationsForDropdown.reduce(
                              (sum: number, loc: AggregatedLocation) =>
                                sum + (loc.totalMachines || 0),
                              0
                            ) || 1)) *
                          100
                        }
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No metrics data available
                </div>
              )}
            </div>

            {/* Interactive Map */}
            <div className="w-full overflow-hidden rounded-lg border border-gray-200">
              <LocationMap
                key={`map-${activeTab}-${topLocations.length}`}
                locations={topLocations.map(location => ({
                  id: location.locationId,
                  name: location.locationName,
                  coordinates: location.coordinates || { lat: 0, lng: 0 },
                  performance:
                    location.performance === 'excellent'
                      ? 95
                      : location.performance === 'good'
                        ? 80
                        : location.performance === 'average'
                          ? 65
                          : 50,
                  revenue: location.gross,
                }))}
                selectedLocations={
                  activeTab === 'sas-evaluation'
                    ? selectedSasLocations
                    : selectedRevenueLocations
                }
                onLocationSelect={handleLocationSelect}
                aggregates={allLocationsForDropdown}
                gamingLocations={gamingLocations}
                gamingLocationsLoading={gamingLocationsLoading}
                financialDataLoading={locationsLoading}
              />
            </div>

            {/* Location Overview Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Location Overview Report
                    </CardTitle>
                    <CardDescription>
                      Comprehensive overview of all locations with financial
                      metrics and machine status
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          accumulatedLocations.length === 0 || locationsLoading
                        }
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleExportLocationOverview('pdf')}
                        className="cursor-pointer"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportLocationOverview('excel')}
                        className="cursor-pointer"
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export as Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {locationsLoading || paginationLoading ? (
                  <div className="space-y-0">
                    {/* Table skeleton - Desktop */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <Skeleton className="h-4 w-32" />
                            </th>
                            <th className="px-4 py-3 text-center">
                              <Skeleton className="mx-auto h-4 w-24" />
                            </th>
                            <th className="px-4 py-3 text-center">
                              <Skeleton className="mx-auto h-4 w-24" />
                            </th>
                            <th className="px-4 py-3 text-right">
                              <Skeleton className="ml-auto h-4 w-20" />
                            </th>
                            <th className="px-4 py-3 text-right">
                              <Skeleton className="ml-auto h-4 w-20" />
                            </th>
                            <th className="px-4 py-3 text-right">
                              <Skeleton className="ml-auto h-4 w-24" />
                            </th>
                            <th className="px-4 py-3 text-center">
                              <Skeleton className="mx-auto h-4 w-16" />
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="whitespace-nowrap px-4 py-3">
                                <Skeleton className="h-4 w-40" />
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-center">
                                <Skeleton className="mx-auto h-4 w-12" />
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-center">
                                <Skeleton className="mx-auto h-4 w-12" />
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <Skeleton className="ml-auto h-4 w-24" />
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <Skeleton className="ml-auto h-4 w-24" />
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <Skeleton className="ml-auto h-4 w-24" />
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-center">
                                <Skeleton className="mx-auto h-4 w-16" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile cards skeleton */}
                    <div className="space-y-3 md:hidden">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-gray-200 bg-white p-4"
                        >
                          <div className="mb-3 space-y-2">
                            <Skeleton className="h-5 w-3/4" />{' '}
                            {/* Location Name */}
                            <div className="flex items-center gap-4">
                              <div className="space-y-1">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-4 w-12" />
                              </div>
                              <div className="space-y-1">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-4 w-12" />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2 border-t border-gray-100 pt-3">
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-20" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                            <div className="flex justify-between">
                              <Skeleton className="h-3 w-12" />
                              <Skeleton className="h-4 w-16" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Pagination skeleton */}
                    <div className="mt-4 flex justify-center">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </div>
                ) : accumulatedLocations.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Location Name
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                              Total Machines
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                              Online Machines
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                              Money In
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                              Money Out
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                              Gross Revenue
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                              Hold %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {paginatedTableItems.map((loc, index) => {
                            const holdPercentage =
                              ((loc.moneyIn as number) || 0) > 0
                                ? (((loc.gross as number) || 0) /
                                    ((loc.moneyIn as number) || 1)) *
                                  100
                                : 0;
                            return (
                              <tr
                                key={loc.location || loc._id || index}
                                className="hover:bg-gray-50"
                              >
                                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                                  <div className="flex items-center gap-1.5">
                                    <span>
                                      {loc.locationName ||
                                        loc.name ||
                                        'Unknown'}
                                    </span>
                                    {/* SMIB Icon - Show if location has SMIB machines */}
                                    {Boolean(
                                      (loc as { hasSmib?: boolean }).hasSmib ||
                                        !(loc as { noSMIBLocation?: boolean })
                                          .noSMIBLocation
                                    ) && (
                                      <div className="group relative inline-flex flex-shrink-0">
                                        <Server className="h-4 w-4 text-blue-600" />
                                        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                          SMIB Location
                                        </div>
                                      </div>
                                    )}
                                    {/* Local Server Icon */}
                                    {Boolean(
                                      (loc as { isLocalServer?: boolean })
                                        .isLocalServer
                                    ) && (
                                      <div className="group relative inline-flex flex-shrink-0">
                                        <Home className="h-4 w-4 text-purple-600" />
                                        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                          Local Server
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-500">
                                  {loc.totalMachines || 0}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-500">
                                  {loc.onlineMachines || 0}
                                </td>
                                <td
                                  className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${getMoneyInColorClass(loc.moneyIn)}`}
                                >
                                  {shouldShowCurrency()
                                    ? formatAmount(loc.moneyIn || 0)
                                    : `$${((loc.moneyIn as number) || 0).toLocaleString()}`}
                                </td>
                                <td
                                  className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${getMoneyOutColorClass(loc.moneyOut, loc.moneyIn)}`}
                                >
                                  {shouldShowCurrency()
                                    ? formatAmount(loc.moneyOut || 0)
                                    : `$${((loc.moneyOut as number) || 0).toLocaleString()}`}
                                </td>
                                <td
                                  className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${getGrossColorClass(loc.gross)}`}
                                >
                                  {shouldShowCurrency()
                                    ? formatAmount(loc.gross || 0)
                                    : `$${((loc.gross as number) || 0).toLocaleString()}`}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-gray-900">
                                  <span
                                    className={
                                      holdPercentage >= 10
                                        ? 'text-green-600'
                                        : holdPercentage >= 5
                                          ? 'text-yellow-600'
                                          : 'text-red-600'
                                    }
                                  >
                                    {holdPercentage.toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="mt-4 flex justify-center">
                        <PaginationControls
                          currentPage={currentPage}
                          totalPages={totalPages}
                          setCurrentPage={setCurrentPage}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    No location data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top 5 Locations - Commented Out */}
            {/* <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Top 5 Locations (Sorted by Gross)
                </h3>
                {selectedForComparison.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedForComparison.length} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCompareClick}
                      className="flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Compare ({selectedForComparison.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearComparison}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              {locationsLoading ? (
                <TopLocationsSkeleton />
              ) : topLocations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {topLocations.map((location) => (
                    <CasinoLocationCard
                      key={location.locationId}
                      location={location}
                      isSelected={(activeTab === "sas-evaluation" ? selectedSasLocations : selectedRevenueLocations).includes(
                        location.locationId
                      )}
                      isComparisonSelected={isItemSelected(location)}
                      onClick={() => handleItemClick(location, "locations")}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No location data available
                </div>
              )}
            </div> */}
          </TabsContent>

          {/* SAS Evaluation Tab */}
          <TabsContent value="location-evaluation" className="space-y-6">
            {/* Enhanced SAS Evaluation Interface */}
            <div className="space-y-6">
              {/* Header with Export Buttons */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    SAS Evaluation Dashboard
                  </h3>
                  <p className="text-sm text-gray-600">
                    Comprehensive location evaluation with interactive filtering
                    and real-time data visualization
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const currentSelectedLocations =
                        activeTab === 'sas-evaluation' ||
                        activeTab === 'location-evaluation'
                          ? selectedSasLocations
                          : selectedRevenueLocations;
                      setPaginationLoading(true);
                      setLocationsLoading(true);
                      setMetricsLoading(true);
                      setTopMachinesLoading(true);
                      setLoading(true);

                      try {
                        // Reset batches and page
                        setAccumulatedLocations([]);
                        setLoadedBatches(new Set());
                        setCurrentPage(0);

                        // Refresh location data
                        await fetchLocationDataAsync(
                          currentSelectedLocations.length > 0
                            ? currentSelectedLocations
                            : undefined
                        );

                        // Refresh additional data if locations are selected
                        if (currentSelectedLocations.length > 0) {
                          await fetchTopMachines();
                          await fetchLocationTrendData();
                        } else {
                          setTopMachinesData([]);
                          setLocationTrendData(null);
                        }

                        // Refresh metrics totals
                        setMetricsTotalsLoading(true);
                        await new Promise<void>((resolve, reject) => {
                          fetchDashboardTotals(
                            (activeMetricsFilter || 'Today') as TimePeriod,
                            customDateRange || {
                              startDate: new Date(),
                              endDate: new Date(),
                            },
                            selectedLicencee,
                            totals => {
                              setMetricsTotals(totals);
                              resolve();
                            },
                            displayCurrency
                          ).catch(reject);
                        });
                      } catch (error) {
                        console.error('Error refreshing data:', error);
                        toast.error('Failed to refresh data', {
                          duration: 3000,
                        });
                      } finally {
                        setPaginationLoading(false);
                        setLocationsLoading(false);
                        setMetricsLoading(false);
                        setTopMachinesLoading(false);
                        setMetricsTotalsLoading(false);
                        setLoading(false);
                      }
                    }}
                    disabled={
                      paginationLoading ||
                      locationsLoading ||
                      metricsLoading ||
                      topMachinesLoading ||
                      metricsTotalsLoading
                    }
                    className="flex items-center gap-2"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        paginationLoading ||
                        locationsLoading ||
                        metricsLoading ||
                        topMachinesLoading ||
                        metricsTotalsLoading
                          ? 'animate-spin'
                          : ''
                      }`}
                    />
                    Refresh
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleExportSASEvaluation('pdf')}
                        className="cursor-pointer"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportSASEvaluation('excel')}
                        className="cursor-pointer"
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export as Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Location Selection Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Location Selection & Controls
                  </CardTitle>
                  <CardDescription>
                    Select up to 3 SAS-enabled locations to filter data (SAS
                    locations only)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Select SAS Locations (Max 3)
                      </label>
                      {/* Only show skeleton if loading AND dropdown has no data yet */}
                      {locationsLoading &&
                      allLocationsForDropdown.length === 0 ? (
                        <div className="h-10 w-full animate-pulse rounded-md bg-gray-100" />
                      ) : (
                        <LocationMultiSelect
                          locations={(() => {
                            const sasLocations = allLocationsForDropdown.filter(
                              loc => (loc.sasMachines as number) > 0
                            );
                            console.warn(
                              `🔍 SAS Evaluation - allLocationsForDropdown: ${allLocationsForDropdown.length}, sasLocations: ${sasLocations.length}`
                            );
                            console.warn(
                              '🔍 SAS Evaluation - sasLocations:',
                              sasLocations.map(loc => ({
                                location: loc.location as string,
                                locationName: loc.locationName as string,
                                sasMachines: loc.sasMachines,
                              }))
                            );
                            return sasLocations.map(loc => ({
                              id: loc.location as string,
                              name: loc.locationName,
                              sasEnabled: loc.sasMachines > 0,
                            }));
                          })()}
                          selectedLocations={
                            activeTab === 'sas-evaluation' ||
                            activeTab === 'location-evaluation'
                              ? selectedSasLocations
                              : selectedRevenueLocations
                          }
                          onSelectionChange={newSelection => {
                            // Limit to 3 selections for location-evaluation and location-revenue tabs
                            if (newSelection.length <= 3) {
                              setCurrentSelectedLocations(newSelection);
                            } else {
                              toast.error(
                                'Maximum 3 locations can be selected',
                                { duration: 3000 }
                              );
                            }
                          }}
                          placeholder="Choose SAS locations to filter..."
                          maxSelections={3}
                        />
                      )}
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentSelectedLocations([])}
                        className="w-full"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600">
                        {(activeTab === 'sas-evaluation'
                          ? selectedSasLocations
                          : selectedRevenueLocations
                        ).length > 0
                          ? `${
                              (activeTab === 'sas-evaluation'
                                ? selectedSasLocations
                                : selectedRevenueLocations
                              ).length
                            } location${
                              (activeTab === 'sas-evaluation'
                                ? selectedSasLocations
                                : selectedRevenueLocations
                              ).length > 1
                                ? 's'
                                : ''
                            } selected`
                          : 'Please select locations to view data'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show skeleton loaders when data is loading */}
              {metricsLoading || paginationLoading ? (
                <LocationsSASEvaluationSkeleton />
              ) : (activeTab === 'location-evaluation' ||
                  activeTab === 'location-revenue') &&
                (activeTab === 'location-evaluation'
                  ? selectedSasLocations
                  : selectedRevenueLocations
                ).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">
                      Please select locations to view data
                    </p>
                  </CardContent>
                </Card>
              ) : paginatedLocations.length > 0 ? (
                <>
                  {/* Enhanced Location Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Location Evaluation Table
                      </CardTitle>
                      <CardDescription>
                        Comprehensive location metrics with SAS status
                        indicators
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EnhancedLocationTable
                        key={`enhanced-table-${activeTab}-${paginatedLocations.length}`}
                        locations={paginatedLocations.map(loc => {
                          // Debug logging to check data values
                          console.warn(
                            `🔍 Location data for table: ${JSON.stringify({
                              location: loc.location,
                              locationName: loc.locationName,
                              gamesPlayed: loc.gamesPlayed,
                              moneyIn: loc.moneyIn,
                              moneyOut: loc.moneyOut,
                              gross: loc.gross,
                              totalMachines: loc.totalMachines,
                              onlineMachines: loc.onlineMachines,
                              sasMachines: loc.sasMachines,
                              nonSasMachines: loc.nonSasMachines,
                            })}`
                          );

                          return {
                            location: loc.location,
                            locationName: loc.locationName,
                            moneyIn: loc.moneyIn,
                            moneyOut: loc.moneyOut,
                            gross: loc.gross,
                            coinIn: loc.coinIn || 0,
                            coinOut: loc.coinOut || 0,
                            jackpot: loc.jackpot || 0,
                            totalMachines: loc.totalMachines,
                            onlineMachines: loc.onlineMachines,
                            sasMachines: loc.sasMachines,
                            nonSasMachines: loc.nonSasMachines,
                            hasSasMachines: loc.hasSasMachines,
                            hasNonSasMachines: loc.hasNonSasMachines,
                            isLocalServer: loc.isLocalServer,
                            noSMIBLocation: !loc.hasSasMachines,
                            hasSmib: loc.hasSasMachines,
                            gamesPlayed: loc.gamesPlayed,
                          };
                        })}
                        onLocationClick={locationId => {
                          // Handle location click - could navigate to location details
                          console.warn(`Location clicked: ${locationId}`);
                        }}
                        loading={paginationLoading}
                        error={null}
                        currentPage={currentPage + 1}
                        totalPages={totalPages}
                        totalCount={accumulatedLocations.length}
                        onPageChange={page => setCurrentPage(page - 1)}
                        itemsPerPage={itemsPerPage}
                      />
                    </CardContent>
                  </Card>

                  {/* Summary Cards for SAS Evaluation - Show when locations are available */}
                  {paginatedLocations.length > 0 &&
                    (locationsLoading || metricsTotalsLoading ? (
                      <SummaryCardsSkeleton />
                    ) : (
                      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                        <Card>
                          <CardContent className="p-4">
                            <div
                              className={`break-words text-lg font-bold sm:text-xl lg:text-2xl ${getGrossColorClass(
                                displayTotals?.gross || 0
                              )}`}
                            >
                              {metricsTotalsLoading ? (
                                <Skeleton className="h-8 w-24" />
                              ) : shouldShowCurrency() ? (
                                formatAmount(displayTotals?.gross || 0)
                              ) : (
                                `$${(displayTotals?.gross || 0).toLocaleString()}`
                              )}
                            </div>
                            <p className="break-words text-xs text-muted-foreground sm:text-sm">
                              Total Net Win (Gross)
                            </p>
                            <p className="text-xs font-medium text-muted-foreground">
                              (Green if positive, Red if negative)
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div
                              className={`break-words text-lg font-bold sm:text-xl lg:text-2xl ${getMoneyInColorClass(
                                displayTotals?.moneyIn || 0
                              )}`}
                            >
                              {metricsTotalsLoading ? (
                                <Skeleton className="h-8 w-24" />
                              ) : shouldShowCurrency() ? (
                                formatAmount(displayTotals?.moneyIn || 0)
                              ) : (
                                `$${(displayTotals?.moneyIn || 0).toLocaleString()}`
                              )}
                            </div>
                            <p className="break-words text-xs text-muted-foreground sm:text-sm">
                              Money In
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div
                              className={`break-words text-lg font-bold sm:text-xl lg:text-2xl ${getMoneyOutColorClass(
                                displayTotals?.moneyOut || 0,
                                displayTotals?.moneyIn || 0
                              )}`}
                            >
                              {metricsTotalsLoading ? (
                                <Skeleton className="h-8 w-24" />
                              ) : shouldShowCurrency() ? (
                                formatAmount(displayTotals?.moneyOut || 0)
                              ) : (
                                `$${(displayTotals?.moneyOut || 0).toLocaleString()}`
                              )}
                            </div>
                            <p className="break-words text-xs text-muted-foreground sm:text-sm">
                              Money Out
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="break-words text-lg font-bold text-blue-600 sm:text-xl lg:text-2xl">
                              {(() => {
                                const filteredLocations =
                                  (activeTab === 'sas-evaluation' ||
                                  activeTab === 'location-evaluation'
                                    ? selectedSasLocations
                                    : selectedRevenueLocations
                                  ).length > 0
                                    ? paginatedLocations.filter(loc =>
                                        (activeTab === 'sas-evaluation' ||
                                        activeTab === 'location-evaluation'
                                          ? selectedSasLocations
                                          : selectedRevenueLocations
                                        ).includes(loc.location)
                                      )
                                    : [];
                                const onlineMachines = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.onlineMachines || 0),
                                  0
                                );
                                const totalMachines = filteredLocations.reduce(
                                  (sum, loc) => sum + (loc.totalMachines || 0),
                                  0
                                );
                                return `${onlineMachines}/${totalMachines}`;
                              })()}
                            </div>
                            <p className="break-words text-xs text-muted-foreground sm:text-sm">
                              Online Machines
                            </p>
                            <Progress
                              value={(() => {
                                const onlineMachines =
                                  paginatedLocations.reduce(
                                    (sum, loc) =>
                                      sum + (loc.onlineMachines || 0),
                                    0
                                  );
                                const totalMachines = paginatedLocations.reduce(
                                  (sum, loc) => sum + (loc.totalMachines || 0),
                                  0
                                );
                                return totalMachines > 0
                                  ? (onlineMachines / totalMachines) * 100
                                  : 0;
                              })()}
                              className="mt-2"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    ))}

                  {/* Machine Hourly Charts - Stacked by Machine */}
                  {/* Location Trend Charts */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
                    {(() => {
                      const currentSelectedLocations =
                        activeTab === 'sas-evaluation' ||
                        activeTab === 'location-evaluation'
                          ? selectedSasLocations
                          : selectedRevenueLocations;
                      const hasSelectedLocations =
                        currentSelectedLocations.length > 0;

                      // Don't show chart skeleton if page is still in initial loading phase
                      // Only show chart skeleton when page has loaded and we're specifically loading chart data
                      const isInitialLoading =
                        metricsLoading || paginationLoading;

                      // Show skeleton only if:
                      // 1. Not in initial loading phase (to avoid double skeletons)
                      // 2. AND (chart data is loading OR locations are selected but no data yet)
                      if (
                        !isInitialLoading &&
                        (locationTrendLoading ||
                          (hasSelectedLocations && !locationTrendData))
                      ) {
                        return <MachineHourlyChartsSkeleton />;
                      }

                      // During initial loading, don't render anything (parent skeleton handles it)
                      if (isInitialLoading) {
                        return null;
                      }

                      // Show data if available
                      if (
                        locationTrendData &&
                        locationTrendData.locations &&
                        locationTrendData.locations.length > 0 &&
                        locationTrendData.trends &&
                        locationTrendData.trends.length > 0
                      ) {
                        return (
                          <>
                            {/* Granularity Toggle */}
                            {showGranularitySelector && (
                              <div className="col-span-1 mb-3 flex items-center justify-end gap-2 lg:col-span-2 xl:col-span-4">
                                <label
                                  htmlFor="chart-granularity-location-evaluation"
                                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                  Granularity:
                                </label>
                                <select
                                  id="chart-granularity-location-evaluation"
                                  value={chartGranularity}
                                  onChange={e =>
                                    setChartGranularity(
                                      e.target.value as 'hourly' | 'minute'
                                    )
                                  }
                                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                                >
                                  <option value="minute">Minute</option>
                                  <option value="hourly">Hourly</option>
                                </select>
                              </div>
                            )}

                            {/* Money In Chart */}
                            <LocationTrendChart
                              title="Money In"
                              icon={<BarChart3 className="h-5 w-5" />}
                              data={locationTrendData.trends}
                              dataKey="drop"
                              locations={locationTrendData.locations}
                              locationNames={locationTrendData.locationNames}
                              colors={[
                                '#3b82f6',
                                '#ef4444',
                                '#10b981',
                                '#f59e0b',
                                '#8b5cf6',
                              ]}
                              formatter={value => `$${value.toLocaleString()}`}
                              isHourly={locationTrendData.isHourly}
                              timePeriod={
                                (activeMetricsFilter || 'Today') as TimePeriod
                              }
                              granularity={chartGranularity}
                            />

                            {/* Win/Loss Chart */}
                            <LocationTrendChart
                              title="Win/Loss"
                              icon={<TrendingUp className="h-5 w-5" />}
                              data={locationTrendData.trends}
                              dataKey="gross"
                              locations={locationTrendData.locations}
                              locationNames={locationTrendData.locationNames}
                              colors={[
                                '#10b981',
                                '#ef4444',
                                '#3b82f6',
                                '#f59e0b',
                                '#8b5cf6',
                              ]}
                              formatter={value => `$${value.toLocaleString()}`}
                              isHourly={locationTrendData.isHourly}
                              timePeriod={
                                (activeMetricsFilter || 'Today') as TimePeriod
                              }
                              granularity={chartGranularity}
                            />

                            {/* Jackpot Chart */}
                            <LocationTrendChart
                              title="Jackpot"
                              icon={<Trophy className="h-5 w-5" />}
                              data={locationTrendData.trends}
                              dataKey="jackpot"
                              locations={locationTrendData.locations}
                              locationNames={locationTrendData.locationNames}
                              colors={[
                                '#f59e0b',
                                '#ef4444',
                                '#10b981',
                                '#3b82f6',
                                '#8b5cf6',
                              ]}
                              formatter={value => `$${value.toLocaleString()}`}
                              isHourly={locationTrendData.isHourly}
                              timePeriod={
                                (activeMetricsFilter || 'Today') as TimePeriod
                              }
                              granularity={chartGranularity}
                            />

                            {/* Plays Chart */}
                            <LocationTrendChart
                              title="Plays"
                              icon={<Activity className="h-5 w-5" />}
                              data={locationTrendData.trends}
                              dataKey="plays"
                              locations={locationTrendData.locations}
                              locationNames={locationTrendData.locationNames}
                              colors={[
                                '#8b5cf6',
                                '#ef4444',
                                '#10b981',
                                '#3b82f6',
                                '#f59e0b',
                              ]}
                              formatter={value => value.toLocaleString()}
                              isHourly={locationTrendData.isHourly}
                              timePeriod={
                                (activeMetricsFilter || 'Today') as TimePeriod
                              }
                              granularity={chartGranularity}
                            />
                          </>
                        );
                      }

                      // Show message only if no locations selected
                      return (
                        <div className="col-span-2 py-8 text-center text-muted-foreground">
                          Select locations to view location trend data
                        </div>
                      );
                    })()}
                  </div>

                  {/* Top 5 Machines Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-orange-600" />
                        Top 5 Machines
                      </CardTitle>
                      <CardDescription>
                        Highest performing machines by revenue and hold
                        percentage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const currentSelectedLocations =
                          activeTab === 'sas-evaluation' ||
                          activeTab === 'location-evaluation'
                            ? selectedSasLocations
                            : selectedRevenueLocations;
                        const hasSelectedLocations =
                          currentSelectedLocations.length > 0;

                        // Don't show skeleton if page is still in initial loading phase
                        // Only show skeleton when page has loaded and we're specifically loading data
                        const isInitialLoading =
                          metricsLoading || paginationLoading;

                        // Show skeleton only if:
                        // 1. Not in initial loading phase (to avoid double skeletons)
                        // 2. AND (data is loading OR locations are selected but no data yet)
                        if (
                          !isInitialLoading &&
                          (topMachinesLoading ||
                            (hasSelectedLocations &&
                              topMachinesData.length === 0))
                        ) {
                          return <TopMachinesTableSkeleton />;
                        }

                        // During initial loading, don't render anything (parent skeleton handles it)
                        if (isInitialLoading) {
                          return null;
                        }

                        // Show message only if no locations selected
                        if (!hasSelectedLocations) {
                          return (
                            <div className="py-8 text-center text-muted-foreground">
                              Select locations to view machine data
                            </div>
                          );
                        }

                        // Show data if available
                        if (topMachinesData.length > 0) {
                          return (
                            <>
                              {/* Desktop Table View */}
                              <div className="hidden overflow-x-auto md:block">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b bg-gray-50">
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Location
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Machine
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Game
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Manufacturer
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Money In
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Win/Loss
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Jackpot
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Avg. Wag. per Game
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Actual Hold
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Theoretical Hold
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Games Played
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {topMachinesData.map((machine, index) => (
                                      <tr
                                        key={`${machine.machineId}-${index}`}
                                        className="border-b hover:bg-gray-50"
                                      >
                                        <td className="p-3 text-center">
                                          {machine.locationId ? (
                                            <button
                                              onClick={() => {
                                                router.push(
                                                  `/locations/${machine.locationId}`
                                                );
                                              }}
                                              className="group mx-auto flex items-center gap-1.5 text-sm font-medium text-gray-900 transition-opacity hover:opacity-80"
                                            >
                                              <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                                {machine.locationName}
                                              </span>
                                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                            </button>
                                          ) : (
                                            <div className="text-sm font-medium text-gray-900">
                                              {machine.locationName}
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-3 text-center">
                                          {machine.machineId ? (
                                            <button
                                              onClick={() => {
                                                router.push(
                                                  `/cabinets/${machine.machineId}`
                                                );
                                              }}
                                              className="group mx-auto flex items-center gap-1.5 font-mono text-sm text-gray-900 transition-opacity hover:opacity-80"
                                            >
                                              <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                                {/* Format: serialNumber || custom.name (custom.name if different, game) */}
                                                {(() => {
                                                  // Get serialNumber
                                                  const serialNumber =
                                                    machine.serialNumber?.trim() ||
                                                    '';
                                                  const hasSerialNumber =
                                                    serialNumber !== '';

                                                  // Get custom.name
                                                  const customName =
                                                    machine.customName?.trim() ||
                                                    '';
                                                  const hasCustomName =
                                                    customName !== '';

                                                  // Main identifier: serialNumber if exists, otherwise custom.name, otherwise machineId
                                                  const mainIdentifier =
                                                    hasSerialNumber
                                                      ? serialNumber
                                                      : hasCustomName
                                                        ? customName
                                                        : machine.machineId;
                                                  const usedSerialNumber =
                                                    hasSerialNumber;

                                                  // Get game
                                                  const game =
                                                    machine.gameTitle?.trim() ||
                                                    '';
                                                  const hasGame = game !== '';

                                                  // Format: serialNumber || custom.name (custom.name if different, game)
                                                  const parts: string[] = [];

                                                  // Only add customName if:
                                                  // 1. We used serialNumber as main identifier
                                                  // 2. customName exists and is different from serialNumber
                                                  if (
                                                    usedSerialNumber &&
                                                    hasCustomName &&
                                                    customName !== serialNumber
                                                  ) {
                                                    parts.push(customName);
                                                  }

                                                  // Always include game (or "(game name not provided)" in red if blank)
                                                  if (hasGame) {
                                                    parts.push(game);
                                                  } else {
                                                    parts.push(
                                                      '(game name not provided)'
                                                    );
                                                  }

                                                  return (
                                                    <span>
                                                      {mainIdentifier} (
                                                      {parts.map(
                                                        (part, idx) => {
                                                          const isGameNotProvided =
                                                            part ===
                                                            '(game name not provided)';
                                                          return (
                                                            <span key={idx}>
                                                              {isGameNotProvided ? (
                                                                <span className="text-red-600">
                                                                  {part}
                                                                </span>
                                                              ) : (
                                                                part
                                                              )}
                                                              {idx <
                                                                parts.length -
                                                                  1 && ', '}
                                                            </span>
                                                          );
                                                        }
                                                      )}
                                                      )
                                                    </span>
                                                  );
                                                })()}
                                              </span>
                                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                            </button>
                                          ) : (
                                            <div className="font-mono text-sm text-gray-900">
                                              {machine.serialNumber ||
                                                machine.machineId}
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-3 text-sm">
                                          {machine.gameTitle ? (
                                            machine.gameTitle
                                          ) : (
                                            <span className="text-red-600">
                                              (game name not provided)
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-3 text-sm">
                                          {machine.manufacturer}
                                        </td>
                                        <td className="p-3 text-sm font-medium">
                                          $
                                          {(machine.drop || 0).toLocaleString()}
                                        </td>
                                        <td
                                          className={`p-3 text-sm font-medium ${
                                            (machine.netWin || 0) >= 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          $
                                          {(
                                            machine.netWin || 0
                                          ).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-sm">
                                          $
                                          {(
                                            machine.jackpot || 0
                                          ).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-sm">
                                          $
                                          {machine.avgBet
                                            ? machine.avgBet.toFixed(2)
                                            : '0.00'}
                                        </td>
                                        <td className="p-3 text-sm font-medium text-gray-600">
                                          {machine.actualHold != null &&
                                          !isNaN(machine.actualHold)
                                            ? machine.actualHold.toFixed(2) +
                                              '%'
                                            : 'N/A'}
                                        </td>
                                        <td className="p-3 text-sm text-gray-600">
                                          {machine.theoreticalHold != null &&
                                          !isNaN(machine.theoreticalHold)
                                            ? machine.theoreticalHold.toFixed(
                                                2
                                              ) + '%'
                                            : 'N/A'}
                                        </td>
                                        <td className="p-3 text-sm">
                                          {(
                                            machine.gamesPlayed || 0
                                          ).toLocaleString()}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Card View */}
                              <div className="space-y-4 md:hidden">
                                {topMachinesData.map((machine, index) => (
                                  <Card
                                    key={`${machine.machineId}-${index}`}
                                    className="p-4"
                                  >
                                    <div className="mb-3">
                                      <h4 className="text-sm font-medium">
                                        {machine.machineName}
                                      </h4>
                                      <p className="text-xs text-muted-foreground">
                                        {machine.locationName} •{' '}
                                        {machine.gameTitle ? (
                                          machine.gameTitle
                                        ) : (
                                          <span className="text-red-600">
                                            (game name not provided)
                                          </span>
                                        )}
                                      </p>
                                    </div>

                                    {/* Tiny screen layout (< 425px) - Single column */}
                                    <div className="block space-y-2 text-xs sm:hidden">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Manufacturer:
                                        </span>
                                        <span className="font-medium">
                                          {machine.manufacturer}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Money In:
                                        </span>
                                        <span className="font-medium">
                                          $
                                          {(machine.drop || 0).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Win/Loss:
                                        </span>
                                        <span
                                          className={`font-medium ${
                                            (machine.netWin || 0) >= 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          $
                                          {(
                                            machine.netWin || 0
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Avg. Wag. per Game:
                                        </span>
                                        <span className="font-medium">
                                          $
                                          {machine.avgBet
                                            ? machine.avgBet.toFixed(2)
                                            : '0.00'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Actual Hold:
                                        </span>
                                        <span className="font-medium text-gray-600">
                                          {machine.actualHold != null &&
                                          !isNaN(machine.actualHold)
                                            ? machine.actualHold.toFixed(2) +
                                              '%'
                                            : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Theoretical Hold:
                                        </span>
                                        <span className="font-medium text-gray-600">
                                          {machine.theoreticalHold != null &&
                                          !isNaN(machine.theoreticalHold)
                                            ? machine.theoreticalHold.toFixed(
                                                2
                                              ) + '%'
                                            : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Games Played:
                                        </span>
                                        <span className="font-medium">
                                          {(
                                            machine.gamesPlayed || 0
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Small screen layout (425px+) - Two columns */}
                                    <div className="hidden gap-4 text-sm sm:grid sm:grid-cols-2">
                                      <div>
                                        <span className="text-muted-foreground">
                                          Manufacturer:
                                        </span>
                                        <p>{machine.manufacturer}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Money In:
                                        </span>
                                        <p className="font-medium">
                                          $
                                          {(machine.drop || 0).toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Win/Loss:
                                        </span>
                                        <p
                                          className={`font-medium ${
                                            (machine.netWin || 0) >= 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          $
                                          {(
                                            machine.netWin || 0
                                          ).toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Avg. Wag. per Game:
                                        </span>
                                        <p>
                                          $
                                          {machine.avgBet
                                            ? machine.avgBet.toFixed(2)
                                            : '0.00'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Actual Hold:
                                        </span>
                                        <p className="font-medium text-gray-600">
                                          {machine.actualHold != null &&
                                          !isNaN(machine.actualHold)
                                            ? machine.actualHold.toFixed(2) +
                                              '%'
                                            : 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Theoretical Hold:
                                        </span>
                                        <p className="text-gray-600">
                                          {machine.theoreticalHold != null &&
                                          !isNaN(machine.theoreticalHold)
                                            ? machine.theoreticalHold.toFixed(
                                                2
                                              ) + '%'
                                            : 'N/A'}
                                        </p>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">
                                          Games Played:
                                        </span>
                                        <p>
                                          {(
                                            machine.gamesPlayed || 0
                                          ).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </>
                          );
                        }

                        // Show message if locations selected but no data
                        return (
                          <div className="py-8 text-center text-muted-foreground">
                            No machine data available for evaluation
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="mb-2 text-lg text-gray-500">
                      No Data to Display
                    </div>
                    <div className="text-sm text-gray-400">
                      Please select up to 3 SAS-enabled locations to view
                      evaluation data
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Revenue Analysis Tab */}
          <TabsContent value="location-revenue" className="space-y-6">
            {/* Enhanced Revenue Analysis Interface */}
            <div className="space-y-6">
              {/* Header with Export Buttons */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Revenue Analysis Dashboard
                  </h3>
                  <p className="text-sm text-gray-600">
                    Comprehensive revenue analysis with location name, machine
                    numbers, drop, cancelled credits, and gross revenue
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const currentSelectedLocations =
                        activeTab === 'sas-evaluation' ||
                        activeTab === 'location-evaluation'
                          ? selectedSasLocations
                          : selectedRevenueLocations;
                      setPaginationLoading(true);
                      setLocationsLoading(true);
                      setMetricsLoading(true);
                      setTopMachinesLoading(true);
                      setLoading(true);

                      try {
                        // Reset batches and page
                        setAccumulatedLocations([]);
                        setLoadedBatches(new Set());
                        setCurrentPage(0);

                        // Refresh location data
                        await fetchLocationDataAsync(
                          currentSelectedLocations.length > 0
                            ? currentSelectedLocations
                            : undefined
                        );

                        // Refresh additional data if locations are selected
                        if (currentSelectedLocations.length > 0) {
                          await fetchTopMachines();
                          await fetchLocationTrendData();
                        } else {
                          setTopMachinesData([]);
                          setLocationTrendData(null);
                        }

                        // Refresh metrics totals
                        setMetricsTotalsLoading(true);
                        await new Promise<void>((resolve, reject) => {
                          fetchDashboardTotals(
                            (activeMetricsFilter || 'Today') as TimePeriod,
                            customDateRange || {
                              startDate: new Date(),
                              endDate: new Date(),
                            },
                            selectedLicencee,
                            totals => {
                              setMetricsTotals(totals);
                              resolve();
                            },
                            displayCurrency
                          ).catch(reject);
                        });
                      } catch (error) {
                        console.error('Error refreshing data:', error);
                        toast.error('Failed to refresh data', {
                          duration: 3000,
                        });
                      } finally {
                        setPaginationLoading(false);
                        setLocationsLoading(false);
                        setMetricsLoading(false);
                        setTopMachinesLoading(false);
                        setMetricsTotalsLoading(false);
                        setLoading(false);
                      }
                    }}
                    disabled={
                      paginationLoading ||
                      locationsLoading ||
                      metricsLoading ||
                      topMachinesLoading ||
                      metricsTotalsLoading
                    }
                    className="flex items-center gap-2"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        paginationLoading ||
                        locationsLoading ||
                        metricsLoading ||
                        topMachinesLoading ||
                        metricsTotalsLoading
                          ? 'animate-spin'
                          : ''
                      }`}
                    />
                    Refresh
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleExportRevenueAnalysis('pdf')}
                        className="cursor-pointer"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportRevenueAnalysis('excel')}
                        className="cursor-pointer"
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export as Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Location Selection Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Location Selection & Controls
                  </CardTitle>
                  <CardDescription>
                    Select up to 3 locations to filter data (SAS and non-SAS
                    locations)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Select Locations (Max 3)
                      </label>
                      {/* Only show skeleton if loading AND dropdown has no data yet */}
                      {locationsLoading &&
                      allLocationsForDropdown.length === 0 ? (
                        <div className="h-10 w-full animate-pulse rounded-md bg-gray-100" />
                      ) : (
                        <LocationMultiSelect
                          locations={(() => {
                            return allLocationsForDropdown.map(loc => ({
                              id: loc.location,
                              name: loc.locationName,
                              sasEnabled: loc.hasSasMachines,
                            }));
                          })()}
                          selectedLocations={
                            activeTab === 'sas-evaluation' ||
                            activeTab === 'location-evaluation'
                              ? selectedSasLocations
                              : selectedRevenueLocations
                          }
                          onSelectionChange={newSelection => {
                            // Limit to 3 selections for location-evaluation and location-revenue tabs
                            if (newSelection.length <= 3) {
                              setCurrentSelectedLocations(newSelection);
                            } else {
                              toast.error(
                                'Maximum 3 locations can be selected',
                                { duration: 3000 }
                              );
                            }
                          }}
                          placeholder="Choose locations to filter..."
                          maxSelections={3}
                        />
                      )}
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentSelectedLocations([])}
                        className="w-full"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm text-gray-600">
                        {(activeTab === 'sas-evaluation'
                          ? selectedSasLocations
                          : selectedRevenueLocations
                        ).length > 0
                          ? `${
                              (activeTab === 'sas-evaluation'
                                ? selectedSasLocations
                                : selectedRevenueLocations
                              ).length
                            } location${
                              (activeTab === 'sas-evaluation'
                                ? selectedSasLocations
                                : selectedRevenueLocations
                              ).length > 1
                                ? 's'
                                : ''
                            } selected`
                          : 'Please select locations to view data'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show skeleton loaders when data is loading */}
              {metricsLoading || paginationLoading ? (
                <LocationsRevenueAnalysisSkeleton />
              ) : (activeTab === 'location-evaluation' ||
                  activeTab === 'location-revenue') &&
                (activeTab === 'location-evaluation'
                  ? selectedSasLocations
                  : selectedRevenueLocations
                ).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">
                      Please select locations to view data
                    </p>
                  </CardContent>
                </Card>
              ) : paginatedLocations.length > 0 ? (
                <>
                  {/* Revenue Analysis Table */}
                  <RevenueAnalysisTable
                    key={`revenue-table-${activeTab}-${paginatedLocations.length}`}
                    locations={paginatedLocations}
                    loading={paginationLoading}
                    currentPage={currentPage + 1}
                    totalPages={totalPages}
                    totalCount={accumulatedLocations.length}
                    onPageChange={page => setCurrentPage(page - 1)}
                    onLocationClick={(location: AggregatedLocation) => {
                      // Handle location click if needed
                      console.warn(
                        `Location clicked: ${JSON.stringify(location)}`
                      );
                    }}
                  />

                  {/* Summary Cards for Revenue Analysis - Show when locations are available */}
                  {paginatedLocations.length > 0 &&
                    (locationsLoading || metricsTotalsLoading ? (
                      <SummaryCardsSkeleton />
                    ) : (
                      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                        <Card>
                          <CardContent className="p-4">
                            <div
                              className={`break-words text-lg font-bold sm:text-xl lg:text-2xl ${getGrossColorClass(
                                displayTotals?.gross || 0
                              )}`}
                            >
                              {metricsTotalsLoading ? (
                                <Skeleton className="h-8 w-24" />
                              ) : shouldShowCurrency() ? (
                                formatAmount(displayTotals?.gross || 0)
                              ) : (
                                `$${(displayTotals?.gross || 0).toLocaleString()}`
                              )}
                            </div>
                            <p className="break-words text-xs text-muted-foreground sm:text-sm">
                              Total Net Win (Gross)
                            </p>
                            <p className="text-xs font-medium text-muted-foreground">
                              (Green if positive, Red if negative)
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div
                              className={`break-words text-lg font-bold sm:text-xl lg:text-2xl ${getMoneyInColorClass(
                                displayTotals?.moneyIn || 0
                              )}`}
                            >
                              {metricsTotalsLoading ? (
                                <Skeleton className="h-8 w-24" />
                              ) : shouldShowCurrency() ? (
                                formatAmount(displayTotals?.moneyIn || 0)
                              ) : (
                                `$${(displayTotals?.moneyIn || 0).toLocaleString()}`
                              )}
                            </div>
                            <p className="break-words text-xs text-muted-foreground sm:text-sm">
                              Money In
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div
                              className={`break-words text-lg font-bold sm:text-xl lg:text-2xl ${getMoneyOutColorClass(
                                displayTotals?.moneyOut || 0,
                                displayTotals?.moneyIn || 0
                              )}`}
                            >
                              {metricsTotalsLoading ? (
                                <Skeleton className="h-8 w-24" />
                              ) : shouldShowCurrency() ? (
                                formatAmount(displayTotals?.moneyOut || 0)
                              ) : (
                                `$${(displayTotals?.moneyOut || 0).toLocaleString()}`
                              )}
                            </div>
                            <p className="break-words text-xs text-muted-foreground sm:text-sm">
                              Money Out
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="break-words text-lg font-bold text-blue-600 sm:text-xl lg:text-2xl">
                              {(() => {
                                const onlineMachines =
                                  paginatedLocations.reduce(
                                    (sum, loc) =>
                                      sum + (loc.onlineMachines || 0),
                                    0
                                  );
                                const totalMachines = paginatedLocations.reduce(
                                  (sum, loc) => sum + (loc.totalMachines || 0),
                                  0
                                );
                                return `${onlineMachines}/${totalMachines}`;
                              })()}
                            </div>
                            <p className="break-words text-xs text-muted-foreground sm:text-sm">
                              Online Machines
                            </p>
                            <Progress
                              value={(() => {
                                const onlineMachines =
                                  paginatedLocations.reduce(
                                    (sum, loc) =>
                                      sum + (loc.onlineMachines || 0),
                                    0
                                  );
                                const totalMachines = paginatedLocations.reduce(
                                  (sum, loc) => sum + (loc.totalMachines || 0),
                                  0
                                );
                                return totalMachines > 0
                                  ? (onlineMachines / totalMachines) * 100
                                  : 0;
                              })()}
                              className="mt-2"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    ))}

                  {/* Revenue Analysis Charts - Drop, Win/Loss, and Jackpot */}
                  <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {(() => {
                      const currentSelectedLocations =
                        activeTab === 'sas-evaluation' ||
                        activeTab === 'location-evaluation'
                          ? selectedSasLocations
                          : selectedRevenueLocations;
                      const hasSelectedLocations =
                        currentSelectedLocations.length > 0;
                      const hasDisplayedLocations =
                        paginatedLocations.length > 0;

                      // Don't show chart skeleton if page is still in initial loading phase
                      // Only show chart skeleton when page has loaded and we're specifically loading chart data
                      const isInitialLoading =
                        metricsLoading || paginationLoading;

                      // During initial loading, don't render anything (parent skeleton handles it)
                      if (isInitialLoading) {
                        return null;
                      }

                      // Show data if available
                      if (
                        locationTrendData &&
                        locationTrendData.locations &&
                        locationTrendData.locations.length > 0 &&
                        locationTrendData.trends &&
                        locationTrendData.trends.length > 0
                      ) {
                        return (
                          <>
                            {/* Granularity Toggle */}
                            {showGranularitySelector && (
                              <div className="col-span-1 mb-3 flex items-center justify-end gap-2 lg:col-span-2 xl:col-span-3">
                                <label
                                  htmlFor="chart-granularity-location-revenue"
                                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                  Granularity:
                                </label>
                                <select
                                  id="chart-granularity-location-revenue"
                                  value={chartGranularity}
                                  onChange={e =>
                                    setChartGranularity(
                                      e.target.value as 'hourly' | 'minute'
                                    )
                                  }
                                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                                >
                                  <option value="minute">Minute</option>
                                  <option value="hourly">Hourly</option>
                                </select>
                              </div>
                            )}

                            {/* Money In Chart */}
                            <LocationTrendChart
                              title="Money In"
                              icon={<BarChart3 className="h-5 w-5" />}
                              data={locationTrendData.trends}
                              dataKey="drop"
                              locations={locationTrendData.locations}
                              locationNames={locationTrendData.locationNames}
                              colors={[
                                '#3b82f6',
                                '#ef4444',
                                '#10b981',
                                '#f59e0b',
                                '#8b5cf6',
                              ]}
                              formatter={value => `$${value.toLocaleString()}`}
                              isHourly={locationTrendData.isHourly}
                              timePeriod={
                                (activeMetricsFilter || 'Today') as TimePeriod
                              }
                              granularity={chartGranularity}
                            />

                            {/* Win/Loss Chart */}
                            <LocationTrendChart
                              title="Win/Loss"
                              icon={<TrendingUp className="h-5 w-5" />}
                              data={locationTrendData.trends}
                              dataKey="gross"
                              locations={locationTrendData.locations}
                              locationNames={locationTrendData.locationNames}
                              colors={[
                                '#10b981',
                                '#ef4444',
                                '#3b82f6',
                                '#f59e0b',
                                '#8b5cf6',
                              ]}
                              formatter={value => `$${value.toLocaleString()}`}
                              isHourly={locationTrendData.isHourly}
                              timePeriod={
                                (activeMetricsFilter || 'Today') as TimePeriod
                              }
                              granularity={chartGranularity}
                            />

                            {/* Jackpot Chart */}
                            <LocationTrendChart
                              title="Jackpot"
                              icon={<Trophy className="h-5 w-5" />}
                              data={locationTrendData.trends}
                              dataKey="jackpot"
                              locations={locationTrendData.locations}
                              locationNames={locationTrendData.locationNames}
                              colors={[
                                '#f59e0b',
                                '#ef4444',
                                '#10b981',
                                '#3b82f6',
                                '#8b5cf6',
                              ]}
                              formatter={value => `$${value.toLocaleString()}`}
                              isHourly={locationTrendData.isHourly}
                              timePeriod={
                                (activeMetricsFilter || 'Today') as TimePeriod
                              }
                              granularity={chartGranularity}
                            />
                          </>
                        );
                      }

                      // Show skeleton only when actively loading chart data
                      if (locationTrendLoading) {
                        return <RevenueAnalysisChartsSkeleton />;
                      }

                      // Show message if no locations selected and no displayed locations
                      if (!hasSelectedLocations && !hasDisplayedLocations) {
                        return (
                          <div className="col-span-1 py-8 text-center text-muted-foreground lg:col-span-2 xl:col-span-3">
                            Select locations to view revenue analysis data
                          </div>
                        );
                      }

                      // If we have locations but no data (and not loading), show message instead of skeleton
                      if (
                        (hasSelectedLocations || hasDisplayedLocations) &&
                        !locationTrendData
                      ) {
                        return (
                          <div className="col-span-1 py-8 text-center text-muted-foreground md:col-span-2 lg:col-span-3">
                            No chart data available for selected locations
                          </div>
                        );
                      }

                      // Safe fallback - should not normally reach here
                      return null;
                    })()}
                  </div>

                  {/* Top 5 Machines Table for Revenue Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-orange-600" />
                        Top 5 Machines (Overall)
                      </CardTitle>
                      <CardDescription>
                        Highest performing machines by revenue and hold
                        percentage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const currentSelectedLocations =
                          activeTab === 'sas-evaluation' ||
                          activeTab === 'location-evaluation'
                            ? selectedSasLocations
                            : selectedRevenueLocations;
                        const hasSelectedLocations =
                          currentSelectedLocations.length > 0;
                        const hasDisplayedLocations =
                          paginatedLocations.length > 0;

                        // Don't show skeleton if page is still in initial loading phase
                        // Only show skeleton when page has loaded and we're specifically loading data
                        const isInitialLoading =
                          metricsLoading || paginationLoading;

                        // Show skeleton only if:
                        // 1. Not in initial loading phase (to avoid double skeletons)
                        // 2. AND (data is loading OR locations are selected/displayed but no data yet)
                        if (
                          !isInitialLoading &&
                          (topMachinesLoading ||
                            ((hasSelectedLocations || hasDisplayedLocations) &&
                              topMachinesData.length === 0))
                        ) {
                          return <TopMachinesTableSkeleton />;
                        }

                        // During initial loading, don't render anything (parent skeleton handles it)
                        if (isInitialLoading) {
                          return null;
                        }

                        // Show message only if no locations selected and no displayed locations
                        if (!hasSelectedLocations && !hasDisplayedLocations) {
                          return (
                            <div className="py-8 text-center text-muted-foreground">
                              Select locations to view machine data
                            </div>
                          );
                        }

                        // Show data if available
                        if (topMachinesData.length > 0) {
                          return (
                            <>
                              {/* Desktop Table View */}
                              <div className="hidden overflow-x-auto md:block">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b bg-gray-50">
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Location
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Machine
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Game
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Manufacturer
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Money In
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Win/Loss
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Jackpot
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Avg. Wag. per Game
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Actual Hold
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Theoretical Hold
                                      </th>
                                      <th className="p-3 text-center font-medium text-gray-700">
                                        Games Played
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {topMachinesData.map((machine, index) => (
                                      <tr
                                        key={`${machine.machineId}-${index}`}
                                        className="border-b hover:bg-gray-50"
                                      >
                                        <td className="p-3 text-center">
                                          {machine.locationId ? (
                                            <button
                                              onClick={() => {
                                                router.push(
                                                  `/locations/${machine.locationId}`
                                                );
                                              }}
                                              className="group mx-auto flex items-center gap-1.5 text-sm font-medium text-gray-900 transition-opacity hover:opacity-80"
                                            >
                                              <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                                {machine.locationName}
                                              </span>
                                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                            </button>
                                          ) : (
                                            <div className="text-sm font-medium text-gray-900">
                                              {machine.locationName}
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-3 text-center">
                                          {machine.machineId ? (
                                            <button
                                              onClick={() => {
                                                router.push(
                                                  `/cabinets/${machine.machineId}`
                                                );
                                              }}
                                              className="group mx-auto flex items-center gap-1.5 font-mono text-sm text-gray-900 transition-opacity hover:opacity-80"
                                            >
                                              <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                                {/* Format: serialNumber || custom.name (custom.name if different, game) */}
                                                {(() => {
                                                  // Get serialNumber
                                                  const serialNumber =
                                                    machine.serialNumber?.trim() ||
                                                    '';
                                                  const hasSerialNumber =
                                                    serialNumber !== '';

                                                  // Get custom.name
                                                  const customName =
                                                    machine.customName?.trim() ||
                                                    '';
                                                  const hasCustomName =
                                                    customName !== '';

                                                  // Main identifier: serialNumber if exists, otherwise custom.name, otherwise machineId
                                                  const mainIdentifier =
                                                    hasSerialNumber
                                                      ? serialNumber
                                                      : hasCustomName
                                                        ? customName
                                                        : machine.machineId;
                                                  const usedSerialNumber =
                                                    hasSerialNumber;

                                                  // Get game
                                                  const game =
                                                    machine.gameTitle?.trim() ||
                                                    '';
                                                  const hasGame = game !== '';

                                                  // Format: serialNumber || custom.name (custom.name if different, game)
                                                  const parts: string[] = [];

                                                  // Only add customName if:
                                                  // 1. We used serialNumber as main identifier
                                                  // 2. customName exists and is different from serialNumber
                                                  if (
                                                    usedSerialNumber &&
                                                    hasCustomName &&
                                                    customName !== serialNumber
                                                  ) {
                                                    parts.push(customName);
                                                  }

                                                  // Always include game (or "(game name not provided)" in red if blank)
                                                  if (hasGame) {
                                                    parts.push(game);
                                                  } else {
                                                    parts.push(
                                                      '(game name not provided)'
                                                    );
                                                  }

                                                  return (
                                                    <span>
                                                      {mainIdentifier} (
                                                      {parts.map(
                                                        (part, idx) => {
                                                          const isGameNotProvided =
                                                            part ===
                                                            '(game name not provided)';
                                                          return (
                                                            <span key={idx}>
                                                              {isGameNotProvided ? (
                                                                <span className="text-red-600">
                                                                  {part}
                                                                </span>
                                                              ) : (
                                                                part
                                                              )}
                                                              {idx <
                                                                parts.length -
                                                                  1 && ', '}
                                                            </span>
                                                          );
                                                        }
                                                      )}
                                                      )
                                                    </span>
                                                  );
                                                })()}
                                              </span>
                                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                            </button>
                                          ) : (
                                            <div className="font-mono text-sm text-gray-900">
                                              {machine.serialNumber ||
                                                machine.machineId}
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-3 text-sm">
                                          {machine.gameTitle ? (
                                            machine.gameTitle
                                          ) : (
                                            <span className="text-red-600">
                                              (game name not provided)
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-3 text-sm">
                                          {machine.manufacturer}
                                        </td>
                                        <td className="p-3 text-sm font-medium">
                                          $
                                          {(machine.drop || 0).toLocaleString()}
                                        </td>
                                        <td
                                          className={`p-3 text-sm font-medium ${
                                            (machine.netWin || 0) >= 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          $
                                          {(
                                            machine.netWin || 0
                                          ).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-sm">
                                          $
                                          {(
                                            machine.jackpot || 0
                                          ).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-sm">
                                          $
                                          {machine.avgBet
                                            ? machine.avgBet.toFixed(2)
                                            : '0.00'}
                                        </td>
                                        <td className="p-3 text-sm font-medium text-gray-600">
                                          {machine.actualHold != null &&
                                          !isNaN(machine.actualHold)
                                            ? machine.actualHold.toFixed(2) +
                                              '%'
                                            : 'N/A'}
                                        </td>
                                        <td className="p-3 text-sm text-gray-600">
                                          {machine.theoreticalHold != null &&
                                          !isNaN(machine.theoreticalHold)
                                            ? machine.theoreticalHold.toFixed(
                                                2
                                              ) + '%'
                                            : 'N/A'}
                                        </td>
                                        <td className="p-3 text-sm">
                                          {(
                                            machine.gamesPlayed || 0
                                          ).toLocaleString()}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Card View */}
                              <div className="space-y-4 md:hidden">
                                {topMachinesData.map((machine, index) => (
                                  <Card
                                    key={`${machine.machineId}-${index}`}
                                    className="p-4"
                                  >
                                    <div className="mb-3">
                                      <h4 className="text-sm font-medium">
                                        {machine.machineName}
                                      </h4>
                                      <p className="text-xs text-muted-foreground">
                                        {machine.locationName} •{' '}
                                        {machine.gameTitle ? (
                                          machine.gameTitle
                                        ) : (
                                          <span className="text-red-600">
                                            (game name not provided)
                                          </span>
                                        )}
                                      </p>
                                    </div>

                                    {/* Tiny screen layout (< 425px) - Single column */}
                                    <div className="block space-y-2 text-xs sm:hidden">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Manufacturer:
                                        </span>
                                        <span className="font-medium">
                                          {machine.manufacturer}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Money In:
                                        </span>
                                        <span className="font-medium">
                                          $
                                          {(machine.drop || 0).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Win/Loss:
                                        </span>
                                        <span
                                          className={`font-medium ${
                                            (machine.netWin || 0) >= 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          $
                                          {(
                                            machine.netWin || 0
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Avg. Wag. per Game:
                                        </span>
                                        <span className="font-medium">
                                          $
                                          {machine.avgBet
                                            ? machine.avgBet.toFixed(2)
                                            : '0.00'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Actual Hold:
                                        </span>
                                        <span className="font-medium text-gray-600">
                                          {machine.actualHold != null &&
                                          !isNaN(machine.actualHold)
                                            ? machine.actualHold.toFixed(2) +
                                              '%'
                                            : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Theoretical Hold:
                                        </span>
                                        <span className="font-medium text-gray-600">
                                          {machine.theoreticalHold != null &&
                                          !isNaN(machine.theoreticalHold)
                                            ? machine.theoreticalHold.toFixed(
                                                2
                                              ) + '%'
                                            : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                          Games Played:
                                        </span>
                                        <span className="font-medium">
                                          {(
                                            machine.gamesPlayed || 0
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Small screen layout (425px+) - Two columns */}
                                    <div className="hidden gap-4 text-sm sm:grid sm:grid-cols-2">
                                      <div>
                                        <span className="text-muted-foreground">
                                          Manufacturer:
                                        </span>
                                        <p>{machine.manufacturer}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Money In:
                                        </span>
                                        <p className="font-medium">
                                          $
                                          {(machine.drop || 0).toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Win/Loss:
                                        </span>
                                        <p
                                          className={`font-medium ${
                                            (machine.netWin || 0) >= 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          $
                                          {(
                                            machine.netWin || 0
                                          ).toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Avg. Wag. per Game:
                                        </span>
                                        <p>
                                          $
                                          {machine.avgBet
                                            ? machine.avgBet.toFixed(2)
                                            : '0.00'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Actual Hold:
                                        </span>
                                        <p className="font-medium text-gray-600">
                                          {machine.actualHold != null &&
                                          !isNaN(machine.actualHold)
                                            ? machine.actualHold.toFixed(2) +
                                              '%'
                                            : 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          Theoretical Hold:
                                        </span>
                                        <p className="text-gray-600">
                                          {machine.theoreticalHold != null &&
                                          !isNaN(machine.theoreticalHold)
                                            ? machine.theoreticalHold.toFixed(
                                                2
                                              ) + '%'
                                            : 'N/A'}
                                        </p>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">
                                          Games Played:
                                        </span>
                                        <p>
                                          {(
                                            machine.gamesPlayed || 0
                                          ).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </>
                          );
                        }

                        // Show message if locations selected but no data
                        return (
                          <div className="py-8 text-center text-muted-foreground">
                            No machine data available for evaluation
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="mb-2 text-lg text-gray-500">
                      No Data to Display
                    </div>
                    <div className="text-sm text-gray-400">
                      Please select up to 3 locations to view revenue analysis
                      data
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
