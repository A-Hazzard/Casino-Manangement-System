'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useReportsStore } from '@/lib/store/reportsStore';
import { useDebounce } from '@/lib/utils/hooks';
import axios from 'axios';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  handleExportMeters as handleExportMetersHelper,
  sortEvaluationData as sortEvaluationDataHelper,
} from '@/lib/helpers/reportsPage';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { getLicenseeName } from '@/lib/utils/licenseeMapping';

import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import { GamesPerformanceChart } from '@/components/ui/GamesPerformanceChart';
import { GamesPerformanceRevenueChart } from '@/components/ui/GamesPerformanceRevenueChart';
import { MachineEvaluationSummary } from '@/components/ui/MachineEvaluationSummary';
import { ManufacturerPerformanceChart } from '@/components/ui/ManufacturerPerformanceChart';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  ChartNoData,
  ChartSkeleton,
  MachinesEvaluationSkeleton,
  MachinesOfflineSkeleton,
  MachinesOverviewSkeleton,
} from '@/components/ui/skeletons/ReportsSkeletons';
import type { TopMachinesCriteria } from '@/components/ui/TopMachinesCriteriaSelector';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import type { MachineEvaluationData } from '@/lib/types';
import type {
  MachineData,
  MachinesApiResponse,
  MachineStats,
  MachineStatsApiResponse,
} from '@/shared/types/machines';
import { Pencil2Icon } from '@radix-ui/react-icons';
import { ExternalLink, Trash2 } from 'lucide-react';

import StatusIcon from '@/components/ui/common/StatusIcon';
import { useLocationMachineStats } from '@/lib/hooks/data';
import { useUserStore } from '@/lib/store/userStore';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financialColors';

// Sortable table header component for Top Machines
const SortableTopMachinesHeader = ({
  children,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: TopMachinesCriteria;
  currentSortKey: TopMachinesCriteria;
  currentSortDirection: 'asc' | 'desc';
  onSort: (key: TopMachinesCriteria) => void;
}) => {
  const isActive = currentSortKey === sortKey;

  return (
    <th
      className="cursor-pointer select-none p-3 text-left font-medium text-gray-700 transition-colors hover:bg-gray-100"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-start gap-1">
        {children}
        {isActive ? (
          currentSortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <div className="h-4 w-4 opacity-30">
            <ChevronUp className="h-4 w-4" />
          </div>
        )}
      </div>
    </th>
  );
};

// Sortable table header component
const SortableHeader = ({
  children,
  sortKey,
  currentSort,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: keyof MachineData | 'offlineDurationHours';
  currentSort: {
    key: keyof MachineData | 'offlineDurationHours';
    direction: 'asc' | 'desc';
  };
  onSort: (key: keyof MachineData | 'offlineDurationHours') => void;
}) => {
  const isActive = currentSort.key === sortKey;

  return (
    <th
      className="cursor-pointer select-none p-3 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          currentSort.direction === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <div className="h-4 w-4 opacity-30">
            <ChevronUp className="h-4 w-4" />
          </div>
        )}
      </div>
    </th>
  );
};

