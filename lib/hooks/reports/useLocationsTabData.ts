/**
 * Custom hook for Locations Tab data fetching
 *
 * Handles all data fetching logic for the Locations tab including:
 * - Gaming locations
 * - Aggregated location data with pagination
 * - Top/bottom machines
 * - Location trend data
 * - Metrics totals
 *
 * Features:
 * - Batch loading for pagination
 * - Abortable requests
 * - Loading state management
 * - Error handling
 */

import { fetchDashboardTotals } from '@/lib/helpers/dashboard';
import { fetchAggregatedLocationsData } from '@/lib/helpers/locations';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useReportsStore } from '@/lib/store/reportsStore';
import { DashboardTotals } from '@/lib/types';
import { TimePeriod } from '@/lib/types/api';
import { AggregatedLocation } from '@/lib/types/location';
import { deduplicateRequest } from '@/lib/utils/requestDeduplication';
import { isAbortError } from '@/lib/utils/errors';
import { LocationMetrics, TopLocation } from '@/shared/types';
import { MachineData } from '@/shared/types/machines';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type UseLocationsTabDataProps = {
  activeTab: string;
  selectedSasLocations: string[];
  selectedRevenueLocations: string[];
  itemsPerPage: number;
  itemsPerBatch: number;
  pagesPerBatch: number;
  chartGranularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly';
};

/**
 * Custom hook for Locations Tab data fetching
 */
