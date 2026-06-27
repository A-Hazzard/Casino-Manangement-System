/**
 * Custom hook for Locations Tab data fetching
 *
 * Handles all API data fetching logic for the Locations tab including:
 * - Gaming locations
 * - Aggregated location data with pagination
 * - Top/bottom machines
 * - Location trend data
 * - Metrics totals
 *
 * @module lib/hooks/reports/useLocationsFetching
 */

import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { fetchDashboardTotals } from '@/lib/helpers/dashboard';
import { fetchAggregatedLocationsData } from '@/lib/helpers/locations';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { deduplicateRequest } from '@/lib/utils/requestDeduplication';
import { isAbortError } from '@/lib/utils/errors';
import { LocationMetrics, TopLocation } from '@/shared/types';
import { MachineData } from '@/shared/types/machines';
import { LocationTrendsResponse } from '@/shared/types/reports';
import { DashboardTotals } from '@/lib/types';
import { AggregatedLocation } from '@/lib/types/location';
import type { MapPreviewLocation } from '@/lib/types/components';
import { TimePeriod } from '@/lib/types/api';

type UseLocationsFetchingProps = {
  activeTab: string;
  selectedSasLocations: string[];
  selectedRevenueLocations: string[];
  itemsPerPage: number;
  itemsPerBatch: number;
  chartGranularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly';
  // From filtering hook
  timePeriod: TimePeriod;
  hasCustomDateRange: boolean;
  customDateRange: { startDate: Date | null; endDate: Date | null } | null;
  effectiveLicencee: string;
  displayCurrency: string;
  getTimePeriod: () => TimePeriod;
  buildTimePeriodParams: (params: Record<string, string | string[]>) => void;
  calculateBatchNumber: (page: number) => number;
};

/**
 * Custom hook for Locations Tab data fetching
 */