export default function MachinesTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formatAmount, shouldShowCurrency, displayCurrency } =
    useCurrencyFormat();
  const { user } = useUserStore();

  // Check if user can edit/delete machines (admin, technician, developer)
  const canEditMachines = useMemo(() => {
    if (!user?.roles) return false;
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
    return (
      roles.includes('admin') ||
      roles.includes('technician') ||
      roles.includes('developer')
    );
  }, [user?.roles]);

  // AbortController for different query types
  const makeStatsRequest = useAbortableRequest();
  const makeOverviewRequest = useAbortableRequest();
  const makeOfflineRequest = useAbortableRequest();
  const makeEvaluationRequest = useAbortableRequest();

  // Separate states for different purposes (streaming approach)
  const [allOverviewMachines, setAllOverviewMachines] = useState<MachineData[]>(
    []
  ); // All loaded machines for overview
  const [allMachines, setAllMachines] = useState<MachineData[]>([]); // All machines for performance analysis
  const [allOfflineMachines, setAllOfflineMachines] = useState<MachineData[]>(
    []
  ); // All offline machines loaded
  const [accumulatedOfflineMachines, setAccumulatedOfflineMachines] = useState<
    MachineData[]
  >([]); // Accumulated offline machines for frontend filtering
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null); // Counts for dashboard cards

  // Get machine stats from dedicated API (for accurate offline count)
  // Uses the same query as the locations page machine status
  // No locationId specified = all locations, no machineTypeFilter = all machine types
  // Pass null instead of undefined to match locations page pattern
  const {
    machineStats: locationMachineStats,
    machineStatsLoading: locationMachineStatsLoading,
    refreshMachineStats: refreshLocationMachineStats,
  } = useLocationMachineStats(undefined, null);

  // Manufacturer performance data
  const [manufacturerData, setManufacturerData] = useState<
    Array<{
      manufacturer: string;
      floorPositions: number;
      totalHandle: number;
      totalWin: number;
      totalDrop: number;
      totalCancelledCredits: number;
      totalGross: number;
      totalGamesPlayed: number;
    }>
  >([]);

  // Games performance data
  const [gamesData, setGamesData] = useState<
    Array<{
      gameName: string;
      floorPositions: number;
      totalHandle: number;
      totalWin: number;
      totalDrop: number;
      totalCancelledCredits: number;
      totalGross: number;
      totalGamesPlayed: number;
    }>
  >([]);

  // Summary calculations (now calculated in useMemo, no state needed)
  const [locations, setLocations] = useState<
    { id: string; name: string; sasEnabled: boolean }[]
  >([]);

  // Loading states for each section
  const [statsLoading, setStatsLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [offlineLoading, setOfflineLoading] = useState(false);
  // Removed offlineInitialLoad - no longer needed with simplified loading logic
  const [evaluationLoading, setEvaluationLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Batch-based pagination for overview tab
  const [overviewCurrentPage, setOverviewCurrentPage] = useState(0);
  const [overviewLoadedBatches, setOverviewLoadedBatches] = useState<
    Set<number>
  >(new Set([1]));
  const overviewItemsPerPage = 10;
  const overviewItemsPerBatch = 50;
  const overviewPagesPerBatch = overviewItemsPerBatch / overviewItemsPerPage; // 5

  // Sorting state for machine overview table
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MachineData | 'offlineDurationHours';
    direction: 'asc' | 'desc';
  }>({
    key: 'netWin',
    direction: 'desc',
  });

  // Top Machines sorting state (ME3-1.0 to ME3-1.4)
  const [topMachinesSortKey, setTopMachinesSortKey] =
    useState<TopMachinesCriteria>('netWin');
  const [topMachinesSortDirection, setTopMachinesSortDirection] = useState<
    'asc' | 'desc'
  >('desc');

  // Batch-based pagination for offline machines tab
  const [offlineCurrentPage, setOfflineCurrentPage] = useState(0);
  const [offlineLoadedBatches, setOfflineLoadedBatches] = useState<Set<number>>(
    new Set([1])
  );
  const offlineItemsPerPage = 10;
  const offlineItemsPerBatch = 50;
  const offlinePagesPerBatch = offlineItemsPerBatch / offlineItemsPerPage; // 5

  // Calculate which batch we need based on current page for overview
  const calculateOverviewBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / overviewPagesPerBatch) + 1;
    },
    [overviewPagesPerBatch]
  );

  // Calculate which batch we need based on current page for offline
  const calculateOfflineBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / offlinePagesPerBatch) + 1;
    },
    [offlinePagesPerBatch]
  );

  // Sorting function for machine overview table
  const handleSort = (key: keyof MachineData | 'offlineDurationHours') => {
    setSortConfig(prevConfig => {
      const newDirection: 'asc' | 'desc' =
        prevConfig.key === key && prevConfig.direction === 'desc'
          ? 'asc'
          : 'desc';
      return {
        key: key as keyof MachineData | 'offlineDurationHours',
        direction: newDirection,
      };
    });
  };

  // Sort function for evaluation data (different structure)
  const sortEvaluationData = (machines: typeof evaluationData) => {
    return sortEvaluationDataHelper(machines, sortConfig);
  };

  // Handle Top Machines header click for sorting (ME3-1.0 to ME3-1.4)
  const handleTopMachinesSort = useCallback(
    (criteria: TopMachinesCriteria) => {
      if (topMachinesSortKey === criteria) {
        // Toggle sort direction if same header clicked (ME3-1.2)
        setTopMachinesSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        // Switch to new criteria, default to descending (ME3-1.1)
        setTopMachinesSortKey(criteria);
        setTopMachinesSortDirection('desc');
      }
    },
    [topMachinesSortKey]
  );

  // Sort Top Machines by selected criteria
  const sortTopMachines = useCallback(
    (machines: typeof evaluationData) => {
      const sorted = [...machines].sort((a, b) => {
        let aValue: number | string = 0;
        let bValue: number | string = 0;

        switch (topMachinesSortKey) {
          case 'locationName':
            aValue = (a.locationName || '').toLowerCase();
            bValue = (b.locationName || '').toLowerCase();
            break;
          case 'machineId':
            aValue = (a.machineId || '').toLowerCase();
            bValue = (b.machineId || '').toLowerCase();
            break;
          case 'gameTitle':
            aValue = (a.gameTitle || '').toLowerCase();
            bValue = (b.gameTitle || '').toLowerCase();
            break;
          case 'manufacturer':
            aValue = (a.manufacturer || '').toLowerCase();
            bValue = (b.manufacturer || '').toLowerCase();
            break;
          case 'coinIn':
            aValue = a.coinIn || 0;
            bValue = b.coinIn || 0;
            break;
          case 'netWin':
            aValue = a.netWin || 0;
            bValue = b.netWin || 0;
            break;
          case 'gross':
            aValue = a.gross || 0;
            bValue = b.gross || 0;
            break;
          case 'gamesPlayed':
            aValue = a.gamesPlayed || 0;
            bValue = b.gamesPlayed || 0;
            break;
          case 'actualHold':
            aValue = a.actualHold || 0;
            bValue = b.actualHold || 0;
            break;
          case 'theoreticalHold':
            aValue = a.theoreticalHold || 0;
            bValue = b.theoreticalHold || 0;
            break;
          case 'averageWager':
            // Calc. 1: Average Wager = handle / gamesPlayed (already calculated in evaluationData)
            aValue = a.averageWager || 0;
            bValue = b.averageWager || 0;
            break;
          case 'jackpot':
            aValue = a.jackpot || 0;
            bValue = b.jackpot || 0;
            break;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return topMachinesSortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (topMachinesSortDirection === 'asc') {
          return (aValue as number) - (bValue as number);
        } else {
          return (bValue as number) - (aValue as number);
        }
      });

      return sorted;
    },
    [topMachinesSortKey, topMachinesSortDirection]
  );

  // Store and filter states
  const { selectedDateRange, setLoading } = useReportsStore();
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();
  const licenseeName =
    getLicenseeName(selectedLicencee) || selectedLicencee || 'any licensee';
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  // Search states for different tabs
  const [searchTerm, setSearchTerm] = useState('');
  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [offlineSearchTerm, setOfflineSearchTerm] = useState('');

  const [onlineStatusFilter, setOnlineStatusFilter] = useState('all'); // New filter for online/offline

  const [activeTab, setActiveTab] = useState('overview');

  // Location selection states for each tab (single location selection)
  const [overviewSelectedLocation, setOverviewSelectedLocation] =
    useState<string>('all');

  const [evaluationSelectedLocation, setEvaluationSelectedLocation] =
    useState<string>('all');
  const [offlineSelectedLocation, setOfflineSelectedLocation] =
    useState<string>('all');

  // Fetch locations data with SAS information
  const fetchLocationsData = useCallback(async () => {
    try {
      const params: Record<string, string> = {
        summary: 'true', // Use summary mode to get sasMachines count
      };
      if (selectedLicencee && selectedLicencee !== 'all') {
        params.licensee = selectedLicencee;
      }

      const response = await axios.get('/api/reports/locations', { params });

      const locationsData = response.data.data || [];
      const mappedLocations = locationsData.map(
        (loc: Record<string, unknown>) => ({
          id: loc.location || loc._id,
          name: loc.locationName || loc.name,
          sasEnabled: (loc.sasMachines as number) > 0, // Use sasMachines count like locations tab
        })
      );

      setLocations(mappedLocations);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      const errorMessage =
        (
          (
            (error as Record<string, unknown>).response as Record<
              string,
              unknown
            >
          )?.data as Record<string, unknown>
        )?.error ||
        (error as Record<string, unknown>).message ||
        'Failed to load locations';
      toast.error(errorMessage as string, {
        duration: 3000,
      });
      // Set empty locations array to prevent further errors
      setLocations([]);
    }
  }, [selectedLicencee]);

  // Fetch machine statistics (loads first)
  const fetchMachineStats = useCallback(async () => {
    setStatsLoading(true);
    const params: Record<string, string> = {
      type: 'stats',
      timePeriod: activeMetricsFilter || 'Today',
    };

    if (selectedLicencee && selectedLicencee !== 'all') {
      params.licencee = selectedLicencee;
    }

    if (selectedDateRange?.start && selectedDateRange?.end) {
      params.startDate = selectedDateRange.start.toISOString();
      params.endDate = selectedDateRange.end.toISOString();
    }

    if (onlineStatusFilter !== 'all') {
      params.onlineStatus = onlineStatusFilter;
    }

    // Add currency parameter
    if (displayCurrency) {
      params.currency = displayCurrency;
    }

    try {
      const result = await makeStatsRequest(async signal => {
        const response = await axios.get<MachineStatsApiResponse>(
          '/api/reports/machines',
          { params, signal }
        );
        return response.data;
      });

      // Only set stats and clear loading if request completed successfully (not canceled)
      // useAbortableRequest returns null for canceled requests
      if (result !== null) {
        setMachineStats(result);
        setStatsLoading(false);
      }
      // If result is null (canceled), keep showing skeleton until next request completes
      // Don't clear loading state so skeleton continues showing
    } catch (error) {
      // Check if request was canceled - silently ignore canceled requests
      if (axios.isCancel(error)) {
        // Keep loading state true so skeleton continues showing
        return;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        // Keep loading state true so skeleton continues showing
        return;
      }
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED')
      ) {
        // Keep loading state true so skeleton continues showing
        return;
      }
      if (
        error instanceof Error &&
        (error.message === 'canceled' ||
          error.message === 'The user aborted a request.')
      ) {
        // Keep loading state true so skeleton continues showing
        return;
      }

      // Only log and show errors for actual failures
      console.error('Failed to fetch machine stats:', error);
      setError('Failed to load machine statistics');
      toast.error('Failed to load machine statistics', {
        duration: 3000,
      });
      setStatsLoading(false);
    }
  }, [
    selectedLicencee,
    selectedDateRange?.start,
    selectedDateRange?.end,
    onlineStatusFilter,
    activeMetricsFilter,
    displayCurrency,
    makeStatsRequest,
  ]);

  // Fetch overview machines (paginated)
  const fetchOverviewMachines = useCallback(
    async (page: number = 1, search: string = '') => {
      setOverviewLoading(true);
      setLoading(true);
      setError(null);

      try {
        await makeOverviewRequest(async signal => {
          const params: Record<string, string> = {
            type: 'overview',
            page: page.toString(),
            limit: overviewItemsPerBatch.toString(),
            timePeriod: activeMetricsFilter || 'Today',
          };

          if (selectedLicencee && selectedLicencee !== 'all') {
            params.licencee = selectedLicencee;
          }

          if (overviewSelectedLocation && overviewSelectedLocation !== 'all') {
            params.locationId = overviewSelectedLocation;
          }

          if (selectedDateRange?.start && selectedDateRange?.end) {
            params.startDate = selectedDateRange.start.toISOString();
            params.endDate = selectedDateRange.end.toISOString();
          }

          if (onlineStatusFilter !== 'all') {
            params.onlineStatus = onlineStatusFilter;
          }

          if (search && search.trim()) {
            params.search = search.trim();
          }

          if (displayCurrency) {
            params.currency = displayCurrency;
          }

          const response = await axios.get<MachinesApiResponse>(
            '/api/reports/machines',
            { params, signal }
          );
          const { data: machinesData } = response.data;
          const newMachines = machinesData || [];

          setAllOverviewMachines(prev => {
            const existingIds = new Set(prev.map(m => m.machineId));
            const uniqueNewMachines = newMachines.filter(
              (m: MachineData) => !existingIds.has(m.machineId)
            );
            return [...prev, ...uniqueNewMachines];
          });
        });
      } catch (error) {
        // Check if request was canceled - silently ignore canceled requests
        // useAbortableRequest should handle cancellations, but catch here as safety
        if (axios.isCancel(error)) {
          return; // Request was cancelled, don't show error
        }
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Request was aborted, don't show error
        }
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED')
        ) {
          return; // Request was canceled, don't show error
        }
        if (
          error instanceof Error &&
          (error.message === 'canceled' ||
            error.message === 'The user aborted a request.')
        ) {
          return; // Request was canceled, don't show error
        }

        // Only log and show errors for actual failures
        console.error('Failed to fetch overview machines:', error);
        setError('Failed to load overview machines');
        toast.error('Failed to load overview machines', {
          duration: 3000,
        });
      } finally {
        // Always clear loading states, even if request was canceled
        setOverviewLoading(false);
        setLoading(false);
      }
    },
    [
      selectedLicencee,
      selectedDateRange?.start,
      selectedDateRange?.end,
      onlineStatusFilter,
      overviewSelectedLocation,
      activeMetricsFilter,
      displayCurrency,
      overviewItemsPerBatch,
      setLoading,
      makeOverviewRequest,
    ]
  );

  // Fetch all machines for performance analysis (loads on tab switch)
  const fetchAllMachines = useCallback(async () => {
    setLoading(true);

    await makeEvaluationRequest(async signal => {
      const params: Record<string, string> = {
        type: 'all',
        timePeriod: activeMetricsFilter || 'Today',
      };

      if (selectedLicencee && selectedLicencee !== 'all') {
        params.licencee = selectedLicencee;
      }

      if (
        activeTab === 'evaluation' &&
        evaluationSelectedLocation &&
        evaluationSelectedLocation !== 'all' &&
        evaluationSelectedLocation !== ''
      ) {
        params.locationId = evaluationSelectedLocation;
      }

      if (selectedDateRange?.start && selectedDateRange?.end) {
        params.startDate = selectedDateRange.start.toISOString();
        params.endDate = selectedDateRange.end.toISOString();
      }

      if (onlineStatusFilter !== 'all') {
        params.onlineStatus = onlineStatusFilter;
      }

      if (displayCurrency) {
        params.currency = displayCurrency;
      }

      try {
        const response = await axios.get<MachinesApiResponse>(
          '/api/reports/machines',
          { params, signal }
        );
        const { data: allMachinesData } = response.data;
        setAllMachines(allMachinesData);
      } catch (error) {
        // Silently ignore cancellation errors
        if (
          axios.isCancel(error) ||
          (error instanceof Error &&
            (error.name === 'AbortError' ||
              error.message === 'canceled' ||
              (error as { code?: string }).code === 'ERR_CANCELED'))
        ) {
          return;
        }
        console.error('Failed to fetch all machines:', error);
        toast.error('Failed to load performance analysis data', {
          duration: 3000,
        });
      }
    });

    setLoading(false);
  }, [
    selectedLicencee,
    selectedDateRange?.start,
    selectedDateRange?.end,
    onlineStatusFilter,
    activeTab,
    evaluationSelectedLocation,
    activeMetricsFilter,
    displayCurrency,
    setLoading,
    makeEvaluationRequest,
  ]);

  // Fetch offline machines (batch-based, loads on tab switch)
  const fetchOfflineMachines = useCallback(
    async (batch: number = 1, search?: string) => {
      setOfflineLoading(true);
      setLoading(true);

      const result = await makeOfflineRequest(async signal => {
        const params: Record<string, string> = {
          type: 'offline',
          timePeriod: activeMetricsFilter || 'Today',
          page: batch.toString(),
          limit: offlineItemsPerBatch.toString(),
        };

        if (selectedLicencee && selectedLicencee !== 'all') {
          params.licencee = selectedLicencee;
        }

        if (offlineSelectedLocation && offlineSelectedLocation !== 'all') {
          params.locationId = offlineSelectedLocation;
        }

        if (selectedDateRange?.start && selectedDateRange?.end) {
          params.startDate = selectedDateRange.start.toISOString();
          params.endDate = selectedDateRange.end.toISOString();
        }

        // Add search parameter if provided (for backend search)
        if (search && search.trim()) {
          params.search = search.trim();
        }

        console.warn(
          `🔍 Fetching offline machines with params: ${JSON.stringify(params)}`
        );

        try {
          const response = await axios.get<MachinesApiResponse>(
            '/api/reports/machines',
            { params, signal }
          );
          const { data: offlineMachinesData } = response.data;
          const newOfflineMachines = offlineMachinesData || [];

          // If this is a search query, replace all machines (backend search)
          // Otherwise, accumulate machines (batch loading)
          if (search && search.trim()) {
            setAllOfflineMachines(newOfflineMachines);
          } else {
            setAllOfflineMachines(prev => {
              const existingIds = new Set(prev.map(m => m.machineId));
              const uniqueNewMachines = newOfflineMachines.filter(
                (m: MachineData) => !existingIds.has(m.machineId)
              );
              return [...prev, ...uniqueNewMachines];
            });
          }
        } catch (error) {
          // Silently ignore cancellation errors
          if (
            axios.isCancel(error) ||
            (error instanceof Error &&
              (error.name === 'AbortError' ||
                error.message === 'canceled' ||
                (error as { code?: string }).code === 'ERR_CANCELED'))
          ) {
            return;
          }
          console.error('Failed to fetch offline machines:', error);
          toast.error('Failed to load offline machines data', {
            duration: 3000,
          });
        }
      });

      // Only clear loading state if request completed successfully (not canceled)
      if (result !== null) {
        setOfflineLoading(false);
        setLoading(false);
        // Mark initial load as complete after first successful fetch
        // Initial load complete
      }
      // If result is null (canceled), keep showing skeleton until next request completes
      // Don't clear loading state so skeleton continues showing
    },
    [
      selectedLicencee,
      selectedDateRange?.start,
      selectedDateRange?.end,
      offlineSelectedLocation,
      activeMetricsFilter,
      offlineItemsPerBatch,
      setLoading,
      makeOfflineRequest,
    ]
  );

  // Handle search with backend fallback for overview tab
  // Note: The actual API call is triggered by debouncedSearchTerm in useEffect
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setAllOverviewMachines([]);
    setOverviewLoadedBatches(new Set([1]));
    setOverviewCurrentPage(0);
  }, []);

  // Handle evaluation search change

  // Handle offline search change
  const handleOfflineSearchChange = useCallback(
    (value: string) => {
      setOfflineSearchTerm(value);
      // Reset page when search changes
      setOfflineCurrentPage(0);
      // Reset accumulated machines when search changes (will be rebuilt from allOfflineMachines)
      if (!value.trim()) {
        // If search is cleared, rebuild accumulated from allOfflineMachines
        setAccumulatedOfflineMachines(allOfflineMachines);
      }
    },
    [allOfflineMachines]
  );

  // Load initial batch for overview on mount and when filters change
  // Use debouncedSearchTerm to avoid API calls on every keystroke
  useEffect(() => {
    if (activeTab === 'overview') {
      // Clear data and set loading state FIRST to ensure skeleton shows
      // Must be synchronous to prevent flash of "no data" message
      setAllOverviewMachines([]);
      setOverviewLoadedBatches(new Set([1]));
      setOverviewCurrentPage(0);
      // Ensure loading state is set synchronously before any async operations
      setOverviewLoading(true);
      setLoading(true);

      // Fetch data immediately - no delay needed as state is already set
      fetchOverviewMachines(1, debouncedSearchTerm);
    } else {
      // Clear loading state when switching away from overview tab
      setOverviewLoading(false);
    }
  }, [
    activeTab,
    selectedLicencee,
    selectedDateRange?.start,
    setAllOverviewMachines,
    setOverviewLoadedBatches,
    setOverviewCurrentPage,
    fetchOverviewMachines,
    debouncedSearchTerm,
    selectedDateRange?.end,
    onlineStatusFilter,
    overviewSelectedLocation,
    activeMetricsFilter,
    displayCurrency,
    setLoading,
  ]);

  // Fetch next batch for overview when crossing batch boundaries
  useEffect(() => {
    if (activeTab !== 'overview' || overviewLoading) return;

    const currentBatch = calculateOverviewBatchNumber(overviewCurrentPage);
    const isLastPageOfBatch =
      (overviewCurrentPage + 1) % overviewPagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !overviewLoadedBatches.has(nextBatch)) {
      setOverviewLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchOverviewMachines(nextBatch, searchTerm);
    }

    // Also ensure current batch is loaded
    if (!overviewLoadedBatches.has(currentBatch)) {
      setOverviewLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchOverviewMachines(currentBatch, searchTerm);
    }
  }, [
    activeTab,
    overviewCurrentPage,
    overviewLoading,
    fetchOverviewMachines,
    overviewItemsPerBatch,
    overviewPagesPerBatch,
    overviewLoadedBatches,
    calculateOverviewBatchNumber,
    searchTerm,
  ]);

  // Load initial batch for offline on mount and when filters change
  useEffect(() => {
    if (activeTab === 'offline') {
      // Clear data and set loading state FIRST to ensure skeleton shows
      setAllOfflineMachines([]);
      setAccumulatedOfflineMachines([]);
      setOfflineLoadedBatches(new Set([1]));
      setOfflineCurrentPage(0);
      // Filters changed - will trigger new fetch
      setOfflineLoading(true);
      setLoading(true);
      // Use setTimeout to ensure state updates are applied before fetch
      setTimeout(() => {
        fetchOfflineMachines(1);
      }, 0);
    } else {
      // Clear loading state when switching away from offline tab
      setOfflineLoading(false);
    }
  }, [
    activeTab,
    selectedLicencee,
    selectedDateRange?.start,
    selectedDateRange?.end,
    offlineSelectedLocation,
    activeMetricsFilter,
    setAllOfflineMachines,
    setOfflineLoadedBatches,
    setOfflineCurrentPage,
    fetchOfflineMachines,
    setLoading,
  ]);

  // Update accumulated offline machines when new data arrives (only when not searching)
  useEffect(() => {
    // Only update accumulated when not searching (batch loading)
    if (!offlineSearchTerm.trim() && allOfflineMachines.length > 0) {
      setAccumulatedOfflineMachines(allOfflineMachines);
    }
  }, [allOfflineMachines, offlineSearchTerm]);

  // Fetch next batch for offline when crossing batch boundaries
  useEffect(() => {
    if (activeTab !== 'offline' || offlineLoading || offlineSearchTerm.trim())
      return; // Skip batch loading when searching

    const currentBatch = calculateOfflineBatchNumber(offlineCurrentPage);
    const isLastPageOfBatch =
      (offlineCurrentPage + 1) % offlinePagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !offlineLoadedBatches.has(nextBatch)) {
      setOfflineLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchOfflineMachines(nextBatch);
    }

    // Also ensure current batch is loaded
    if (!offlineLoadedBatches.has(currentBatch)) {
      setOfflineLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchOfflineMachines(currentBatch);
    }
  }, [
    activeTab,
    offlineCurrentPage,
    offlineLoading,
    fetchOfflineMachines,
    offlineItemsPerBatch,
    offlinePagesPerBatch,
    offlineLoadedBatches,
    calculateOfflineBatchNumber,
    offlineSearchTerm,
  ]);

  const handleExportMeters = async (format: 'pdf' | 'excel') => {
    await handleExportMetersHelper(
      activeTab,
      allOverviewMachines,
      allOfflineMachines,
      activeMetricsFilter,
      customDateRange,
      format,
      toast
    );
  };

  // Filter offline data based on search
  // Get items for current page from overview machines
  const paginatedOverviewMachines = useMemo(() => {
    const positionInBatch =
      (overviewCurrentPage % overviewPagesPerBatch) * overviewItemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + overviewItemsPerPage;
    return allOverviewMachines.slice(startIndex, endIndex);
  }, [
    allOverviewMachines,
    overviewCurrentPage,
    overviewItemsPerPage,
    overviewPagesPerBatch,
  ]);

  // Calculate total pages for overview based on all loaded batches
  const overviewTotalPages = useMemo(() => {
    const totalItems = allOverviewMachines.length;
    const totalPagesFromItems = Math.ceil(totalItems / overviewItemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [allOverviewMachines.length, overviewItemsPerPage]);

  // Frontend filter: First try to filter from accumulated offline machines
  const frontendFilteredOfflineMachines = useMemo(() => {
    if (!offlineSearchTerm.trim()) {
      return accumulatedOfflineMachines;
    }

    const searchLower = offlineSearchTerm.toLowerCase().trim();
    return accumulatedOfflineMachines.filter(machine => {
      const serialNumber = (machine.serialNumber || '').toLowerCase();
      const customName = (machine.customName || '').toLowerCase();
      const gameTitle = (machine.gameTitle || '').toLowerCase();
      const machineName = (machine.machineName || '').toLowerCase();
      return (
        serialNumber.includes(searchLower) ||
        customName.includes(searchLower) ||
        gameTitle.includes(searchLower) ||
        machineName.includes(searchLower)
      );
    });
  }, [accumulatedOfflineMachines, offlineSearchTerm]);

  // Determine if we need backend search:
  // - If frontend filter has results, use those
  // - If frontend filter has no results AND search term is not empty, trigger backend search
  const shouldUseBackendSearchOffline = useMemo(() => {
    if (!offlineSearchTerm.trim()) {
      return false;
    }
    // If frontend filter found results, don't use backend
    if (frontendFilteredOfflineMachines.length > 0) {
      return false;
    }
    // Only use backend if frontend found nothing
    return true;
  }, [offlineSearchTerm, frontendFilteredOfflineMachines.length]);

  // Use frontend filtered machines if available, otherwise use backend search results
  const offlineMachinesForPagination = shouldUseBackendSearchOffline
    ? allOfflineMachines
    : frontendFilteredOfflineMachines;

  // Filter offline data based on location
  const filteredOfflineData = useMemo(() => {
    const filtered = offlineMachinesForPagination.filter(machine => {
      const matchesLocation =
        offlineSelectedLocation === 'all' ||
        offlineSelectedLocation === machine.locationId;

      return matchesLocation;
    });

    return filtered;
  }, [offlineMachinesForPagination, offlineSelectedLocation]);

  // Trigger backend search only if frontend filter found no results
  useEffect(() => {
    if (shouldUseBackendSearchOffline) {
      // Use debounced search term for backend query
      const timeoutId = setTimeout(() => {
        fetchOfflineMachines(1, offlineSearchTerm);
      }, 500); // Debounce backend search
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [shouldUseBackendSearchOffline, offlineSearchTerm, fetchOfflineMachines]);

  // Get items for current page from filtered offline machines (paginate after filtering)
  const paginatedOfflineMachines = useMemo(() => {
    const positionInBatch =
      (offlineCurrentPage % offlinePagesPerBatch) * offlineItemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + offlineItemsPerPage;
    return filteredOfflineData.slice(startIndex, endIndex);
  }, [
    filteredOfflineData,
    offlineCurrentPage,
    offlineItemsPerPage,
    offlinePagesPerBatch,
  ]);

  // Calculate total pages for offline based on filtered data
  const offlineTotalPages = useMemo(() => {
    const totalItems = filteredOfflineData.length;
    const totalPagesFromItems = Math.ceil(totalItems / offlineItemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [filteredOfflineData.length, offlineItemsPerPage]);

  // Helper functions for performance analysis
  const getPerformanceRating = (holdDifference: number) => {
    if (holdDifference >= 1) return 'excellent';
    if (holdDifference >= 0) return 'good';
    if (holdDifference >= -1) return 'average';
    return 'poor';
  };

  const formatOfflineDuration = (hours: number) => {
    if (hours === 0) return 'Less than 1 hour';
    if (hours < 24) {
      const wholeHours = Math.floor(hours);
      const minutes = Math.floor((hours - wholeHours) * 60);
      if (minutes === 0)
        return `${wholeHours} hour${wholeHours > 1 ? 's' : ''}`;
      return `${wholeHours} hour${wholeHours > 1 ? 's' : ''} ${minutes} minute${
        minutes > 1 ? 's' : ''
      }`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    const wholeRemainingHours = Math.floor(remainingHours);
    const minutes = Math.floor((remainingHours - wholeRemainingHours) * 60);

    if (wholeRemainingHours === 0 && minutes === 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${days} day${days > 1 ? 's' : ''} ${wholeRemainingHours} hour${
        wholeRemainingHours > 1 ? 's' : ''
      }`;
    } else {
      return `${days} day${days > 1 ? 's' : ''} ${wholeRemainingHours} hour${
        wholeRemainingHours > 1 ? 's' : ''
      } ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  };

  // Real evaluation data from allMachines
  const evaluationData = useMemo((): MachineEvaluationData[] => {
    return allMachines.map(machine => {
      const theoreticalHold = machine.theoreticalHold || 0;
      const actualHold = machine.actualHold || 0;
      const holdDifference = actualHold - theoreticalHold;

      return {
        machineId: machine.machineId,
        serialNumber:
          (typeof (machine as Record<string, unknown>).serialNumber ===
            'string' &&
            (
              (machine as Record<string, unknown>).serialNumber as string
            ).trim()) ||
          (typeof (machine as Record<string, unknown>).origSerialNumber ===
            'string' &&
            (
              (machine as Record<string, unknown>).origSerialNumber as string
            ).trim()) ||
          (typeof (machine as Record<string, unknown>).custom === 'object' &&
            typeof (
              (machine as Record<string, unknown>).custom as Record<
                string,
                unknown
              >
            )?.name === 'string' &&
            (
              (
                (machine as Record<string, unknown>).custom as Record<
                  string,
                  unknown
                >
              ).name as string
            ).trim()) ||
          machine.machineId,
        machineName: machine.machineName,
        locationName: machine.locationName,
        locationId: machine.locationId,
        manufacturer: machine.manufacturer,
        gameTitle: machine.gameTitle,
        theoreticalHold,
        actualHold,
        holdDifference,
        performanceRating: getPerformanceRating(holdDifference),
        netWin: machine.netWin || 0,
        gross: machine.gross || 0,
        drop: machine.drop || 0,
        coinIn: machine.coinIn || 0,
        gamesPlayed: machine.gamesPlayed || 0,
        avgBet: machine.avgBet || 0,
        cancelledCredits: machine.totalCancelledCredits || 0,
        jackpot: machine.jackpot || 0, // Added for Top Machines table (ME3-2.5)
        averageWager:
          machine.gamesPlayed && machine.gamesPlayed > 0
            ? (machine.coinIn || 0) / machine.gamesPlayed
            : 0, // Calc. 1: Average Wager = handle / gamesPlayed (ME3-2.3)
      };
    });
  }, [allMachines]);

  // Filter evaluation data based on location selection
  const filteredEvaluationData = useMemo(() => {
    return evaluationData.filter(machine => {
      const matchesLocation =
        evaluationSelectedLocation === 'all' ||
        evaluationSelectedLocation === machine.locationId;

      return matchesLocation;
    });
  }, [evaluationData, evaluationSelectedLocation]);

  // Process data for charts (based on Angular logic)
  const processedManufacturerData = useMemo(() => {
    if (!filteredEvaluationData.length) return [];

    // Get all machines for the selected location (not filtered by search)
    const locationMachines = evaluationData.filter(
      machine =>
        evaluationSelectedLocation === 'all' ||
        evaluationSelectedLocation === machine.locationId
    );

    // Group by manufacturer using ALL location machines (not filtered by search)
    // Filter out machines without manufacturer data
    const groupByManufacturer = locationMachines
      .filter(
        machine => machine.manufacturer && machine.manufacturer.trim() !== ''
      )
      .reduce(
        (acc, machine) => {
          const manufacturer = machine.manufacturer.trim();
          if (!acc[manufacturer]) {
            acc[manufacturer] = [];
          }
          acc[manufacturer].push(machine);
          return acc;
        },
        {} as Record<string, typeof locationMachines>
      );

    // Calculate total metrics across all machines for percentage calculations
    const totalMetrics = locationMachines.reduce(
      (acc, machine) => ({
        coinIn: acc.coinIn + (machine.coinIn || 0),
        netWin: acc.netWin + (machine.netWin || 0),
        drop: acc.drop + (machine.drop || 0),
        gross: acc.gross + (machine.gross || 0),
        cancelledCredits: acc.cancelledCredits + 0, // cancelledCredits not available in current data structure
        gamesPlayed: acc.gamesPlayed + (machine.gamesPlayed || 0),
      }),
      {
        coinIn: 0,
        netWin: 0,
        drop: 0,
        gross: 0,
        cancelledCredits: 0,
        gamesPlayed: 0,
      }
    );

    const activeMachinesNumber = locationMachines.length;

    return Object.keys(groupByManufacturer).map(manufacturer => {
      const machines = groupByManufacturer[manufacturer];
      const floorPositions = (machines.length / activeMachinesNumber) * 100;

      const totals = machines.reduce(
        (
          acc: {
            coinIn: number;
            netWin: number;
            drop: number;
            gross: number;
            cancelledCredits: number;
            gamesPlayed: number;
          },
          machine: MachineEvaluationData
        ) => ({
          coinIn: acc.coinIn + (machine.coinIn || 0),
          netWin: acc.netWin + (machine.netWin || 0),
          drop: acc.drop + (machine.drop || 0),
          gross: acc.gross + (machine.gross || 0),
          cancelledCredits: acc.cancelledCredits + 0, // cancelledCredits not available in current data structure
          gamesPlayed: acc.gamesPlayed + (machine.gamesPlayed || 0),
        }),
        {
          coinIn: 0,
          netWin: 0,
          drop: 0,
          gross: 0,
          cancelledCredits: 0,
          gamesPlayed: 0,
        }
      );

      return {
        manufacturer,
        floorPositions,
        rawTotals: totals,
        totalMetrics, // Include total metrics for percentage calculations
        machineCount: machines.length, // Include machine count for verification
        totalMachinesCount: activeMachinesNumber, // Include total machines for floor positions calculation
      };
    });
  }, [filteredEvaluationData, evaluationData, evaluationSelectedLocation]);

  const processedGamesData = useMemo(() => {
    if (!filteredEvaluationData.length) return [];

    // Get all machines for the selected location (not filtered by search)
    const locationMachines = evaluationData.filter(
      machine =>
        evaluationSelectedLocation === 'all' ||
        evaluationSelectedLocation === machine.locationId
    );

    // Group by game name using ALL location machines (not filtered by search)
    // Filter out machines without game data
    const groupByGameName = locationMachines
      .filter(machine => machine.gameTitle && machine.gameTitle.trim() !== '')
      .reduce(
        (acc, machine) => {
          const gameName = machine.gameTitle.trim();
          if (!acc[gameName]) {
            acc[gameName] = [];
          }
          acc[gameName].push(machine);
          return acc;
        },
        {} as Record<string, typeof locationMachines>
      );

    // Calculate total metrics across machines WITH game data for percentage calculations
    const machinesWithGame = locationMachines.filter(
      machine => machine.gameTitle && machine.gameTitle.trim() !== ''
    );
    const totalMetrics = machinesWithGame.reduce(
      (acc, machine) => ({
        coinIn: acc.coinIn + (machine.coinIn || 0),
        netWin: acc.netWin + (machine.netWin || 0),
        drop: acc.drop + (machine.drop || 0),
        gross: acc.gross + (machine.gross || 0),
        cancelledCredits: acc.cancelledCredits + 0, // cancelledCredits not available in current data structure
        gamesPlayed: acc.gamesPlayed + (machine.gamesPlayed || 0),
      }),
      {
        coinIn: 0,
        netWin: 0,
        drop: 0,
        gross: 0,
        cancelledCredits: 0,
        gamesPlayed: 0,
      }
    );

    const activeMachinesNumber = machinesWithGame.length;

    return Object.keys(groupByGameName).map(gameName => {
      const machines = groupByGameName[gameName];
      const floorPositions = (machines.length / activeMachinesNumber) * 100;

      const totals = machines.reduce(
        (
          acc: {
            coinIn: number;
            netWin: number;
            drop: number;
            gross: number;
            cancelledCredits: number;
            gamesPlayed: number;
          },
          machine: MachineEvaluationData
        ) => ({
          coinIn: acc.coinIn + (machine.coinIn || 0),
          netWin: acc.netWin + (machine.netWin || 0),
          drop: acc.drop + (machine.drop || 0),
          gross: acc.gross + (machine.gross || 0),
          cancelledCredits: acc.cancelledCredits + 0, // cancelledCredits not available in current data structure
          gamesPlayed: acc.gamesPlayed + (machine.gamesPlayed || 0),
        }),
        {
          coinIn: 0,
          netWin: 0,
          drop: 0,
          gross: 0,
          cancelledCredits: 0,
          gamesPlayed: 0,
        }
      );

      return {
        gameName,
        floorPositions,
        rawTotals: totals,
        totalMetrics, // Include total metrics for percentage calculations
        machineCount: machines.length, // Include machine count for verification
        totalMachinesCount: activeMachinesNumber, // Include total machines for floor positions calculation
      };
    });
  }, [filteredEvaluationData, evaluationData, evaluationSelectedLocation]);

  // Calculate percentages for manufacturer data
  const manufacturerDataWithPercentages = useMemo(() => {
    if (!processedManufacturerData.length) return [];

    // Use the total metrics from the first item (all items have the same totalMetrics)
    const totalMetrics = processedManufacturerData[0]?.totalMetrics || {
      coinIn: 0,
      netWin: 0,
      drop: 0,
      gross: 0,
      cancelledCredits: 0,
      gamesPlayed: 0,
    };

    return processedManufacturerData.map(item => ({
      manufacturer: item.manufacturer,
      floorPositions: item.floorPositions,
      totalHandle:
        totalMetrics.coinIn > 0
          ? (item.rawTotals.coinIn / totalMetrics.coinIn) * 100
          : 0,
      totalWin:
        totalMetrics.netWin > 0
          ? (item.rawTotals.netWin / totalMetrics.netWin) * 100
          : 0,
      totalDrop:
        totalMetrics.drop > 0
          ? (item.rawTotals.drop / totalMetrics.drop) * 100
          : 0,
      totalCancelledCredits:
        totalMetrics.cancelledCredits > 0
          ? (item.rawTotals.cancelledCredits / totalMetrics.cancelledCredits) *
            100
          : 0,
      totalGross:
        totalMetrics.gross > 0
          ? (item.rawTotals.gross / totalMetrics.gross) * 100
          : 0,
      totalGamesPlayed:
        totalMetrics.gamesPlayed > 0
          ? (item.rawTotals.gamesPlayed / totalMetrics.gamesPlayed) * 100
          : 0,
      // Include raw values and totals for verification
      rawTotals: item.rawTotals,
      totalMetrics,
      machineCount: item.machineCount || 0,
      totalMachinesCount: processedManufacturerData[0]?.totalMachinesCount || 0,
    }));
  }, [processedManufacturerData]);

  // Calculate percentages for games data
  const gamesDataWithPercentages = useMemo(() => {
    if (!processedGamesData.length) return [];

    // Use the total metrics from the first item (all items have the same totalMetrics)
    const totalMetrics = processedGamesData[0]?.totalMetrics || {
      coinIn: 0,
      netWin: 0,
      drop: 0,
      gross: 0,
      cancelledCredits: 0,
      gamesPlayed: 0,
    };

    return processedGamesData.map(item => ({
      gameName: item.gameName,
      floorPositions: item.floorPositions,
      totalHandle:
        totalMetrics.coinIn > 0
          ? (item.rawTotals.coinIn / totalMetrics.coinIn) * 100
          : 0,
      totalWin:
        totalMetrics.netWin > 0
          ? (item.rawTotals.netWin / totalMetrics.netWin) * 100
          : 0,
      totalDrop:
        totalMetrics.drop > 0
          ? (item.rawTotals.drop / totalMetrics.drop) * 100
          : 0,
      totalCancelledCredits:
        totalMetrics.cancelledCredits > 0
          ? (item.rawTotals.cancelledCredits / totalMetrics.cancelledCredits) *
            100
          : 0,
      totalGross:
        totalMetrics.gross > 0
          ? (item.rawTotals.gross / totalMetrics.gross) * 100
          : 0,
      totalGamesPlayed:
        totalMetrics.gamesPlayed > 0
          ? (item.rawTotals.gamesPlayed / totalMetrics.gamesPlayed) * 100
          : 0,
      // Include raw values and totals for verification
      rawTotals: item.rawTotals,
      totalMetrics,
      machineCount: item.machineCount || 0,
      totalMachinesCount: processedGamesData[0]?.totalMachinesCount || 0,
    }));
  }, [processedGamesData]);

  // Calculate Pareto principle summary (ME1-3.0 to ME1-3.3)
  // Shows what percentage of machines contribute to what percentage of total metrics
  const summaryCalculations = useMemo(() => {
    if (!filteredEvaluationData.length)
      return {
        handleStatement: '',
        winStatement: '',
        gamesPlayedStatement: '',
        handleDetails: undefined,
        winDetails: undefined,
        gamesPlayedDetails: undefined,
      };

    // Calculate totals across all machines
    const totalHandle = filteredEvaluationData.reduce(
      (sum, machine) => sum + (machine.coinIn || 0),
      0
    );
    const totalWin = filteredEvaluationData.reduce(
      (sum, machine) => sum + (machine.netWin || 0),
      0
    );
    const totalGamesPlayed = filteredEvaluationData.reduce(
      (sum, machine) => sum + (machine.gamesPlayed || 0),
      0
    );

    // Type for verification details
    type VerificationDetails = {
      metricName: string;
      totalMachines: number;
      machinesWithData: number;
      topMachines: Array<{
        machineId: string;
        machineName: string;
        value: number;
        cumulative: number;
        percentageOfTotal: number;
      }>;
      allMachinesWithData: Array<{
        machineId: string;
        machineName: string;
        locationName: string;
        locationId: string;
        manufacturer: string;
        gameTitle: string;
        value: number;
        percentageOfTotal: number;
        // Include all relevant metrics for context
        coinIn?: number;
        netWin?: number;
        gamesPlayed?: number;
        drop?: number;
        gross?: number;
      }>;
      totalValue: number;
      cumulativeValue: number;
      machinePercentage: number;
      metricPercentage: number;
    };

    // Helper function to calculate Pareto statement and details
    const calculateParetoStatement = (
      machines: MachineEvaluationData[],
      metricGetter: (m: MachineEvaluationData) => number,
      total: number,
      metricName: string
    ): { statement: string; details: VerificationDetails | undefined } => {
      if (total === 0 || machines.length === 0)
        return { statement: '', details: undefined };

      // Filter out machines with zero metrics - only count machines that actually have data
      const machinesWithData = machines.filter(m => {
        const value = metricGetter(m);
        return value > 0 && !isNaN(value) && isFinite(value);
      });

      if (machinesWithData.length === 0) {
        return { statement: '', details: undefined };
      }

      // Sort machines by metric descending
      const sorted = [...machinesWithData].sort(
        (a, b) => metricGetter(b) - metricGetter(a)
      );

      // Store ALL machines with data for the modal
      const allMachinesWithData: VerificationDetails['allMachinesWithData'] =
        sorted.map(machine => {
          const metricValue = metricGetter(machine);
          return {
            machineId: machine.machineId,
            machineName: machine.machineName || machine.machineId,
            locationName: machine.locationName,
            locationId: machine.locationId,
            manufacturer: machine.manufacturer,
            gameTitle: machine.gameTitle,
            value: metricValue,
            percentageOfTotal: total > 0 ? (metricValue / total) * 100 : 0,
            // Include all relevant metrics for context
            coinIn: machine.coinIn,
            netWin: machine.netWin,
            gamesPlayed: machine.gamesPlayed,
            drop: machine.drop,
            gross: machine.gross,
          };
        });

      // Find the point where we reach 75% of total
      let cumulative = 0;
      let machineCount = 0;
      const targetPercentage = 75;
      const topMachines: VerificationDetails['topMachines'] = [];

      for (const machine of sorted) {
        const metricValue = metricGetter(machine);
        if (metricValue <= 0 || !isFinite(metricValue)) continue;

        cumulative += metricValue;
        machineCount++;
        const percentage = total > 0 ? (cumulative / total) * 100 : 0;

        // Store machine details for verification
        topMachines.push({
          machineId: machine.machineId,
          machineName: machine.machineName || machine.machineId,
          value: metricValue,
          cumulative,
          percentageOfTotal: percentage,
        });

        // If we've reached or exceeded 75%, return the statement
        if (percentage >= targetPercentage) {
          // Calculate percentage based on machines WITH DATA, not all machines
          const machinePercentage =
            machinesWithData.length > 0
              ? (machineCount / machinesWithData.length) * 100
              : 0;
          const statement = `${Math.max(1, Math.round(machinePercentage))}% of the machines contribute to ${Math.round(percentage)}% of the Total ${metricName}`;

          return {
            statement,
            details: {
              metricName,
              totalMachines: machines.length,
              machinesWithData: machinesWithData.length,
              topMachines,
              allMachinesWithData,
              totalValue: total,
              cumulativeValue: cumulative,
              machinePercentage: Math.round(machinePercentage),
              metricPercentage: Math.round(percentage),
            },
          };
        }
      }

      // If we never reached 75%, show what we have (but only if we have meaningful data)
      if (machineCount === 0 || cumulative === 0) {
        return { statement: '', details: undefined };
      }

      const machinePercentage =
        machinesWithData.length > 0
          ? (machineCount / machinesWithData.length) * 100
          : 0;
      const finalPercentage = total > 0 ? (cumulative / total) * 100 : 0;

      // Only show if we have at least 1% contribution
      if (finalPercentage < 1) {
        return { statement: '', details: undefined };
      }

      const statement = `${Math.max(1, Math.round(machinePercentage))}% of the machines contribute to ${Math.round(finalPercentage)}% of the Total ${metricName}`;

      return {
        statement,
        details: {
          metricName,
          totalMachines: machines.length,
          machinesWithData: machinesWithData.length,
          topMachines,
          allMachinesWithData,
          totalValue: total,
          cumulativeValue: cumulative,
          machinePercentage: Math.round(machinePercentage),
          metricPercentage: Math.round(finalPercentage),
        },
      };
    };

    const handleResult = calculateParetoStatement(
      filteredEvaluationData,
      m => m.coinIn || 0,
      totalHandle,
      'Handle'
    );

    const winResult = calculateParetoStatement(
      filteredEvaluationData,
      m => m.netWin || 0,
      totalWin,
      'Win'
    );

    const gamesPlayedResult = calculateParetoStatement(
      filteredEvaluationData,
      m => m.gamesPlayed || 0,
      totalGamesPlayed,
      'Games Played'
    );

    return {
      handleStatement: handleResult.statement,
      winStatement: winResult.statement,
      gamesPlayedStatement: gamesPlayedResult.statement,
      handleDetails: handleResult.details,
      winDetails: winResult.details,
      gamesPlayedDetails: gamesPlayedResult.details,
    };
  }, [filteredEvaluationData]);

  // Update chart data and summary when calculations change
  useEffect(() => {
    setManufacturerData(manufacturerDataWithPercentages);
    setGamesData(gamesDataWithPercentages);
  }, [manufacturerDataWithPercentages, gamesDataWithPercentages]);

  // Ensure overview loading state is set on initial mount if on overview tab
  // This must run synchronously before any renders to ensure skeleton shows immediately
  useEffect(() => {
    if (activeTab === 'overview') {
      // Set loading immediately if no machines loaded yet
      if (allOverviewMachines.length === 0) {
        setOverviewLoading(true);
        setLoading(true);
      }
    }
  }, [activeTab, allOverviewMachines.length, setLoading]);

  // Load data on component mount and when dependencies change
  // Note: Overview tab data is handled by the filter change useEffect (line 699)
  // to ensure skeleton shows properly on initial load
  useEffect(() => {
    const loadDataStreaming = async () => {
      // Set loading states for all tabs
      setStatsLoading(true);
      // Don't set overviewLoading here - let the filter change useEffect handle it
      // This ensures skeleton shows on initial load when activeTab is 'overview'
      setOfflineLoading(true);
      setEvaluationLoading(true);
      setLoading(true); // Set reports store loading state

      try {
        // 1. Load stats first (fastest) - show immediately when ready
        await fetchMachineStats();
        setStatsLoading(false);

        // 2. Overview data is handled by filter change useEffect (line 699)
        // Don't fetch here to avoid race conditions and ensure skeleton shows

        // 3. Load locations data - show immediately when ready
        await fetchLocationsData();

        // 4. Always load all machines data for evaluation tab - show immediately when ready
        await fetchAllMachines();
        setEvaluationLoading(false);
        setOfflineLoading(false);
        setLoading(false); // Clear reports store loading state
      } catch (error) {
        // Clear all loading states on error
        setStatsLoading(false);
        setOfflineLoading(false);
        setEvaluationLoading(false);
        setLoading(false); // Clear reports store loading state
        throw error;
      }
    };

    loadDataStreaming();
  }, [
    selectedLicencee,
    selectedDateRange?.start,
    selectedDateRange?.end,
    fetchMachineStats,
    fetchLocationsData,
    fetchAllMachines,
    setLoading,
  ]);

  // Show loading state for current tab when licensee changes
  useEffect(() => {
    if (activeTab === 'overview') {
      setOverviewLoading(true);
    } else if (activeTab === 'evaluation') {
      setEvaluationLoading(true);
    } else if (activeTab === 'offline') {
      setOfflineLoading(true);
    }
  }, [selectedLicencee, activeTab]);

  // Ensure locations are fetched when evaluation tab is active
  useEffect(() => {
    if (activeTab === 'evaluation') {
      // Always fetch locations when evaluation tab is active to ensure fresh data
      fetchLocationsData();
    }
  }, [activeTab, fetchLocationsData]);

  // Effects to trigger data refetch when location selections change
  useEffect(() => {
    if (activeTab === 'overview' && overviewSelectedLocation) {
      fetchOverviewMachines(1, searchTerm);
    }
  }, [overviewSelectedLocation, activeTab, fetchOverviewMachines, searchTerm]);

  useEffect(() => {
    if (
      activeTab === 'evaluation' &&
      evaluationSelectedLocation &&
      evaluationSelectedLocation !== ''
    ) {
      setEvaluationLoading(true);
      fetchAllMachines().finally(() => {
        setEvaluationLoading(false);
      });
    }
  }, [
    evaluationSelectedLocation,
    activeTab,
    fetchAllMachines,
    selectedDateRange?.start,
    selectedDateRange?.end,
  ]);

  useEffect(() => {
    if (activeTab === 'offline' && offlineSelectedLocation) {
      fetchOfflineMachines();
    }
  }, [offlineSelectedLocation, activeTab, fetchOfflineMachines]);

  // Handle online status filter change
  const handleOnlineStatusFilterChange = useCallback(
    async (value: string) => {
      setOnlineStatusFilter(value);
      setOverviewLoading(true);
      await fetchOverviewMachines(1, searchTerm);
    },
    [fetchOverviewMachines, searchTerm]
  );

  // Handle machine edit
  const handleMachineEdit = useCallback(
    (machine: MachineData) => {
      // Convert machine data to cabinet format for the existing modal
      const cabinetData = {
        _id: machine.machineId,
        assetNumber: machine.machineName || '',
        serialNumber:
          ((machine as Record<string, unknown>).serialNumber as string) ||
          ((machine as Record<string, unknown>).origSerialNumber as string) ||
          machine.machineId,
        game: machine.gameTitle || '',
        locationId: machine.locationId || '',
        locationName: machine.locationName || '',
        smbId: machine.machineId,
        relayId: machine.machineId,
        moneyIn: machine.drop || 0,
        moneyOut: machine.totalCancelledCredits || 0,
        gross: machine.netWin || 0,
        jackpot: 0,
        lastOnline: machine.lastActivity,
        installedGame: machine.gameTitle || '',
        accountingDenomination: '1',
        collectionMultiplier: '1',
        status: machine.isOnline ? 'functional' : 'non_functional',
        assetStatus: machine.isOnline ? 'functional' : 'non_functional',
        gameType: machine.machineType || 'slot',
        isCronosMachine: false,
        cabinetType: 'Standing',
        gamingLocation: machine.locationId || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        custom: {
          name: machine.serialNumber || machine.machineId || 'Unknown',
        },
      };
      openEditModal(cabinetData);
    },
    [openEditModal]
  );

  // Handle machine delete
  const handleMachineDelete = useCallback(
    (machine: MachineData) => {
      // Convert machine data to cabinet format for the existing modal
      const cabinetData = {
        _id: machine.machineId,
        assetNumber: machine.machineName || '',
        serialNumber:
          ((machine as Record<string, unknown>).serialNumber as string) ||
          ((machine as Record<string, unknown>).origSerialNumber as string) ||
          machine.machineId,
        game: machine.gameTitle || '',
        locationId: machine.locationId || '',
        locationName: machine.locationName || '',
        smbId: machine.machineId,
        relayId: machine.machineId,
        moneyIn: machine.drop || 0,
        moneyOut: machine.totalCancelledCredits || 0,
        gross: machine.netWin || 0,
        jackpot: 0,
        lastOnline: machine.lastActivity,
        installedGame: machine.gameTitle || '',
        accountingDenomination: '1',
        collectionMultiplier: '1',
        status: machine.isOnline ? 'functional' : 'non_functional',
        assetStatus: machine.isOnline ? 'functional' : 'non_functional',
        gameType: machine.machineType || 'slot',
        isCronosMachine: false,
        cabinetType: 'Standing',
        gamingLocation: machine.locationId || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        custom: {
          name: machine.serialNumber || machine.machineId || 'Unknown',
        },
      };
      openDeleteModal(cabinetData);
    },
    [openDeleteModal]
  );

  // Handle tab change with explicit fetch per tab
  const handleTabChange = useCallback(
    async (tab: string) => {
      setActiveTab(tab);

      // Update URL param to persist tab state
      try {
        const sp = new URLSearchParams(searchParams?.toString() || '');
        sp.set('mtab', tab);
        // ensure section is machines
        sp.set('section', 'machines');
        router.replace(`${pathname}?${sp.toString()}`);
      } catch {}

      if (tab === 'overview') {
        setAllOverviewMachines([]);
        setOverviewLoadedBatches(new Set([1]));
        setOverviewCurrentPage(0);
        setOverviewLoading(true);
        try {
          await fetchOverviewMachines(1, searchTerm);
        } finally {
          setOverviewLoading(false);
        }
      } else if (tab === 'evaluation') {
        setEvaluationLoading(true);
        try {
          await fetchAllMachines();
        } finally {
          setEvaluationLoading(false);
        }
      } else if (tab === 'offline') {
        setAllOfflineMachines([]);
        setOfflineLoadedBatches(new Set([1]));
        setOfflineCurrentPage(0);
        setOfflineLoading(true);
        try {
          await fetchOfflineMachines(1);
        } finally {
          setOfflineLoading(false);
        }
      }
    },
    [
      fetchOverviewMachines,
      fetchAllMachines,
      fetchOfflineMachines,
      router,
      pathname,
      searchParams,
      searchTerm,
    ]
  );

  // Initialize activeTab from URL
  useEffect(() => {
    const initial = searchParams?.get('mtab');
    if (initial && initial !== activeTab) {
      setActiveTab(initial);
    }
  }, [searchParams, activeTab, setActiveTab]);

  // Offline machines with duration calculation and sorting
  const offlineMachinesWithDuration = useMemo(() => {
    const machinesWithDuration = paginatedOfflineMachines.map(machine => {
      const now = new Date();
      const lastActivity = new Date(machine.lastActivity);
      const offlineDurationMs = now.getTime() - lastActivity.getTime();
      const offlineDurationHours = Math.max(
        0,
        offlineDurationMs / (1000 * 60 * 60)
      );

      return {
        ...machine,
        offlineDurationHours,
        offlineDurationFormatted: formatOfflineDuration(offlineDurationHours),
      };
    });

    // Apply sorting based on sortConfig
    return [...machinesWithDuration].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortConfig.key) {
        case 'machineId':
          aValue = a.machineId || '';
          bValue = b.machineId || '';
          break;
        case 'locationName':
          aValue = a.locationName || '';
          bValue = b.locationName || '';
          break;
        case 'gameTitle':
          aValue = a.gameTitle || '';
          bValue = b.gameTitle || '';
          break;
        case 'lastActivity':
          aValue = new Date(a.lastActivity).getTime();
          bValue = new Date(b.lastActivity).getTime();
          break;
        case 'coinIn':
          aValue = a.coinIn || 0;
          bValue = b.coinIn || 0;
          break;
        case 'netWin':
          aValue = a.netWin || 0;
          bValue = b.netWin || 0;
          break;
        case 'offlineDurationHours':
          // Sort by offline duration (calculated field)
          aValue =
            (a as typeof a & { offlineDurationHours: number })
              .offlineDurationHours || 0;
          bValue =
            (b as typeof b & { offlineDurationHours: number })
              .offlineDurationHours || 0;
          break;
        default:
          // Default: sort by offline duration (longest first)
          aValue =
            (a as typeof a & { offlineDurationHours: number })
              .offlineDurationHours || 0;
          bValue =
            (b as typeof b & { offlineDurationHours: number })
              .offlineDurationHours || 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [paginatedOfflineMachines, sortConfig]);

  // Calculate derived fields for overview machines and apply sorting
  const processedOverviewMachines = useMemo(() => {
    const processed = paginatedOverviewMachines.map(machine => ({
      ...machine,
      // Calculate derived fields on frontend for better performance
      actualHold:
        machine.coinIn > 0
          ? ((machine.coinIn - machine.coinOut) / machine.coinIn) * 100
          : 0,
      totalWonCredits: machine.coinOut || 0,
      currentCredits: 0, // Default value since not provided by API
      gamesWon: 0, // Default value since not provided by API
    }));

    // Apply sorting based on sortConfig
    return [...processed].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortConfig.key) {
        case 'machineId':
          aValue = a.machineId || '';
          bValue = b.machineId || '';
          break;
        case 'locationName':
          aValue = a.locationName || '';
          bValue = b.locationName || '';
          break;
        case 'gameTitle':
          aValue = a.gameTitle || '';
          bValue = b.gameTitle || '';
          break;
        case 'gross':
          aValue = a.gross || 0;
          bValue = b.gross || 0;
          break;
        case 'coinIn':
          aValue = a.coinIn || 0;
          bValue = b.coinIn || 0;
          break;
        case 'netWin':
          aValue = a.netWin || 0;
          bValue = b.netWin || 0;
          break;
        case 'gamesPlayed':
          aValue = a.gamesPlayed || 0;
          bValue = b.gamesPlayed || 0;
          break;
        case 'actualHold':
          aValue = a.actualHold || 0;
          bValue = b.actualHold || 0;
          break;
        case 'offlineDurationHours':
          // This shouldn't be used for overview, but handle it just in case
          aValue = 0;
          bValue = 0;
          break;
        default:
          aValue = a.machineId || '';
          bValue = b.machineId || '';
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [paginatedOverviewMachines, sortConfig]);

  if (error) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <RefreshCw className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Error Loading Data
          </h3>
          <p className="mb-4 text-gray-600">{error}</p>
          <Button
            onClick={() => {
              setAllOverviewMachines([]);
              setOverviewLoadedBatches(new Set([1]));
              setOverviewCurrentPage(0);
              fetchOverviewMachines(1, searchTerm);
            }}
            className="bg-buttonActive hover:bg-buttonActive/90"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Machine Performance Overview
          </h2>
          <p className="text-sm text-gray-600">
            Monitor individual machine performance and revenue tracking
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
            <span role="img" aria-label="lightbulb">
              💡
            </span>{' '}
            Click any machine to view detailed information
          </p>
        </div>
      </div>

      {/* Modals */}
      <EditCabinetModal />
      <DeleteCabinetModal />

      {/* Machine Statistics Cards - Load first */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading || !machineStats ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="min-h-[120px]">
              <CardContent className="flex h-full flex-col justify-center p-4">
                <div className="mb-2 h-8 animate-pulse rounded bg-gray-200"></div>
                <div className="h-4 animate-pulse rounded bg-gray-200"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="min-h-[120px]">
              <CardContent className="flex h-full flex-col justify-center p-4">
                <div
                  className={`break-words text-lg font-bold leading-tight sm:text-xl lg:text-2xl ${getGrossColorClass(
                    machineStats.totalGross
                  )}`}
                >
                  {shouldShowCurrency()
                    ? formatAmount(machineStats.totalGross)
                    : `$${machineStats.totalGross.toLocaleString()}`}
                </div>
                <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
                  Total Net Win (Gross)
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-[120px]">
              <CardContent className="flex h-full flex-col justify-center p-4">
                <div
                  className={`break-words text-lg font-bold leading-tight sm:text-xl lg:text-2xl ${getMoneyInColorClass(
                    machineStats.totalDrop
                  )}`}
                >
                  {shouldShowCurrency()
                    ? formatAmount(machineStats.totalDrop)
                    : `$${machineStats.totalDrop.toLocaleString()}`}
                </div>
                <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
                  Total Drop
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-[120px]">
              <CardContent className="flex h-full flex-col justify-center p-4">
                <div
                  className={`break-words text-lg font-bold leading-tight sm:text-xl lg:text-2xl ${getMoneyOutColorClass(
                    machineStats.totalCancelledCredits,
                    machineStats.totalDrop
                  )}`}
                >
                  {shouldShowCurrency()
                    ? formatAmount(machineStats.totalCancelledCredits)
                    : `$${machineStats.totalCancelledCredits.toLocaleString()}`}
                </div>
                <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
                  Total Cancelled Credits
                </p>
              </CardContent>
            </Card>
            <Card className="min-h-[120px]">
              <CardContent className="flex h-full flex-col justify-center p-4">
                <div className="break-words text-lg font-bold leading-tight text-blue-600 sm:text-xl lg:text-2xl">
                  {locationMachineStatsLoading ? (
                    <span className="text-gray-400">...</span>
                  ) : (
                    <>
                      {locationMachineStats?.onlineMachines || 0}/
                      {locationMachineStats?.totalMachines || 0}
                    </>
                  )}
                </div>
                <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
                  Online Machines
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Three-Tab Navigation System */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        {/* Desktop Navigation */}
        <TabsList className="mb-10 hidden w-full grid-cols-3 rounded-xl bg-gray-100 p-3 shadow-sm md:grid">
          <TabsTrigger
            value="overview"
            className="flex-1 rounded-lg bg-white px-6 py-4 text-sm font-semibold transition-all duration-200 hover:bg-gray-50 hover:shadow-md data-[state=active]:scale-105 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="evaluation"
            className="flex-1 rounded-lg bg-white px-6 py-4 text-sm font-semibold transition-all duration-200 hover:bg-gray-50 hover:shadow-md data-[state=active]:scale-105 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
          >
            Evaluation
          </TabsTrigger>
          <TabsTrigger
            value="offline"
            className="flex-1 rounded-lg bg-white px-6 py-4 text-sm font-semibold transition-all duration-200 hover:bg-gray-50 hover:shadow-md data-[state=active]:scale-105 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
          >
            Offline Machines
          </TabsTrigger>
        </TabsList>

        {/* Mobile Navigation */}
        <div className="mb-6 md:hidden">
          <select
            value={activeTab}
            onChange={e => handleTabChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
          >
            <option value="overview">Overview</option>
            {/* <option value="comparison">Performance Analysis</option> */}
            <option value="evaluation">Evaluation</option>
            <option value="offline">Offline Machines</option>
          </select>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <div className="mb-6 flex flex-col items-center gap-4 md:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Search machines..."
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full border-gray-300 text-gray-900 placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="w-full md:w-[420px]">
              <LocationSingleSelect
                locations={locations}
                selectedLocation={overviewSelectedLocation}
                onSelectionChange={setOverviewSelectedLocation}
                placeholder="Select Location"
              />
            </div>
            <Select
              value={onlineStatusFilter}
              onValueChange={handleOnlineStatusFilterChange}
            >
              <SelectTrigger className="w-full border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500 md:w-40">
                <SelectValue
                  placeholder="All Status"
                  className="text-gray-900"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  // Refresh both stats (metric cards) and overview machines
                  setStatsLoading(true);
                  setOverviewLoading(true);
                  try {
                    await Promise.all([
                      fetchMachineStats(),
                      refreshLocationMachineStats(),
                      fetchOverviewMachines(1, searchTerm),
                    ]);
                  } finally {
                    setStatsLoading(false);
                    setOverviewLoading(false);
                  }
                }}
                className="border-2 border-gray-300 hover:border-gray-400"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-300 hover:border-gray-400"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleExportMeters('pdf')}
                    className="cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportMeters('excel')}
                    className="cursor-pointer"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Machine List */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Machine Performance</CardTitle>
                <div className="flex flex-wrap gap-2"></div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Show skeleton if loading OR if no machines and on overview tab (prevents flash of "no data" on initial load) */}
              {overviewLoading ||
              (allOverviewMachines.length === 0 && activeTab === 'overview') ? (
                <MachinesOverviewSkeleton />
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    {/* Desktop Table View */}
                    <div className="hidden rounded-md border md:block">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="t border-b bg-muted/50">
                            <tr>
                              {/* Select column removed */}
                              <SortableHeader
                                sortKey="machineId"
                                currentSort={sortConfig}
                                onSort={handleSort}
                              >
                                Machine
                              </SortableHeader>
                              <SortableHeader
                                sortKey="locationName"
                                currentSort={sortConfig}
                                onSort={handleSort}
                              >
                                Location
                              </SortableHeader>
                              <SortableHeader
                                sortKey="gameTitle"
                                currentSort={sortConfig}
                                onSort={handleSort}
                              >
                                Type
                              </SortableHeader>
                              <SortableHeader
                                sortKey="gross"
                                currentSort={sortConfig}
                                onSort={handleSort}
                              >
                                Gross
                              </SortableHeader>
                              <SortableHeader
                                sortKey="coinIn"
                                currentSort={sortConfig}
                                onSort={handleSort}
                              >
                                Drop
                              </SortableHeader>
                              <SortableHeader
                                sortKey="actualHold"
                                currentSort={sortConfig}
                                onSort={handleSort}
                              >
                                Hold %
                              </SortableHeader>
                              <SortableHeader
                                sortKey="gamesPlayed"
                                currentSort={sortConfig}
                                onSort={handleSort}
                              >
                                Games
                              </SortableHeader>
                              <th className="p-3 text-left font-medium">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {processedOverviewMachines.length > 0 ? (
                              processedOverviewMachines.map(machine => (
                                <tr
                                  key={machine.machineId}
                                  className="border-b hover:bg-muted/30"
                                >
                                  {/* Select column data removed */}
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      {/* Status Icon with pulse animation */}
                                      <div
                                        className={`flex-shrink-0 ${
                                          machine.isOnline
                                            ? 'animate-pulse'
                                            : ''
                                        }`}
                                      >
                                        <StatusIcon
                                          isOnline={machine.isOnline}
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        {/* Machine Name - Format: serialNumber (custom.name, game) */}
                                        <button
                                          onClick={() => {
                                            router.push(
                                              `/cabinets/${machine.machineId}`
                                            );
                                          }}
                                          className="group flex items-center gap-1.5 text-left font-medium text-gray-900 transition-opacity hover:opacity-80"
                                        >
                                          <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                            {(() => {
                                              // Get serialNumber (prefer serialNumber, fallback to origSerialNumber)
                                              const serialNumberRaw =
                                                (
                                                  machine.serialNumber?.trim() ||
                                                  ((
                                                    machine as Record<
                                                      string,
                                                      unknown
                                                    >
                                                  ).origSerialNumber as
                                                    | string
                                                    | undefined)
                                                )?.trim() || '';

                                              // Get custom.name
                                              const customName =
                                                machine.customName?.trim() ||
                                                '';

                                              // Main identifier: serialNumber if exists and not blank, otherwise custom.name, otherwise machineId
                                              const mainIdentifier =
                                                serialNumberRaw ||
                                                customName ||
                                                machine.machineId;

                                              // Get game (gameTitle)
                                              const game =
                                                machine.gameTitle?.trim() || '';

                                              // Format: serialNumber || custom.name (custom.name if different, game)
                                              const parts: string[] = [];

                                              // Only add customName if it's provided AND different from main identifier
                                              if (
                                                customName &&
                                                customName !== mainIdentifier
                                              ) {
                                                parts.push(customName);
                                              }

                                              // Always include game - show "(game name not provided)" in red if blank
                                              if (!game) {
                                                parts.push(
                                                  '(game name not provided)'
                                                );
                                              } else {
                                                parts.push(game);
                                              }

                                              return (
                                                <span>
                                                  {mainIdentifier} (
                                                  {parts.map((part, idx) => {
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
                                                          parts.length - 1 &&
                                                          ', '}
                                                      </span>
                                                    );
                                                  })}
                                                  )
                                                </span>
                                              );
                                            })()}
                                          </span>
                                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-sm">
                                    <button
                                      onClick={() => {
                                        if (machine.locationId) {
                                          router.push(
                                            `/locations/${machine.locationId}`
                                          );
                                        }
                                      }}
                                      className="group flex items-center gap-1.5 text-blue-600 transition-opacity hover:opacity-80"
                                    >
                                      <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                        {machine.locationName || 'Unknown'}
                                      </span>
                                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                                    </button>
                                  </td>
                                  <td className="p-3">
                                    <Badge variant="outline">
                                      {machine.machineType || 'slot'}
                                    </Badge>
                                  </td>
                                  <td
                                    className={`p-3 text-sm font-medium ${getGrossColorClass(machine.netWin || 0)}`}
                                  >
                                    {shouldShowCurrency()
                                      ? formatAmount(machine.netWin || 0)
                                      : `$${(machine.netWin || 0).toLocaleString()}`}
                                  </td>
                                  <td
                                    className={`p-3 text-sm font-medium ${getMoneyInColorClass(machine.drop || 0)}`}
                                  >
                                    {shouldShowCurrency()
                                      ? formatAmount(machine.drop || 0)
                                      : `$${(machine.drop || 0).toLocaleString()}`}
                                  </td>
                                  <td className="p-3 text-sm">
                                    {(machine.actualHold || 0).toFixed(1)}%
                                  </td>
                                  <td className="p-3 text-sm">
                                    {(
                                      machine.gamesPlayed || 0
                                    ).toLocaleString()}
                                  </td>
                                  <td className="p-3">
                                    {canEditMachines && (
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleMachineEdit(machine)
                                          }
                                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                                        >
                                          <Pencil2Icon className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleMachineDelete(machine)
                                          }
                                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="py-8 text-center text-gray-500"
                                >
                                  {`No machines found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}`}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="space-y-4 md:hidden">
                    {!overviewLoading &&
                    processedOverviewMachines.length > 0 ? (
                      processedOverviewMachines.map(machine => (
                        <Card key={machine.machineId} className="p-4">
                          <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              {/* Status Icon with pulse animation */}
                              <div
                                className={`flex-shrink-0 ${
                                  machine.isOnline ? 'animate-pulse' : ''
                                }`}
                              >
                                <StatusIcon
                                  isOnline={machine.isOnline}
                                  size="sm"
                                />
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                {/* Machine Name - Format: serialNumber (custom.name, game) */}
                                <button
                                  onClick={() => {
                                    router.push(
                                      `/cabinets/${machine.machineId}`
                                    );
                                  }}
                                  className="group flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left"
                                >
                                  <h4 className="min-w-0 flex-1 truncate text-sm font-medium text-blue-600 underline decoration-blue-600 decoration-2 underline-offset-2">
                                    <span className="block truncate">
                                      {(() => {
                                        // Get serialNumber (prefer serialNumber, fallback to origSerialNumber)
                                        const serialNumberRaw =
                                          (
                                            machine.serialNumber?.trim() ||
                                            ((
                                              machine as Record<string, unknown>
                                            ).origSerialNumber as
                                              | string
                                              | undefined)
                                          )?.trim() || '';

                                        // Get custom.name
                                        const customName =
                                          machine.customName?.trim() || '';

                                        // Main identifier: serialNumber if exists and not blank, otherwise custom.name, otherwise machineId
                                        const mainIdentifier =
                                          serialNumberRaw ||
                                          customName ||
                                          machine.machineId;

                                        // Get game (gameTitle)
                                        const game =
                                          machine.gameTitle?.trim() || '';

                                        // Format: serialNumber || custom.name (custom.name if different, game)
                                        const parts: string[] = [];

                                        // Only add customName if it's provided AND different from main identifier
                                        if (
                                          customName &&
                                          customName !== mainIdentifier
                                        ) {
                                          parts.push(customName);
                                        }

                                        // Always include game - show "(game name not provided)" in red if blank
                                        if (!game) {
                                          parts.push(
                                            '(game name not provided)'
                                          );
                                        } else {
                                          parts.push(game);
                                        }

                                        return (
                                          <>
                                            {mainIdentifier} (
                                            {parts.map((part, idx) => {
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
                                                  {idx < parts.length - 1 &&
                                                    ', '}
                                                </span>
                                              );
                                            })}
                                            )
                                          </>
                                        );
                                      })()}
                                    </span>
                                  </h4>
                                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                                </button>
                              </div>
                            </div>
                            {canEditMachines && (
                              <div className="flex flex-shrink-0 items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMachineEdit(machine)}
                                  className="h-8 w-8 flex-shrink-0 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                                >
                                  <Pencil2Icon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMachineDelete(machine)}
                                  className="h-8 w-8 flex-shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          {/* Tiny screen layout (< 425px) - Single column */}
                          <div className="block space-y-2 text-xs sm:hidden">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Location:
                              </span>
                              <button
                                onClick={() => {
                                  if (machine.locationId) {
                                    router.push(
                                      `/locations/${machine.locationId}`
                                    );
                                  }
                                }}
                                className="group flex items-center gap-1 font-medium text-blue-600 transition-opacity hover:opacity-80"
                              >
                                <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                  {machine.locationName || 'Unknown'}
                                </span>
                                <ExternalLink className="h-3 w-3 text-blue-600" />
                              </button>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Type:
                              </span>
                              <span className="font-medium">
                                {machine.machineType || 'slot'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Net Win:
                              </span>
                              <span
                                className={`font-medium ${getGrossColorClass(
                                  machine.netWin
                                )}`}
                              >
                                ${(machine.netWin || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Drop:
                              </span>
                              <span
                                className={`font-medium ${getMoneyInColorClass(
                                  machine.drop
                                )}`}
                              >
                                ${(machine.drop || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Hold %:
                              </span>
                              <span className="font-medium">
                                {(machine.actualHold || 0).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Games:
                              </span>
                              <span className="font-medium">
                                {(machine.gamesPlayed || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {/* Small screen layout (425px+) - Two columns */}
                          <div className="hidden gap-4 text-sm sm:grid sm:grid-cols-2">
                            <div>
                              <span className="text-muted-foreground">
                                Location:
                              </span>
                              <button
                                onClick={() => {
                                  if (machine.locationId) {
                                    router.push(
                                      `/locations/${machine.locationId}`
                                    );
                                  }
                                }}
                                className="group flex items-center gap-1 font-medium text-blue-600 transition-opacity hover:opacity-80"
                              >
                                <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                  {machine.locationName || 'Unknown'}
                                </span>
                                <ExternalLink className="h-3 w-3 text-blue-600" />
                              </button>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Type:
                              </span>
                              <p>{machine.machineType || 'slot'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Net Win:
                              </span>
                              <p
                                className={`font-medium ${getGrossColorClass(
                                  machine.netWin
                                )}`}
                              >
                                ${(machine.netWin || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Drop:
                              </span>
                              <p
                                className={`font-medium ${getMoneyInColorClass(machine.drop || 0)}`}
                              >
                                ${(machine.drop || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Hold %:
                              </span>
                              <p>{(machine.actualHold || 0).toFixed(1)}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Games:
                              </span>
                              <p>
                                {(machine.gamesPlayed || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        {`No machines found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}`}
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls - Desktop and Mobile */}
                  {!overviewLoading && overviewTotalPages > 1 && (
                    <div className="mt-4">
                      <PaginationControls
                        currentPage={overviewCurrentPage}
                        totalPages={overviewTotalPages}
                        setCurrentPage={setOverviewCurrentPage}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluation" className="mt-2 space-y-6">
          {/* Filters for Evaluation Tab */}
          <div className="mb-6 flex flex-col items-center gap-4 md:flex-row">
            <div className="w-full md:w-[420px]">
              <LocationSingleSelect
                locations={locations}
                selectedLocation={evaluationSelectedLocation}
                onSelectionChange={setEvaluationSelectedLocation}
                placeholder="Select Location"
                includeAllOption={true}
              />
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-initial"
                onClick={async () => {
                  setEvaluationLoading(true);
                  setStatsLoading(true);
                  try {
                    await Promise.all([
                      fetchAllMachines(),
                      fetchMachineStats(),
                      refreshLocationMachineStats(),
                    ]);
                  } finally {
                    setEvaluationLoading(false);
                    setStatsLoading(false);
                  }
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleExportMeters('pdf')}
                    className="cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportMeters('excel')}
                    className="cursor-pointer"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {evaluationLoading ? (
            <MachinesEvaluationSkeleton />
          ) : !evaluationSelectedLocation ||
            (evaluationSelectedLocation !== 'all' &&
              evaluationSelectedLocation === '') ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Monitor className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Select a Location
                </h3>
                <p className="mb-4 text-gray-600">
                  Choose a specific location to view machine evaluation data and
                  performance metrics.
                </p>
                <p className="text-sm text-gray-500">
                  Use the location selector above to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Manufacturers Performance Chart */}
              <div className="mb-6">
                {(() => {
                  // Show skeleton if loading OR if no machines data loaded yet
                  if (evaluationLoading || allMachines.length === 0) {
                    return <ChartSkeleton />;
                  }
                  // Show chart if data exists
                  if (manufacturerData && manufacturerData.length > 0) {
                    return (
                      <ManufacturerPerformanceChart data={manufacturerData} />
                    );
                  }
                  // Show no data message only if we're not loading and have machines but no manufacturer data
                  return (
                    <ChartNoData
                      title="Manufacturers Performance"
                      icon={<BarChart3 className="h-5 w-5" />}
                      message="No manufacturer performance data available for the selected location"
                    />
                  );
                })()}
              </div>

              {/* Summary Section */}
              <div className="mb-6">
                <MachineEvaluationSummary
                  handleStatement={summaryCalculations.handleStatement}
                  winStatement={summaryCalculations.winStatement}
                  gamesPlayedStatement={
                    summaryCalculations.gamesPlayedStatement
                  }
                  handleDetails={summaryCalculations.handleDetails}
                  winDetails={summaryCalculations.winDetails}
                  gamesPlayedDetails={summaryCalculations.gamesPlayedDetails}
                />
              </div>

              {/* Games Performance Chart */}
              <div className="mb-6">
                {(() => {
                  // Show skeleton if loading OR if no machines data loaded yet
                  if (evaluationLoading || allMachines.length === 0) {
                    return <ChartSkeleton />;
                  }
                  // Show chart if data exists
                  if (gamesData && gamesData.length > 0) {
                    return <GamesPerformanceChart data={gamesData} />;
                  }
                  // Show no data message only if we're not loading and have machines but no games data
                  return (
                    <ChartNoData
                      title="Games Performance"
                      icon={<BarChart3 className="h-5 w-5" />}
                      message="No games performance data available for the selected location"
                    />
                  );
                })()}
              </div>

              {/* Games Performance Revenue Chart */}
              <div className="mb-6">
                {(() => {
                  // Show skeleton if loading OR if no machines data loaded yet
                  if (evaluationLoading || allMachines.length === 0) {
                    return <ChartSkeleton />;
                  }
                  // Show chart if data exists
                  if (gamesData && gamesData.length > 0) {
                    return <GamesPerformanceRevenueChart data={gamesData} />;
                  }
                  // Show no data message only if we're not loading and have machines but no games data
                  return (
                    <ChartNoData
                      title="Games Performance Revenue"
                      icon={<BarChart3 className="h-5 w-5" />}
                      message="No games revenue data available for the selected location"
                    />
                  );
                })()}
              </div>

              {/* Top 5 Machines Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    Top Machines
                  </CardTitle>
                  <CardDescription>
                    Top 5 highest performing machines
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Desktop Table View */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <SortableTopMachinesHeader
                            sortKey="locationName"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Location
                          </SortableTopMachinesHeader>
                          {/* Machine ID (ME3-2.1) */}
                          <SortableTopMachinesHeader
                            sortKey="machineId"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Machine ID
                          </SortableTopMachinesHeader>
                          <SortableTopMachinesHeader
                            sortKey="gameTitle"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Game
                          </SortableTopMachinesHeader>
                          <SortableTopMachinesHeader
                            sortKey="manufacturer"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Manufacturer
                          </SortableTopMachinesHeader>
                          <SortableTopMachinesHeader
                            sortKey="coinIn"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Handle
                          </SortableTopMachinesHeader>
                          <SortableTopMachinesHeader
                            sortKey="averageWager"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Average Wager (Calc. 1)
                          </SortableTopMachinesHeader>
                          <SortableTopMachinesHeader
                            sortKey="netWin"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Win
                          </SortableTopMachinesHeader>
                          <SortableTopMachinesHeader
                            sortKey="jackpot"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Jackpot
                          </SortableTopMachinesHeader>
                          <SortableTopMachinesHeader
                            sortKey="theoreticalHold"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Theoretical Hold
                          </SortableTopMachinesHeader>
                          <SortableTopMachinesHeader
                            sortKey="actualHold"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Actual Hold (Calc. 2)
                          </SortableTopMachinesHeader>
                          <SortableTopMachinesHeader
                            sortKey="gamesPlayed"
                            currentSortKey={topMachinesSortKey}
                            currentSortDirection={topMachinesSortDirection}
                            onSort={handleTopMachinesSort}
                          >
                            Games Played
                          </SortableTopMachinesHeader>
                        </tr>
                      </thead>
                      <tbody>
                        {sortTopMachines(filteredEvaluationData)
                          .slice(0, 5)
                          .map(machine => (
                            <tr
                              key={machine.machineId}
                              className="border-b hover:bg-gray-50"
                            >
                              {/* Location Column - Clickable with ExternalLink */}
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
                              {/* Machine Column - Clickable with ExternalLink, font-mono, complex formatting */}
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
                                        // Get serialNumber (check both serialNumber and origSerialNumber)
                                        const serialNumber =
                                          (typeof (
                                            machine as Record<string, unknown>
                                          ).serialNumber === 'string' &&
                                            (
                                              (
                                                machine as Record<
                                                  string,
                                                  unknown
                                                >
                                              ).serialNumber as string
                                            ).trim()) ||
                                          (typeof (
                                            machine as Record<string, unknown>
                                          ).origSerialNumber === 'string' &&
                                            (
                                              (
                                                machine as Record<
                                                  string,
                                                  unknown
                                                >
                                              ).origSerialNumber as string
                                            ).trim()) ||
                                          '';
                                        const hasSerialNumber =
                                          serialNumber !== '';

                                        // Get custom.name
                                        const customName =
                                          typeof (
                                            machine as Record<string, unknown>
                                          ).custom === 'object' &&
                                          typeof (
                                            (machine as Record<string, unknown>)
                                              .custom as Record<string, unknown>
                                          )?.name === 'string'
                                            ? ((
                                                (
                                                  machine as Record<
                                                    string,
                                                    unknown
                                                  >
                                                ).custom as Record<
                                                  string,
                                                  unknown
                                                >
                                              ).name as string)
                                            : '';
                                        const customNameTrimmed =
                                          customName.trim();
                                        const hasCustomName =
                                          customNameTrimmed !== '';

                                        // Main identifier: serialNumber if exists, otherwise custom.name, otherwise machineId
                                        const mainIdentifier = hasSerialNumber
                                          ? serialNumber
                                          : hasCustomName
                                            ? customNameTrimmed
                                            : machine.machineId;
                                        const usedSerialNumber =
                                          hasSerialNumber;

                                        // Get game
                                        const game =
                                          machine.gameTitle?.trim() || '';
                                        const hasGame = game !== '';

                                        // Format: serialNumber || custom.name (custom.name if different, game)
                                        const parts: string[] = [];

                                        // Only add customName if:
                                        // 1. We used serialNumber as main identifier
                                        // 2. customName exists and is different from serialNumber
                                        if (
                                          usedSerialNumber &&
                                          hasCustomName &&
                                          customNameTrimmed !== serialNumber
                                        ) {
                                          parts.push(customNameTrimmed);
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
                                            {parts.map((part, idx) => {
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
                                                  {idx < parts.length - 1 &&
                                                    ', '}
                                                </span>
                                              );
                                            })}
                                            )
                                          </span>
                                        );
                                      })()}
                                    </span>
                                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                  </button>
                                ) : (
                                  <div className="font-mono text-sm text-gray-900">
                                    {(typeof (
                                      machine as Record<string, unknown>
                                    ).serialNumber === 'string' &&
                                      (
                                        (machine as Record<string, unknown>)
                                          .serialNumber as string
                                      ).trim()) ||
                                      (typeof (
                                        machine as Record<string, unknown>
                                      ).origSerialNumber === 'string' &&
                                        (
                                          (machine as Record<string, unknown>)
                                            .origSerialNumber as string
                                        ).trim()) ||
                                      (typeof (
                                        machine as Record<string, unknown>
                                      ).custom === 'object' &&
                                        typeof (
                                          (machine as Record<string, unknown>)
                                            .custom as Record<string, unknown>
                                        )?.name === 'string' &&
                                        (
                                          (
                                            (machine as Record<string, unknown>)
                                              .custom as Record<string, unknown>
                                          ).name as string
                                        ).trim()) ||
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
                              {/* Handle (ME3-2.2) */}
                              <td className="p-3 text-sm font-medium">
                                ${(machine.coinIn || 0).toLocaleString()}
                              </td>
                              {/* Average Wager (Calc. 1) (ME3-2.3) */}
                              <td className="p-3 text-sm">
                                $
                                {machine.averageWager
                                  ? machine.averageWager.toFixed(2)
                                  : '0.00'}
                              </td>
                              {/* Win (ME3-2.4) */}
                              <td
                                className={`p-3 text-sm font-medium ${
                                  (machine.netWin || 0) >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                ${(machine.netWin || 0).toLocaleString()}
                              </td>
                              {/* Jackpot (ME3-2.5) */}
                              <td className="p-3 text-sm">
                                ${(machine.jackpot || 0).toLocaleString()}
                              </td>
                              {/* Theoretical Hold (ME3-2.6) */}
                              <td className="p-3 text-sm text-green-600">
                                {(machine.theoreticalHold || 0).toFixed(2)}%
                              </td>
                              {/* Actual Hold (Calc. 2) (ME3-2.7) */}
                              <td
                                className={`p-3 text-sm font-medium ${
                                  (machine.actualHold || 0) >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {(machine.actualHold || 0).toFixed(2)}%
                              </td>
                              {/* Games Played (ME3-2.8) */}
                              <td className="p-3 text-sm">
                                {(machine.gamesPlayed || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View for Evaluation */}
                  <div className="space-y-4 md:hidden">
                    {sortEvaluationData(filteredEvaluationData)
                      .slice(0, 5)
                      .map(machine => (
                        <Card key={machine.machineId} className="p-4">
                          <div className="mb-3">
                            {/* Machine Name with Link */}
                            <h4 className="text-sm font-medium">
                              {machine.machineId ? (
                                <button
                                  onClick={() => {
                                    router.push(
                                      `/cabinets/${machine.machineId}`
                                    );
                                  }}
                                  className="group flex items-center gap-1.5 font-mono text-sm text-gray-900 transition-opacity hover:opacity-80"
                                >
                                  <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                    {(() => {
                                      // Get serialNumber (check both serialNumber and origSerialNumber)
                                      const serialNumber =
                                        (typeof (
                                          machine as Record<string, unknown>
                                        ).serialNumber === 'string' &&
                                          (
                                            (machine as Record<string, unknown>)
                                              .serialNumber as string
                                          ).trim()) ||
                                        (typeof (
                                          machine as Record<string, unknown>
                                        ).origSerialNumber === 'string' &&
                                          (
                                            (machine as Record<string, unknown>)
                                              .origSerialNumber as string
                                          ).trim()) ||
                                        '';
                                      const hasSerialNumber =
                                        serialNumber !== '';

                                      // Get custom.name
                                      const customName =
                                        typeof (
                                          machine as Record<string, unknown>
                                        ).custom === 'object' &&
                                        typeof (
                                          (machine as Record<string, unknown>)
                                            .custom as Record<string, unknown>
                                        )?.name === 'string'
                                          ? ((
                                              (
                                                machine as Record<
                                                  string,
                                                  unknown
                                                >
                                              ).custom as Record<
                                                string,
                                                unknown
                                              >
                                            ).name as string)
                                          : '';
                                      const customNameTrimmed =
                                        customName.trim();
                                      const hasCustomName =
                                        customNameTrimmed !== '';

                                      // Main identifier: serialNumber if exists, otherwise custom.name, otherwise machineId
                                      return hasSerialNumber
                                        ? serialNumber
                                        : hasCustomName
                                          ? customNameTrimmed
                                          : machine.machineId;
                                    })()}
                                  </span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                </button>
                              ) : (
                                machine.machineName || machine.machineId
                              )}
                            </h4>
                            {/* Location and Game Info */}
                            <p className="text-xs text-muted-foreground">
                              {machine.locationId ? (
                                <button
                                  onClick={() => {
                                    router.push(
                                      `/locations/${machine.locationId}`
                                    );
                                  }}
                                  className="group inline-flex items-center gap-1 text-xs text-gray-900 transition-opacity hover:opacity-80"
                                >
                                  <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                    {machine.locationName}
                                  </span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                </button>
                              ) : (
                                <span>{machine.locationName}</span>
                              )}{' '}
                              •{' '}
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
                              <span
                                className={`font-medium ${getMoneyInColorClass(
                                  machine.drop || 0
                                )}`}
                              >
                                ${(machine.drop || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Net Win:
                              </span>
                              <span
                                className={`font-medium ${getGrossColorClass(
                                  machine.netWin
                                )}`}
                              >
                                ${machine.netWin.toLocaleString()}
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
                              <span
                                className={`font-medium ${
                                  (machine.actualHold || 0) >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {(machine.actualHold || 0).toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Theoretical Hold:
                              </span>
                              <span className="font-medium text-green-600">
                                {machine.theoreticalHold.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Games Played:
                              </span>
                              <span className="font-medium">
                                {machine.gamesPlayed.toLocaleString()}
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
                              <p
                                className={`font-medium ${getMoneyInColorClass(
                                  machine.drop || 0
                                )}`}
                              >
                                ${(machine.drop || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Net Win:
                              </span>
                              <p
                                className={`font-medium ${getGrossColorClass(
                                  machine.netWin
                                )}`}
                              >
                                ${machine.netWin.toLocaleString()}
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
                              <p
                                className={`font-medium ${
                                  machine.actualHold >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {machine.actualHold.toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Theoretical Hold:
                              </span>
                              <p className="text-green-600">
                                {machine.theoreticalHold.toFixed(2)}%
                              </p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">
                                Games Played:
                              </span>
                              <p>{machine.gamesPlayed.toLocaleString()}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>

                  {filteredEvaluationData.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      No machine data available for evaluation
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Machines Offline Report</CardTitle>
              <CardDescription>
                Monitor offline machines and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and filters - always visible, never skeleton */}
              <div className="mb-6 flex flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  <Input
                    placeholder="Search machines..."
                    value={offlineSearchTerm}
                    onChange={e => handleOfflineSearchChange(e.target.value)}
                    className="w-full border-gray-300 text-gray-900 placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="w-full md:w-[420px]">
                  <LocationSingleSelect
                    locations={locations}
                    selectedLocation={offlineSelectedLocation}
                    onSelectionChange={setOfflineSelectedLocation}
                    placeholder="Select Location"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setOfflineLoading(true);
                      setStatsLoading(true);
                      try {
                        await Promise.all([
                          fetchOfflineMachines(1),
                          fetchMachineStats(),
                          refreshLocationMachineStats(),
                        ]);
                      } finally {
                        setOfflineLoading(false);
                        setStatsLoading(false);
                      }
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleExportMeters('pdf')}
                        className="cursor-pointer"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportMeters('excel')}
                        className="cursor-pointer"
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export as Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mb-4">
                <Badge variant="destructive" className="mb-2">
                  {locationMachineStats?.offlineMachines || 0} Machines Offline
                </Badge>
              </div>

              {/* Show skeleton while loading */}
              {offlineLoading ? (
                <MachinesOfflineSkeleton />
              ) : filteredOfflineData.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  {offlineSearchTerm.trim()
                    ? 'No offline machines found matching your search.'
                    : 'No offline machines found for the selected filters.'}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden rounded-md border md:block">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <SortableHeader
                              sortKey="machineId"
                              currentSort={sortConfig}
                              onSort={handleSort}
                            >
                              Machine
                            </SortableHeader>
                            <SortableHeader
                              sortKey="locationName"
                              currentSort={sortConfig}
                              onSort={handleSort}
                            >
                              Location
                            </SortableHeader>
                            <SortableHeader
                              sortKey="lastActivity"
                              currentSort={sortConfig}
                              onSort={handleSort}
                            >
                              Last Activity
                            </SortableHeader>
                            <SortableHeader
                              sortKey="offlineDurationHours"
                              currentSort={sortConfig}
                              onSort={handleSort}
                            >
                              Offline Duration
                            </SortableHeader>
                            <th className="p-3 text-left font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {offlineMachinesWithDuration.map(machine => (
                            <tr
                              key={machine.machineId}
                              className="border-b hover:bg-muted/30"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {/* Status Icon - offline machines don't pulse */}
                                  <div className="flex-shrink-0">
                                    <StatusIcon isOnline={false} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    {/* Machine Name - Format: serialNumber (custom.name, game) */}
                                    <button
                                      onClick={() => {
                                        router.push(
                                          `/cabinets/${machine.machineId}`
                                        );
                                      }}
                                      className="group flex items-center gap-1.5 text-left font-medium text-gray-900 transition-opacity hover:opacity-80"
                                    >
                                      <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                        {(() => {
                                          // Get serialNumber (prefer serialNumber, fallback to origSerialNumber)
                                          const serialNumberRaw =
                                            (
                                              machine.serialNumber?.trim() ||
                                              ((
                                                machine as Record<
                                                  string,
                                                  unknown
                                                >
                                              ).origSerialNumber as
                                                | string
                                                | undefined)
                                            )?.trim() || '';

                                          // Get custom.name
                                          const customName =
                                            machine.customName?.trim() || '';

                                          // Main identifier: serialNumber if exists and not blank, otherwise custom.name, otherwise machineId
                                          const mainIdentifier =
                                            serialNumberRaw ||
                                            customName ||
                                            machine.machineId;

                                          // Get game (gameTitle)
                                          const game =
                                            machine.gameTitle?.trim() || '';

                                          // Format: serialNumber || custom.name (custom.name if different, game)
                                          const parts: string[] = [];

                                          // Only add customName if it's provided AND different from main identifier
                                          if (
                                            customName &&
                                            customName !== mainIdentifier
                                          ) {
                                            parts.push(customName);
                                          }

                                          // Always include game - show "(game name not provided)" in red if blank
                                          if (!game) {
                                            parts.push(
                                              '(game name not provided)'
                                            );
                                          } else {
                                            parts.push(game);
                                          }

                                          return (
                                            <span>
                                              {mainIdentifier} (
                                              {parts.map((part, idx) => {
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
                                                    {idx < parts.length - 1 &&
                                                      ', '}
                                                  </span>
                                                );
                                              })}
                                              )
                                            </span>
                                          );
                                        })()}
                                      </span>
                                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-sm">
                                <button
                                  onClick={() => {
                                    if (machine.locationId) {
                                      router.push(
                                        `/locations/${machine.locationId}`
                                      );
                                    }
                                  }}
                                  className="group flex items-center gap-1.5 text-blue-600 transition-opacity hover:opacity-80"
                                >
                                  <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                    {machine.locationName || 'Unknown'}
                                  </span>
                                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                                </button>
                              </td>
                              <td className="p-3 text-sm">
                                {new Date(machine.lastActivity).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </td>
                              <td className="p-3 text-sm">
                                {machine.offlineDurationFormatted}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMachineEdit(machine)}
                                    className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                                  >
                                    <Pencil2Icon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMachineDelete(machine)}
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Card View for Offline Machines */}
                  <div className="space-y-4 md:hidden">
                    {offlineMachinesWithDuration.map(machine => (
                      <Card key={machine.machineId} className="p-4">
                        <div className="mb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              {/* Status Icon - offline machines don't pulse */}
                              <div className="flex-shrink-0">
                                <StatusIcon isOnline={false} size="sm" />
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                {/* Machine Name - Format: serialNumber (custom.name, game) */}
                                <button
                                  onClick={() => {
                                    router.push(
                                      `/cabinets/${machine.machineId}`
                                    );
                                  }}
                                  className="group flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left"
                                >
                                  <h4 className="min-w-0 flex-1 truncate text-sm font-medium text-blue-600 underline decoration-blue-600 decoration-2 underline-offset-2">
                                    <span className="block truncate">
                                      {(() => {
                                        // Get serialNumber (prefer serialNumber, fallback to origSerialNumber)
                                        const serialNumberRaw =
                                          (
                                            machine.serialNumber?.trim() ||
                                            ((
                                              machine as Record<string, unknown>
                                            ).origSerialNumber as
                                              | string
                                              | undefined)
                                          )?.trim() || '';

                                        // Get custom.name
                                        const customName =
                                          machine.customName?.trim() || '';

                                        // Main identifier: serialNumber if exists and not blank, otherwise custom.name, otherwise machineId
                                        const mainIdentifier =
                                          serialNumberRaw ||
                                          customName ||
                                          machine.machineId;

                                        // Get game (gameTitle)
                                        const game =
                                          machine.gameTitle?.trim() || '';

                                        // Format: serialNumber || custom.name (custom.name if different, game)
                                        const parts: string[] = [];

                                        // Only add customName if it's provided AND different from main identifier
                                        if (
                                          customName &&
                                          customName !== mainIdentifier
                                        ) {
                                          parts.push(customName);
                                        }

                                        // Always include game - show "(game name not provided)" in red if blank
                                        if (!game) {
                                          parts.push(
                                            '(game name not provided)'
                                          );
                                        } else {
                                          parts.push(game);
                                        }

                                        return (
                                          <>
                                            {mainIdentifier} (
                                            {parts.map((part, idx) => {
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
                                                  {idx < parts.length - 1 &&
                                                    ', '}
                                                </span>
                                              );
                                            })}
                                            )
                                          </>
                                        );
                                      })()}
                                    </span>
                                  </h4>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0 text-blue-600" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMachineEdit(machine)}
                                className="h-8 w-8 flex-shrink-0 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                              >
                                <Pencil2Icon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMachineDelete(machine)}
                                className="h-8 w-8 flex-shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Tiny screen layout (< 425px) - Single column */}
                        <div className="block space-y-2 text-xs sm:hidden">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Location:
                            </span>
                            <button
                              onClick={() => {
                                if (machine.locationId) {
                                  router.push(
                                    `/locations/${machine.locationId}`
                                  );
                                }
                              }}
                              className="group flex items-center gap-1 text-blue-600 transition-opacity hover:opacity-80"
                            >
                              <span className="font-medium underline decoration-blue-600 decoration-2 underline-offset-2">
                                {machine.locationName || 'Unknown'}
                              </span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0 text-blue-600" />
                            </button>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Last Activity:
                            </span>
                            <span className="font-medium">
                              {new Date(machine.lastActivity).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Offline Duration:
                            </span>
                            <span className="font-medium">
                              {machine.offlineDurationFormatted}
                            </span>
                          </div>
                        </div>

                        {/* Small screen layout (425px+) - Two columns */}
                        <div className="hidden gap-4 text-sm sm:grid sm:grid-cols-2">
                          <div>
                            <span className="text-muted-foreground">
                              Location:
                            </span>
                            <button
                              onClick={() => {
                                if (machine.locationId) {
                                  router.push(
                                    `/locations/${machine.locationId}`
                                  );
                                }
                              }}
                              className="group flex items-center gap-1 text-blue-600 transition-opacity hover:opacity-80"
                            >
                              <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                {machine.locationName || 'Unknown'}
                              </span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0 text-blue-600" />
                            </button>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Last Activity:
                            </span>
                            <p>
                              {new Date(machine.lastActivity).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Offline Duration:
                            </span>
                            <p>{machine.offlineDurationFormatted}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Offline Machines Pagination */}
              {!offlineLoading &&
                offlineTotalPages > 1 &&
                filteredOfflineData.length > 0 && (
                  <PaginationControls
                    currentPage={offlineCurrentPage}
                    totalPages={offlineTotalPages}
                    setCurrentPage={setOfflineCurrentPage}
                  />
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