export function useLocationsTabData({
  activeTab,
  selectedSasLocations,
  selectedRevenueLocations,
  itemsPerPage,
  itemsPerBatch,
  pagesPerBatch,
  chartGranularity,
}: UseLocationsTabDataProps) {
  // ============================================================================
  // Store & Hooks
  // ============================================================================
  const { activeMetricsFilter, customDateRange, selectedLicencee } =
    useDashBoardStore();
  const { setLoading } = useReportsStore();
  const { displayCurrency } = useCurrencyFormat();

  // ============================================================================
  // State
  // ============================================================================
  const [gamingLocations, setGamingLocations] = useState<
    Record<string, unknown>[]
  >([]);
  const [gamingLocationsLoading, setGamingLocationsLoading] = useState(true);
  const [locationAggregates, setLocationAggregates] = useState<
    Record<string, unknown>[]
  >([]);
  const [locationAggregatesLoading, setLocationAggregatesLoading] =
    useState(false);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [metricsOverview, setMetricsOverview] =
    useState<LocationMetrics | null>(null);
  const [topLocations, setTopLocations] = useState<TopLocation[]>([]);
  const [metricsTotals, setMetricsTotals] = useState<DashboardTotals | null>(
    null
  );
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(false);
  const [topMachinesData, setTopMachinesData] = useState<MachineData[]>([]);
  const [topMachinesLoading, setTopMachinesLoading] = useState(false);
  const [bottomMachinesData, setBottomMachinesData] = useState<MachineData[]>(
    []
  );
  const [bottomMachinesLoading, setBottomMachinesLoading] = useState(false);
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
  const [accumulatedLocations, setAccumulatedLocations] = useState<
    AggregatedLocation[]
  >([]);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  const [paginationLoading, setPaginationLoading] = useState(true);
  const [allLocationsForDropdown, setAllLocationsForDropdown] = useState<
    AggregatedLocation[]
  >([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ============================================================================
  // Abort Controllers
  // ============================================================================
  const makeLocationDataRequest = useAbortableRequest();
  const makeTopMachinesRequest = useAbortableRequest();
  const makeBottomMachinesRequest = useAbortableRequest();
  const makeTrendDataRequest = useAbortableRequest();
  const makeGamingLocationsRequest = useAbortableRequest();
  const makeLocationAggregationRequest = useAbortableRequest();

  // Ref to track latest metricsTotals for use in other callbacks without causing loops
  const metricsTotalsRef = useRef<DashboardTotals | null>(null);
  useEffect(() => {
    metricsTotalsRef.current = metricsTotals;
  }, [metricsTotals]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Calculate which batch we need based on current page
   */
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  /**
   * Convert activeMetricsFilter to TimePeriod
   */
  const getTimePeriod = useCallback((): TimePeriod => {
    if (activeMetricsFilter === 'Today') return 'Today';
    if (activeMetricsFilter === 'Yesterday') return 'Yesterday';
    if (activeMetricsFilter === 'last7days' || activeMetricsFilter === '7d')
      return '7d';
    if (activeMetricsFilter === 'last30days' || activeMetricsFilter === '30d')
      return '30d';
    if (activeMetricsFilter === 'Quarterly') return 'Quarterly';
    if (activeMetricsFilter === 'All Time') return 'All Time';
    if (activeMetricsFilter === 'Custom') return 'Custom';
    return 'Today';
  }, [activeMetricsFilter]);

  /**
   * Build time period params for API calls
   */
  const buildTimePeriodParams = useCallback(
    (params: Record<string, string | string[]>) => {
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
        params.startDate = sd.toISOString().split('T')[0];
        params.endDate = ed.toISOString().split('T')[0];
      } else {
        params.timePeriod = 'Today';
      }
    },
    [activeMetricsFilter, customDateRange]
  );

  // ============================================================================
  // Data Fetching Functions
  // ============================================================================

  /**
   * Fast fetch for gaming locations (Phase 1)
   */
  const fetchGamingLocationsAsync = useCallback(async () => {
    await makeGamingLocationsRequest(async signal => {
      setGamingLocationsLoading(true);
      try {
        const params = new URLSearchParams();
        // Always pass licensee parameter so API knows user's selection
        if (selectedLicencee) {
          params.append('licencee', selectedLicencee);
        }

        const response = await axios.get(
          `/api/locations?${params.toString()}`,
          {
            signal,
          }
        );
        const { locations: locationsData } = response.data;
        setGamingLocations(locationsData || []);
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }
          console.error('Error loading gaming locations:', error);
          setGamingLocations([]);
      } finally {
        setGamingLocationsLoading(false);
      }
    });
  }, [selectedLicencee, makeGamingLocationsRequest]);

  /**
   * Fetch location aggregation data for map (same API as dashboard)
   */
  const fetchLocationAggregationAsync = useCallback(async () => {
    await makeLocationAggregationRequest(async signal => {
      setLocationAggregatesLoading(true);
      try {
        const params = new URLSearchParams();

        // Set time period
        if (activeMetricsFilter === 'Today') {
          params.append('timePeriod', 'Today');
        } else if (activeMetricsFilter === 'Yesterday') {
          params.append('timePeriod', 'Yesterday');
        } else if (activeMetricsFilter === '7d') {
          params.append('timePeriod', '7d');
        } else if (activeMetricsFilter === '30d') {
          params.append('timePeriod', '30d');
        } else if (activeMetricsFilter === 'All Time') {
          params.append('timePeriod', 'All Time');
        } else if (activeMetricsFilter === 'Custom' && customDateRange) {
          if (customDateRange.startDate && customDateRange.endDate) {
            const sd =
              customDateRange.startDate instanceof Date
                ? customDateRange.startDate
                : new Date(customDateRange.startDate as string);
            const ed =
              customDateRange.endDate instanceof Date
                ? customDateRange.endDate
                : new Date(customDateRange.endDate as string);
            params.append('startDate', sd.toISOString());
            params.append('endDate', ed.toISOString());
            params.append('timePeriod', 'Custom');
          } else {
            return;
          }
        } else {
          return;
        }

        if (selectedLicencee && selectedLicencee !== 'all') {
          params.append('licencee', selectedLicencee);
        }

        if (displayCurrency) {
          params.append('currency', displayCurrency);
        }

        // Request all locations (high limit like dashboard)
        params.append('limit', '1000000');
        params.append('page', '1');

        const requestKey = `/api/locationAggregation?${params.toString()}`;

        // Use deduplication to prevent duplicate requests
        const locationData = await deduplicateRequest(
          requestKey,
          async abortSignal => {
            const res = await axios.get(requestKey, {
              signal: abortSignal || signal,
            });
            return res.data;
          }
        );

        // Log response structure for debugging
        console.log('🔍 [useLocationsTabData] LocationAggregation response:', {
          hasData: !!locationData.data,
          isArray: Array.isArray(locationData.data),
          dataLength: Array.isArray(locationData.data)
            ? locationData.data.length
            : 0,
          totalCount: locationData.totalCount || 0,
          responseKeys: Object.keys(locationData),
          sampleItem:
            Array.isArray(locationData.data) && locationData.data.length > 0
              ? locationData.data[0]
              : null,
        });

        // API returns { data: [...], totalCount: ..., page: ..., limit: ... }
        // Same structure as dashboard uses
        setLocationAggregates(locationData.data || []);
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }
          console.error('Error fetching location aggregation:', error);
          setLocationAggregates([]);
      } finally {
        setLocationAggregatesLoading(false);
      }
    });
  }, [
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    makeLocationAggregationRequest,
  ]);

  /**
   * Fetch a specific batch of locations
   */
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

      const timePeriod = getTimePeriod();

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
        timePeriod,
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
      getTimePeriod,
    ]
  );

  /**
   * Fetch metrics totals from dashboard API
   */
  const fetchMetricsTotals = useCallback(async () => {
    setMetricsTotalsLoading(true);
    try {
      await fetchDashboardTotals(
        (activeMetricsFilter || 'Today') as TimePeriod,
        customDateRange || {
          startDate: new Date(),
          endDate: new Date(),
        },
        selectedLicencee,
        (totals: DashboardTotals | null) => {
          setMetricsTotals(totals);
          setMetricsTotalsLoading(false);
        },
        displayCurrency
      );
    } catch (error) {
      // Silently handle aborted requests - this is expected behavior when switching filters
      if (isAbortError(error)) {
        return;
      }
      console.error('Error fetching metrics totals:', error);
      setMetricsTotalsLoading(false);
    }
  }, [activeMetricsFilter, customDateRange, selectedLicencee, displayCurrency]);

  /**
   * Simplified data fetching for locations with batch loading
   */
  const fetchLocationDataAsync = useCallback(
    async (specificLocations?: string[]) => {
      const result = await makeLocationDataRequest(async signal => {
        setGamingLocationsLoading(true);
        setLocationsLoading(true);
        setMetricsLoading(true);
        setPaginationLoading(true);
        setLoading(true);

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
          specificLocations || currentSelectedLocations;

        // Optimization: For SAS Evaluation and Revenue Analysis, do NOT fetch table data
        // until locations are explicitly selected. This prevents slow initial load.
        const shouldSkipTableFetch =
          (activeTab === 'sas-evaluation' ||
            activeTab === 'location-evaluation' ||
            activeTab === 'location-revenue') &&
          effectiveLocations.length === 0;

        // Fetch first batch (50 items) for table ONLY if we shouldn't skip
        let firstBatchResult;

        if (shouldSkipTableFetch) {
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
        // Request aborted - reset loading states
        setPaginationLoading(false);
        setLocationsLoading(false);
        setMetricsLoading(false);
        setGamingLocationsLoading(false);
        setLoading(false);
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

        // Build API parameters for dropdown
        const params: Record<string, string> = {
          limit: '1000',
          page: '1',
          showAllLocations: 'true',
          summary: 'true',
        };

        if (selectedLicencee && selectedLicencee !== 'all') {
          params.licencee = selectedLicencee;
        }

        if (displayCurrency) {
          params.currency = displayCurrency;
        }

        if (activeTab === 'location-evaluation') {
          params.sasEvaluationOnly = 'true';
        }

        buildTimePeriodParams(params);

        // API call to get location data with financial metrics
        const response = await axios.get('/api/reports/locations', {
          params,
          timeout: 60000,
        });

        if (response.data.error) {
          console.error('❌ LocationData API Error:', response.data.error);
          toast.error('Failed to fetch location data. Please try again.', {
            duration: 3000,
          });
          throw new Error(response.data.error);
        }

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

        // Store locations for dropdown selection
        setAllLocationsForDropdown(normalizedLocations);
        setLocationsLoading(false);

        // Filter data based on selected locations if any are selected
        const currentSelectedLocations =
          activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
            ? selectedSasLocations
            : selectedRevenueLocations;

        const filteredData =
          currentSelectedLocations.length > 0
            ? normalizedLocations.filter((loc: Record<string, unknown>) => {
                const locId = String(loc.location || '');
                return currentSelectedLocations.some(
                  selectedId => String(selectedId) === locId
                );
              })
            : normalizedLocations;

        // Calculate metrics overview
        let overview: LocationMetrics;

        if (currentSelectedLocations.length === 0) {
          // No locations selected - use dashboard totals for overview
          // Use latest value from ref to avoid dependency loop
          const currentMetricsTotals = metricsTotalsRef.current;
          const dashboardTotals: DashboardTotals = currentMetricsTotals || {
            moneyIn: 0,
            moneyOut: 0,
            gross: 0,
          };

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
          overview = filteredData.reduce(
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

        // Get top 5 locations for overview
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
          .map((loc: Record<string, unknown>) => {
            // Extract coordinates from geoCoords
            const geoCoords = loc.geoCoords as
              | {
                  lat?: number;
                  lng?: number;
                  latitude?: number;
                  longitude?: number;
                }
              | undefined;
            let coordinates: [number, number] | undefined;
            if (geoCoords) {
              const lat = geoCoords.lat ?? geoCoords.latitude;
              const lng = geoCoords.lng ?? geoCoords.longitude;
              if (
                lat !== undefined &&
                lng !== undefined &&
                lat !== 0 &&
                lng !== 0
              ) {
                coordinates = [lat, lng];
              }
            }

            return {
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
              coordinates,
              holdPercentage:
                (loc.moneyIn as number) > 0
                  ? ((loc.gross as number) / (loc.moneyIn as number)) * 100
                  : 0,
            };
          });

        setTopLocations(sorted);
        setLocationsLoading(false);
        setGamingLocationsLoading(false);
        setPaginationLoading(false);
        setLoading(false);

        return true;
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return null;
        }

        console.error('❌ Error fetching location data:', error);

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

        setGamingLocationsLoading(false);
        setLocationsLoading(false);
        setMetricsLoading(false);
        setPaginationLoading(false);
        setLoading(false);
        setAllLocationsForDropdown([]);
        setMetricsOverview(null);
        setTopLocations([]);

        return null;
      }
    },
    [
      selectedLicencee,
      activeTab,
      fetchGamingLocationsAsync,
      selectedSasLocations,
      selectedRevenueLocations,
      displayCurrency,
      setLoading,
      fetchBatch,
      itemsPerBatch,
      itemsPerPage,
      makeLocationDataRequest,
      buildTimePeriodParams,
    ]
  );

  /**
   * Function to fetch top machines data
   */
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
      // Don't set global loading - use specific topMachinesLoading state
      try {
        const params: Record<string, string | string[]> = {
          type: 'all',
        };

        if (currentSelectedLocations.length > 0) {
          if (currentSelectedLocations.length === 1) {
            params.locationId = currentSelectedLocations[0];
          }
        }

        if (selectedLicencee && selectedLicencee !== 'all') {
          params.licencee = selectedLicencee;
        }

        buildTimePeriodParams(params);

        const response = await axios.get('/api/reports/machines', {
          params,
          signal,
        });
        const { data: machinesData } = response.data;

        const filteredMachines = (machinesData || [])
          .filter((machine: MachineData) => {
            const machineLocationId = String(machine.locationId || '');
            return currentSelectedLocations.some(
              selectedId => String(selectedId) === machineLocationId
            );
          })
          .sort(
            (a: MachineData, b: MachineData) =>
              (b.netWin || 0) - (a.netWin || 0)
          )
          .slice(0, 5);

        setTopMachinesData(filteredMachines);
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }
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
      } finally {
        setTopMachinesLoading(false);
        // Don't set global loading - use specific topMachinesLoading state
      }
    });
  }, [
    selectedSasLocations,
    selectedRevenueLocations,
    activeTab,
    selectedLicencee,
    buildTimePeriodParams,
    makeTopMachinesRequest,
  ]);

  /**
   * Function to fetch bottom machines data (least performing)
   */
  const fetchBottomMachines = useCallback(async () => {
    const currentSelectedLocations =
      activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
        ? selectedSasLocations
        : selectedRevenueLocations;
    if (currentSelectedLocations.length === 0) {
      setBottomMachinesData([]);
      return;
    }

    await makeBottomMachinesRequest(async signal => {
      setBottomMachinesLoading(true);
      // Don't set global loading - use specific bottomMachinesLoading state
      try {
        const params: Record<string, string | string[]> = {
          type: 'all',
        };

        if (currentSelectedLocations.length > 0) {
          if (currentSelectedLocations.length === 1) {
            params.locationId = currentSelectedLocations[0];
          }
        }

        if (selectedLicencee && selectedLicencee !== 'all') {
          params.licencee = selectedLicencee;
        }

        buildTimePeriodParams(params);

        const response = await axios.get('/api/reports/machines', {
          params,
          signal,
        });
        const { data: machinesData } = response.data;

        const filteredMachines = (machinesData || [])
          .filter((machine: MachineData) => {
            const machineLocationId = String(machine.locationId || '');
            return currentSelectedLocations.some(
              selectedId => String(selectedId) === machineLocationId
            );
          })
          .sort(
            (a: MachineData, b: MachineData) =>
              (a.netWin || 0) - (b.netWin || 0)
          )
          .slice(0, 5);

        setBottomMachinesData(filteredMachines);
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }
          const errorMessage = axios.isAxiosError(error)
            ? error.response?.data?.error || error.message
            : error instanceof Error
              ? error.message
              : 'Failed to fetch bottom machines data';
          console.error('Error fetching bottom machines:', errorMessage, error);
          toast.error(
            `Failed to fetch least performing machines: ${errorMessage}`,
            {
              duration: 3000,
            }
          );
          setBottomMachinesData([]);
      } finally {
        setBottomMachinesLoading(false);
        // Don't set global loading - use specific bottomMachinesLoading state
      }
    });
  }, [
    selectedSasLocations,
    selectedRevenueLocations,
    activeTab,
    selectedLicencee,
    buildTimePeriodParams,
    makeBottomMachinesRequest,
  ]);

  /**
   * Function to fetch location trend data (daily or hourly based on time period)
   */
  const fetchLocationTrendData = useCallback(
    async (overrideLocationIds?: string[]) => {
      const currentSelectedLocations =
        activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
          ? selectedSasLocations
          : selectedRevenueLocations;

      const locationsToFetch = overrideLocationIds || currentSelectedLocations;

      if (locationsToFetch.length === 0) {
        setLocationTrendData(null);
        return;
      }

      await makeTrendDataRequest(async signal => {
        setLocationTrendLoading(true);
        try {
          const params: Record<string, string> = {
            locationIds: locationsToFetch.join(','),
          };

          if (selectedLicencee && selectedLicencee !== 'all') {
            params.licencee = selectedLicencee;
          }

          if (displayCurrency) {
            params.currency = displayCurrency;
          }

          buildTimePeriodParams(params);

          if (chartGranularity) {
            params.granularity = chartGranularity;
          }

          const response = await axios.get('/api/analytics/location-trends', {
            params,
            signal,
            timeout: 120000,
          });
          setLocationTrendData(response.data);
        } catch (error) {
          // Silently handle aborted requests - this is expected behavior when switching filters
          if (isAbortError(error)) {
            return;
          }
            console.error('Error fetching location trend data:', error);
            if (axios.isAxiosError(error) && error.response?.status !== 500) {
              toast.error('Failed to fetch location trend data', {
                duration: 3000,
              });
            }
            setLocationTrendData(null);
        } finally {
          setLocationTrendLoading(false);
        }
      });
    },
    [
      selectedSasLocations,
      selectedRevenueLocations,
      activeTab,
      selectedLicencee,
      displayCurrency,
      chartGranularity,
      makeTrendDataRequest,
      buildTimePeriodParams,
    ]
  );

  // ============================================================================
  // Computed: paginatedLocations from accumulatedLocations
  // ============================================================================
  const paginatedLocations = useMemo(() => {
    if (accumulatedLocations.length === 0) return [];
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return accumulatedLocations.slice(startIndex, endIndex);
  }, [accumulatedLocations, currentPage, itemsPerPage]);

  // ============================================================================
  // Create stable date range key to prevent infinite loops
  // ============================================================================
  const dateRangeKey = useMemo(() => {
    if (!customDateRange?.startDate || !customDateRange?.endDate) {
      return '';
    }
    return `${customDateRange.startDate.getTime()}-${customDateRange.endDate.getTime()}`;
  }, [customDateRange?.startDate, customDateRange?.endDate]);

  // ============================================================================
  // Refetch when filters change
  // ============================================================================
  // Track previous filter values to prevent infinite loops when callbacks change
  // Fetch location data and metrics totals when filters change
  useEffect(() => {
    void fetchLocationDataAsync();
    void fetchMetricsTotals();
    void fetchLocationAggregationAsync(); // Fetch location aggregation for map
  }, [
    activeMetricsFilter,
    dateRangeKey,
    selectedLicencee,
    displayCurrency,
    fetchLocationDataAsync,
    fetchMetricsTotals,
    fetchLocationAggregationAsync,
  ]);

  return {
    // State
    gamingLocations,
    gamingLocationsLoading,
    locationAggregates,
    locationAggregatesLoading,
    metricsLoading,
    locationsLoading,
    metricsOverview,
    topLocations,
    metricsTotals,
    metricsTotalsLoading,
    topMachinesData,
    topMachinesLoading,
    bottomMachinesData,
    bottomMachinesLoading,
    locationTrendData,
    locationTrendLoading,
    accumulatedLocations,
    loadedBatches,
    paginatedLocations,
    paginationLoading,
    allLocationsForDropdown,
    currentPage,
    totalPages,
    totalCount,
    // Setters
    setCurrentPage,
    setAccumulatedLocations,
    setLoadedBatches,
    setPaginationLoading,
    setLocationsLoading,
    setMetricsLoading,
    setGamingLocationsLoading,
    setMetricsOverview,
    setTopLocations,
    setTopMachinesData,
    setTopMachinesLoading,
    setBottomMachinesData,
    setBottomMachinesLoading,
    setLocationTrendData,
    setLocationTrendLoading,
    setAllLocationsForDropdown,
    setTotalPages,
    setTotalCount,
    setMetricsTotals,
    setMetricsTotalsLoading,
    // Functions
    fetchGamingLocationsAsync,
    fetchBatch,
    fetchMetricsTotals,
    fetchLocationDataAsync,
    fetchTopMachines,
    fetchBottomMachines,
    fetchLocationTrendData,
    calculateBatchNumber,
  };
}