export function useLocationsFetching({
  activeTab,
  selectedSasLocations,
  selectedRevenueLocations,
  itemsPerPage,
  itemsPerBatch,
  chartGranularity,
  timePeriod,
  hasCustomDateRange,
  customDateRange,
  effectiveLicencee,
  displayCurrency,
  getTimePeriod,
  buildTimePeriodParams,
  calculateBatchNumber,
}: UseLocationsFetchingProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [gamingLocations, setGamingLocations] = useState<MapPreviewLocation[]>([]);
  const [gamingLocationsLoading, setGamingLocationsLoading] = useState(true);
  const [locationAggregates, setLocationAggregates] = useState<AggregatedLocation[]>([]);
  const [locationAggregatesLoading, setLocationAggregatesLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [metricsOverview, setMetricsOverview] = useState<LocationMetrics | null>(null);
  const [topLocations, setTopLocations] = useState<TopLocation[]>([]);
  const [metricsTotals, setMetricsTotals] = useState<DashboardTotals | null>(null);
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(false);
  const [topMachinesData, setTopMachinesData] = useState<MachineData[]>([]);
  const [topMachinesLoading, setTopMachinesLoading] = useState(false);
  const [bottomMachinesData, setBottomMachinesData] = useState<MachineData[]>([]);
  const [bottomMachinesLoading, setBottomMachinesLoading] = useState(false);
  const [locationTrendData, setLocationTrendData] = useState<LocationTrendsResponse | null>(null);
  const [locationTrendLoading, setLocationTrendLoading] = useState(false);
  const [accumulatedLocations, setAccumulatedLocations] = useState<AggregatedLocation[]>([]);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  const [paginationLoading, setPaginationLoading] = useState(true);
  const [allLocationsForDropdown, setAllLocationsForDropdown] = useState<AggregatedLocation[]>([]);
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
  const makeBatchLoadRequest = useAbortableRequest();

  // Ref to track latest metricsTotals for use in other callbacks without causing loops
  const metricsTotalsRef = useRef<DashboardTotals | null>(null);
  useEffect(() => {
    metricsTotalsRef.current = metricsTotals;
  }, [metricsTotals]);

  // ============================================================================
  // Data Fetching Functions
  // ============================================================================

  /**
   * Fast fetch for gaming locations (Phase 1)
   */
  const fetchGamingLocationsAsync = useCallback(async () => {
    await makeGamingLocationsRequest(async (signal) => {
      setGamingLocationsLoading(true);
      try {
        const params = new URLSearchParams();
        if (effectiveLicencee) {
          params.append('licencee', effectiveLicencee);
        }

        const response = await axios.get(`/api/locations?${params.toString()}`, {
          signal,
        });
        const { locations: locationsData } = response.data;
        setGamingLocations(locationsData || []);
      } catch (error) {
        if (isAbortError(error)) return;
        console.error('Error loading gaming locations:', error);
        setGamingLocations([]);
      } finally {
        setGamingLocationsLoading(false);
      }
    });
  }, [effectiveLicencee, makeGamingLocationsRequest]);

  /**
   * Fetch location aggregation data for map
   */
  const fetchLocationAggregationAsync = useCallback(async () => {
    await makeLocationAggregationRequest(async (signal) => {
      setLocationAggregatesLoading(true);
      try {
        const params = new URLSearchParams();

        if (timePeriod === 'Today') {
          params.append('timePeriod', 'Today');
        } else if (timePeriod === 'Yesterday') {
          params.append('timePeriod', 'Yesterday');
        } else if (timePeriod === '7d') {
          params.append('timePeriod', '7d');
        } else if (timePeriod === '30d') {
          params.append('timePeriod', '30d');
        } else if (timePeriod === 'All Time') {
          params.append('timePeriod', 'All Time');
        } else if (timePeriod === 'Custom' && hasCustomDateRange) {
          params.append('timePeriod', 'Custom');
          // Note: Custom dates handled differently in aggregation endpoint
        } else {
          return;
        }

        if (effectiveLicencee) {
          params.append('licencee', effectiveLicencee);
        }

        if (displayCurrency) {
          params.append('currency', displayCurrency);
        }

        params.append('limit', '1000000');
        params.append('page', '1');

        const requestKey = `/api/locationAggregation?${params.toString()}`;

        const locationData = await deduplicateRequest(
          requestKey,
          async (abortSignal) => {
            const res = await axios.get(requestKey, {
              signal: abortSignal || signal,
            });
            return res.data;
          }
        );

        setLocationAggregates(locationData.data || []);
      } catch (error) {
        if (isAbortError(error)) return;
        console.error('Error fetching location aggregation:', error);
        setLocationAggregates([]);
      } finally {
        setLocationAggregatesLoading(false);
      }
    });
  }, [
    timePeriod,
    hasCustomDateRange,
    effectiveLicencee,
    displayCurrency,
    makeLocationAggregationRequest,
  ]);

  /**
   * Fetch a specific batch of locations
   */
  const fetchBatch = useCallback(
    async (page: number = 1, limit: number = 50, signal?: AbortSignal) => {
      let dateRange: { from: Date; to: Date } | undefined;
      if (hasCustomDateRange && customDateRange?.startDate && customDateRange?.endDate) {
        dateRange = {
          from: customDateRange.startDate instanceof Date
            ? customDateRange.startDate
            : new Date(customDateRange.startDate as string),
          to: customDateRange.endDate instanceof Date
            ? customDateRange.endDate
            : new Date(customDateRange.endDate as string),
        };
      }

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
        getTimePeriod(),
        effectiveLicencee,
        '',
        dateRange ?? { from: new Date(), to: new Date() },
        displayCurrency,
        page,
        limit,
        signal,
        locationsToFetch
      );
    },
    [
      activeTab,
      selectedSasLocations,
      selectedRevenueLocations,
      effectiveLicencee,
      displayCurrency,
      hasCustomDateRange,
      customDateRange,
      getTimePeriod,
    ]
  );

  /**
   * Load a subsequent batch of locations
   */
  const loadLocationBatch = useCallback(
    async (batch: number) => {
      await makeBatchLoadRequest(async (signal) => {
        const result = await fetchBatch(batch, itemsPerBatch, signal);
        if (!result || !Array.isArray(result.data)) return;

        setAccumulatedLocations((prev) => {
          const getId = (loc: AggregatedLocation) =>
            String(
              (loc as Record<string, unknown>).location ?? loc._id ?? ''
            );
          const existingIds = new Set(prev.map(getId));
          const uniqueNew = (result.data as AggregatedLocation[]).filter(
            (loc) => {
              const id = getId(loc);
              return id !== '' && !existingIds.has(id);
            }
          );
          return [...prev, ...uniqueNew];
        });
      });
    },
    [fetchBatch, itemsPerBatch, makeBatchLoadRequest]
  );

  /**
   * Fetch metrics totals from dashboard API
   */
  const fetchMetricsTotals = useCallback(async () => {
    setMetricsTotalsLoading(true);
    try {
      await fetchDashboardTotals(
        (timePeriod || 'Today') as import('@/lib/types/api').TimePeriod,
        hasCustomDateRange && customDateRange?.startDate && customDateRange?.endDate
          ? { startDate: customDateRange.startDate, endDate: customDateRange.endDate }
          : { startDate: undefined, endDate: undefined },
        effectiveLicencee,
        (totals: DashboardTotals | null) => {
          setMetricsTotals(totals);
          setMetricsTotalsLoading(false);
        },
        displayCurrency
      );
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error fetching metrics totals:', error);
      setMetricsTotalsLoading(false);
    }
  }, [timePeriod, effectiveLicencee, displayCurrency, hasCustomDateRange, customDateRange]);

  /**
   * Simplified data fetching for locations with batch loading
   */
  const fetchLocationDataAsync = useCallback(
    async (specificLocations?: string[]) => {
      const result = await makeLocationDataRequest(async (signal) => {
        setGamingLocationsLoading(true);
        setLocationsLoading(true);
        setMetricsLoading(true);
        setPaginationLoading(true);

        await fetchGamingLocationsAsync();
        setGamingLocationsLoading(false);

        setAccumulatedLocations([]);
        setLoadedBatches(new Set());
        setCurrentPage(0);

        const currentSelectedLocations =
          activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
            ? selectedSasLocations
            : activeTab === 'location-revenue'
              ? selectedRevenueLocations
              : [];

        const effectiveLocations = specificLocations || currentSelectedLocations;

        const shouldSkipTableFetch =
          (activeTab === 'sas-evaluation' ||
            activeTab === 'location-evaluation' ||
            activeTab === 'location-revenue') &&
          effectiveLocations.length === 0;

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
        setPaginationLoading(false);
        setLocationsLoading(false);
        setMetricsLoading(false);
        setGamingLocationsLoading(false);
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

        if (effectiveLicencee) {
          params.licencee = effectiveLicencee;
        }

        if (displayCurrency) {
          params.currency = displayCurrency;
        }

        if (activeTab === 'location-evaluation') {
          params.sasEvaluationOnly = 'true';
        }

        buildTimePeriodParams(params);

        const response = await axios.get('/api/reports/locations', {
          params,
          timeout: 60000,
        });

        if (response.data.error) {
          console.error('❌ LocationData API Error:', response.data.error);
          throw new Error(response.data.error);
        }

        const locationData = response.data.data || [];

        const normalizedLocations = locationData.map(
          (loc: Record<string, unknown>) => ({
            ...loc,
            gross: loc.gross || 0,
            locationName:
              loc.locationName || loc.name || loc.location || 'Unknown',
          })
        );

        setAllLocationsForDropdown(normalizedLocations);
        setLocationsLoading(false);

        const currentSelectedLocations =
          activeTab === 'sas-evaluation' || activeTab === 'location-evaluation'
            ? selectedSasLocations
            : selectedRevenueLocations;

        const filteredData =
          currentSelectedLocations.length > 0
            ? normalizedLocations.filter((loc: Record<string, unknown>) => {
                const locId = String(loc.location || '');
                return currentSelectedLocations.some(
                  (selectedId) => String(selectedId) === locId
                );
              })
            : normalizedLocations;

        let overview: LocationMetrics;

        if (currentSelectedLocations.length === 0) {
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

        const dataForTopLocations =
          currentSelectedLocations.length > 0
            ? filteredData
            : normalizedLocations;
        const sorted = dataForTopLocations
          .slice()
          .sort(
            (a: Record<string, unknown>, b: Record<string, unknown>) =>
              ((b.gross as number) || 0) - ((a.gross as number) || 0)
          )
          .slice(0, 5)
          .map((loc: Record<string, unknown>) => {
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
              sasEnabled:
                loc.hasSasMachines || (loc.sasMachines as number) > 0,
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

        return true;
      } catch (error) {
        if (isAbortError(error)) return null;

        console.error('❌ Error fetching location data:', error);

        if (axios.isAxiosError(error)) {
          if (error.response?.status === 500) {
            toast.error('Server error: Database query timeout. Please try again.', {
              duration: 3000,
            });
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
        setAllLocationsForDropdown([]);
        setMetricsOverview(null);
        setTopLocations([]);

        return null;
      }
    },
    [
      effectiveLicencee,
      activeTab,
      fetchGamingLocationsAsync,
      selectedSasLocations,
      selectedRevenueLocations,
      displayCurrency,
      fetchBatch,
      itemsPerBatch,
      itemsPerPage,
      makeLocationDataRequest,
      buildTimePeriodParams,
    ]
  );

  /**
   * Fetch top machines data
   */
  const fetchTopMachines = useCallback(async () => {
    await makeTopMachinesRequest(async (signal) => {
      setTopMachinesLoading(true);
      try {
        let locationsToFetch: string[] = [];
        if (
          activeTab === 'sas-evaluation' ||
          activeTab === 'location-evaluation'
        ) {
          locationsToFetch = selectedSasLocations;
        } else if (activeTab === 'location-revenue') {
          locationsToFetch = selectedRevenueLocations;
        }

        const params = new URLSearchParams();
        params.append('timePeriod', getTimePeriod());
        params.append('limit', '10');
        params.append('sort', 'gross');
        params.append('order', 'desc');
        if (effectiveLicencee) params.append('licencee', effectiveLicencee);
        if (displayCurrency) params.append('currency', displayCurrency);
        if (locationsToFetch.length > 0) {
          params.append('locations', locationsToFetch.join(','));
        }

        const response = await axios.get(
          `/api/reports/machines?${params.toString()}`,
          { signal }
        );
        setTopMachinesData(response.data.data || []);
      } catch (error) {
        if (isAbortError(error)) return;
        console.error('Error fetching top machines:', error);
        setTopMachinesData([]);
      } finally {
        setTopMachinesLoading(false);
      }
    });
  }, [
    activeTab,
    selectedSasLocations,
    selectedRevenueLocations,
    effectiveLicencee,
    displayCurrency,
    getTimePeriod,
    makeTopMachinesRequest,
  ]);

  /**
   * Fetch bottom machines data
   */
  const fetchBottomMachines = useCallback(async () => {
    await makeBottomMachinesRequest(async (signal) => {
      setBottomMachinesLoading(true);
      try {
        let locationsToFetch: string[] = [];
        if (
          activeTab === 'sas-evaluation' ||
          activeTab === 'location-evaluation'
        ) {
          locationsToFetch = selectedSasLocations;
        } else if (activeTab === 'location-revenue') {
          locationsToFetch = selectedRevenueLocations;
        }

        const params = new URLSearchParams();
        params.append('timePeriod', getTimePeriod());
        params.append('limit', '10');
        params.append('sort', 'gross');
        params.append('order', 'asc');
        if (effectiveLicencee) params.append('licencee', effectiveLicencee);
        if (displayCurrency) params.append('currency', displayCurrency);
        if (locationsToFetch.length > 0) {
          params.append('locations', locationsToFetch.join(','));
        }

        const response = await axios.get(
          `/api/reports/machines?${params.toString()}`,
          { signal }
        );
        setBottomMachinesData(response.data.data || []);
      } catch (error) {
        if (isAbortError(error)) return;
        console.error('Error fetching bottom machines:', error);
        setBottomMachinesData([]);
      } finally {
        setBottomMachinesLoading(false);
      }
    });
  }, [
    activeTab,
    selectedSasLocations,
    selectedRevenueLocations,
    effectiveLicencee,
    displayCurrency,
    getTimePeriod,
    makeBottomMachinesRequest,
  ]);

  /**
   * Fetch location trend data
   */
  const fetchLocationTrendData = useCallback(async () => {
    await makeTrendDataRequest(async (signal) => {
      setLocationTrendLoading(true);
      try {
        let locationsToFetch: string[] = [];
        if (
          activeTab === 'sas-evaluation' ||
          activeTab === 'location-evaluation'
        ) {
          locationsToFetch = selectedSasLocations;
        } else if (activeTab === 'location-revenue') {
          locationsToFetch = selectedRevenueLocations;
        }

        const params = new URLSearchParams();
        params.append('timePeriod', getTimePeriod());
        if (effectiveLicencee) params.append('licencee', effectiveLicencee);
        if (displayCurrency) params.append('currency', displayCurrency);
        if (chartGranularity) params.append('granularity', chartGranularity);
        if (locationsToFetch.length > 0) {
          params.append('locations', locationsToFetch.join(','));
        }

        const response = await axios.get(
          `/api/analytics/location-trends?${params.toString()}`,
          { signal }
        );
        setLocationTrendData(response.data.data || null);
      } catch (error) {
        if (isAbortError(error)) return;
        console.error('Error fetching location trend data:', error);
        setLocationTrendData(null);
      } finally {
        setLocationTrendLoading(false);
      }
    });
  }, [
    activeTab,
    selectedSasLocations,
    selectedRevenueLocations,
    effectiveLicencee,
    displayCurrency,
    chartGranularity,
    getTimePeriod,
    makeTrendDataRequest,
  ]);

  // ============================================================================
  // Return
  // ============================================================================

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
    fetchLocationAggregationAsync,
    fetchTopMachines,
    fetchBottomMachines,
    fetchLocationTrendData,
    calculateBatchNumber,
    loadLocationBatch,
  };
}