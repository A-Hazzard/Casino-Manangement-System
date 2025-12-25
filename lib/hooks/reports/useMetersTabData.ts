/**
 * useMetersTabData Hook
 *
 * Custom hook for managing all data fetching and state for the Meters tab
 *
 * Features:
 * - Location fetching with permission handling
 * - Meters data fetching with batch pagination
 * - Hourly chart data fetching
 * - Top performing machines calculation
 * - Search and filtering
 * - Chart granularity management
 */

'use client';

import { filterMetersData } from '@/lib/helpers/reports/metersTabHelpers';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useReportsStore } from '@/lib/store/reportsStore';
import { useUserStore } from '@/lib/store/userStore';
import type { MetersReportData, MetersReportResponse } from '@/shared/types/meters';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type HourlyChartData = Array<{
  day: string;
  hour: string;
  gamesPlayed: number;
  coinIn: number;
  coinOut: number;
}>;

type Location = {
  id: string;
  name: string;
  sasEnabled: boolean;
};

type UseMetersTabDataProps = {
  itemsPerPage: number;
  itemsPerBatch: number;
  pagesPerBatch: number;
  chartGranularity: 'hourly' | 'minute';
  selectedLocations: string[];
  searchTerm: string;
  debouncedSearchTerm: string;
  hasManuallySetGranularityRef: React.MutableRefObject<boolean>;
};

export function useMetersTabData({
  itemsPerPage,
  itemsPerBatch,
  pagesPerBatch,
  chartGranularity,
  selectedLocations,
  debouncedSearchTerm,
  hasManuallySetGranularityRef,
}: UseMetersTabDataProps) {
  // ============================================================================
  // Hooks & Store
  // ============================================================================
  const makeMetersRequest = useAbortableRequest();
  const makeLocationsRequest = useAbortableRequest();
  const makeHourlyChartRequest = useAbortableRequest();

  const {
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    displayCurrency,
  } = useDashBoardStore();
  const { setLoading: setReportsLoading, activeView } = useReportsStore();
  const { user } = useUserStore();

  // ============================================================================
  // State
  // ============================================================================
  const [allMetersData, setAllMetersData] = useState<MetersReportData[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([1]));
  const [hourlyChartData, setHourlyChartData] = useState<HourlyChartData>([]);
  const [allHourlyChartData, setAllHourlyChartData] = useState<HourlyChartData>(
    []
  );
  const [hourlyChartLoading, setHourlyChartLoading] = useState(false);

  const locationsInitialized = useRef(false);
  const metersTabFilterInitialized = useRef(false);

  // ============================================================================
  // Location Admin Logic
  // ============================================================================
  const isLocationAdmin = useMemo(() => {
    const userRoles = user?.roles || [];
    return userRoles.some(
      role =>
        typeof role === 'string' && role.toLowerCase() === 'location admin'
    );
  }, [user?.roles]);

  const [fetchedLocationPermissions, setFetchedLocationPermissions] = useState<
    string[]
  >([]);

  const locationAdminLocations = useMemo(() => {
    if (!isLocationAdmin) return [];
    let jwtLocations: string[] = [];
    if (
      Array.isArray(user?.assignedLocations) &&
      user.assignedLocations.length > 0
    ) {
      jwtLocations = user.assignedLocations.map(id => String(id));
    }
    return jwtLocations.length > 0 ? jwtLocations : fetchedLocationPermissions;
  }, [isLocationAdmin, user?.assignedLocations, fetchedLocationPermissions]);

  // ============================================================================
  // Helper Functions
  // ============================================================================
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  // ============================================================================
  // Data Fetching Functions
  // ============================================================================
  const fetchUserPermissions = useCallback(async () => {
    if (!isLocationAdmin || !user?._id) return;

    let jwtLocations: string[] = [];
    if (
      Array.isArray(user?.assignedLocations) &&
      user.assignedLocations.length > 0
    ) {
      jwtLocations = user.assignedLocations.map(id => String(id));
    }

    if (jwtLocations.length === 0) {
      try {
        setLocationsLoading(true);
        const response = await axios.get('/api/auth/current-user');
        if (response.data?.success && response.data?.user?.assignedLocations) {
          let serverLocations: string[] = [];
          if (
            Array.isArray(response.data.user.assignedLocations) &&
            response.data.user.assignedLocations.length > 0
          ) {
            serverLocations = response.data.user.assignedLocations.map(
              (id: string) => String(id)
            );
          }
          if (serverLocations.length > 0) {
            setFetchedLocationPermissions(serverLocations);
          }
        }
      } catch (err) {
        console.error('[MetersTab] Failed to fetch user permissions:', err);
      } finally {
        setLocationsLoading(false);
      }
    } else {
      setLocationsLoading(false);
    }
  }, [isLocationAdmin, user?._id, user?.assignedLocations]);

  const fetchLocations = useCallback(async () => {
    await makeLocationsRequest(async signal => {
      try {
        setLocationsLoading(true);

        if (isLocationAdmin) {
          await fetchUserPermissions();
        }

        const params: Record<string, string> = {};
        if (
          !isLocationAdmin &&
          selectedLicencee &&
          selectedLicencee !== 'all'
        ) {
          params.licencee = selectedLicencee;
        }

        const response = await axios.get('/api/locations', {
          params,
          signal,
        });

        let fetchedLocations: Location[] = [];
        if (Array.isArray(response.data?.locations)) {
          fetchedLocations = response.data.locations.map((loc: {
            _id: string;
            id?: string;
            name: string;
            sasEnabled?: boolean;
          }) => ({
            id: loc.id || String(loc._id),
            name: loc.name || '',
            sasEnabled: loc.sasEnabled || false,
          }));
        }

        // Filter locations for location admin
        if (isLocationAdmin && locationAdminLocations.length > 0) {
          fetchedLocations = fetchedLocations.filter(loc =>
            locationAdminLocations.includes(loc.id)
          );
        }

        setLocations(fetchedLocations);
      } catch (err: unknown) {
        if (axios.isCancel && axios.isCancel(err)) {
          return;
        }
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Error fetching locations:', err);
        toast.error('Failed to load locations', { duration: 3000 });
      } finally {
        setLocationsLoading(false);
      }
    });
  }, [
    isLocationAdmin,
    selectedLicencee,
    locationAdminLocations,
    fetchUserPermissions,
    makeLocationsRequest,
  ]);

  const fetchMetersData = useCallback(
    async (batch: number = 1) => {
      if (selectedLocations.length === 0) {
        setAllMetersData([]);
        setHasData(false);
        setLoadedBatches(new Set());
        setCurrentPage(0);
        return;
      }

      setLoading(true);
      setReportsLoading(true);
      setError(null);

      await makeMetersRequest(async signal => {
        const params = new URLSearchParams({
          locations: selectedLocations.join(','),
          timePeriod: activeMetricsFilter,
          page: batch.toString(),
          limit: itemsPerBatch.toString(),
        });

        if (activeMetricsFilter === 'Custom' && customDateRange) {
          params.append(
            'startDate',
            customDateRange.startDate.toISOString().split('T')[0]
          );
          params.append(
            'endDate',
            customDateRange.endDate.toISOString().split('T')[0]
          );
        }

        if (selectedLicencee && selectedLicencee !== 'all') {
          params.append('licencee', selectedLicencee);
        }

        if (displayCurrency) {
          params.append('currency', displayCurrency);
        }

        if (selectedLocations.length > 0) {
          params.append('includeHourlyData', 'true');
          params.append('granularity', chartGranularity);
          setHourlyChartLoading(true);
        }

        try {
          const response = await axios.get<
            MetersReportResponse & {
              hourlyChartData?: HourlyChartData;
            }
          >(`/api/reports/meters?${params}`, { signal });

          const newMetersData = response.data.data || [];

          if (response.data.hourlyChartData) {
            setHourlyChartData(response.data.hourlyChartData);
            setAllHourlyChartData(response.data.hourlyChartData);

            // Note: chartGranularity auto-determination is handled in parent component
            // when filtered hourly chart data is fetched
          }
          setHourlyChartLoading(false);

          setAllMetersData(prev => {
            const existingIds = new Set(
              prev.map(
                m =>
                  m.machineId || ((m as Record<string, unknown>)._id as string)
              )
            );
            const uniqueNewMeters = newMetersData.filter(
              (m: MetersReportData) => {
                const id =
                  m.machineId || ((m as Record<string, unknown>)._id as string);
                return !existingIds.has(id);
              }
            );
            return [...prev, ...uniqueNewMeters];
          });
        } catch (err: unknown) {
          if (axios.isCancel && axios.isCancel(err)) {
            setLoading(false);
            setReportsLoading(false);
            setHourlyChartLoading(false);
            return;
          }
          if (err instanceof Error && err.name === 'AbortError') {
            setLoading(false);
            setReportsLoading(false);
            setHourlyChartLoading(false);
            return;
          }

          console.error('Error fetching meters data:', err);
          const errorMessage =
            (
              (
                (err as Record<string, unknown>)?.response as Record<
                  string,
                  unknown
                >
              )?.data as Record<string, unknown>
            )?.error ||
            (err as Error)?.message ||
            'Failed to load meters data';
          setError(errorMessage as string);
          setLoading(false);
          setReportsLoading(false);
          setHourlyChartLoading(false);
          toast.error(errorMessage as string, { duration: 3000 });
        } finally {
          setLoading(false);
          setReportsLoading(false);
        }
      });
    },
    [
      selectedLocations,
      activeMetricsFilter,
      customDateRange,
      selectedLicencee,
      displayCurrency,
      chartGranularity,
      itemsPerBatch,
      setReportsLoading,
      makeMetersRequest,
    ]
  );

  // ============================================================================
  // Effects
  // ============================================================================
  // Initialize filter to "Yesterday" on mount
  useEffect(() => {
    if (activeView === 'meters') {
      if (!metersTabFilterInitialized.current) {
        // This will be handled by parent component
        metersTabFilterInitialized.current = true;
      }
    }
  }, [activeView]);

  // Initialize locations once on mount
  useEffect(() => {
    if (!locationsInitialized.current) {
      void fetchLocations();
      locationsInitialized.current = true;
    }
  }, [fetchLocations]);

  // Refetch locations when licensee changes
  useEffect(() => {
    if (locationsInitialized.current) {
      void fetchLocations();
    }
  }, [selectedLicencee, fetchLocations]);

  // Set loading state when granularity changes (but keep existing data)
  useEffect(() => {
    if (selectedLocations.length > 0 && allHourlyChartData.length > 0) {
      setHourlyChartLoading(true);
      // Don't clear data - keep showing old data while loading new granularity
    }
  }, [chartGranularity, selectedLocations.length, allHourlyChartData.length]);

  // Load initial batch on mount and when filters change
  useEffect(() => {
    if (selectedLocations.length > 0) {
      setAllMetersData([]);
      setLoadedBatches(new Set([1]));
      setCurrentPage(0);
      fetchMetersData(1);
    }
  }, [
    selectedLocations,
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    chartGranularity,
    displayCurrency,
    fetchMetersData,
  ]);

  // Fetch next batch when crossing batch boundaries
  useEffect(() => {
    if (loading || selectedLocations.length === 0) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      setLoadedBatches(prev => new Set([...prev, nextBatch]));
      fetchMetersData(nextBatch);
    }

    if (!loadedBatches.has(currentBatch)) {
      setLoadedBatches(prev => new Set([...prev, currentBatch]));
      fetchMetersData(currentBatch);
    }
  }, [
    currentPage,
    loading,
    fetchMetersData,
    itemsPerBatch,
    pagesPerBatch,
    loadedBatches,
    calculateBatchNumber,
    selectedLocations.length,
  ]);

  // Filter meters data based on search term
  const filteredMetersData = useMemo(() => {
    return filterMetersData(allMetersData, debouncedSearchTerm);
  }, [allMetersData, debouncedSearchTerm]);

  // Fetch hourly chart data for filtered machines when search changes
  useEffect(() => {
    if (!selectedLocations.length || !allHourlyChartData.length) {
      return;
    }

    const fetchFilteredHourlyData = async () => {
      if (!debouncedSearchTerm.trim()) {
        setHourlyChartData(allHourlyChartData);
        return;
      }

      const filteredMachineIds = filteredMetersData
        .map(item => {
          const itemRecord = item as Record<string, unknown>;
          return itemRecord.machineDocumentId as string;
        })
        .filter((id): id is string => !!id);

      if (filteredMachineIds.length === 0) {
        setHourlyChartData([]);
        return;
      }

      await makeHourlyChartRequest(async signal => {
        try {
          setHourlyChartLoading(true);
          setReportsLoading(true);
          const params = new URLSearchParams({
            locations: selectedLocations.join(','),
            timePeriod: activeMetricsFilter,
            includeHourlyData: 'true',
            hourlyDataMachineIds: filteredMachineIds.join(','),
            granularity: chartGranularity,
          });

          if (activeMetricsFilter === 'Custom' && customDateRange) {
            params.append(
              'startDate',
              customDateRange.startDate.toISOString().split('T')[0]
            );
            params.append(
              'endDate',
              customDateRange.endDate.toISOString().split('T')[0]
            );
          }

          if (selectedLicencee && selectedLicencee !== 'all') {
            params.append('licencee', selectedLicencee);
          }

          if (displayCurrency) {
            params.append('currency', displayCurrency);
          }

          const response = await axios.get<{
            hourlyChartData?: HourlyChartData;
          }>(`/api/reports/meters?${params}`, { signal });

          if (response.data.hourlyChartData) {
            setHourlyChartData(response.data.hourlyChartData);

            // Note: chartGranularity auto-determination is handled in parent component
            // when filtered hourly chart data is fetched
          } else {
            setHourlyChartData([]);
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            setHourlyChartLoading(false);
            setReportsLoading(false);
            return;
          }
          if (axios.isCancel && axios.isCancel(error)) {
            setHourlyChartLoading(false);
            setReportsLoading(false);
            return;
          }

          console.error('Error fetching filtered hourly chart data:', error);
          setHourlyChartData(allHourlyChartData);
          setHourlyChartLoading(false);
          setReportsLoading(false);
        }
      });
    };

    fetchFilteredHourlyData();
  }, [
    debouncedSearchTerm,
    filteredMetersData,
    selectedLocations,
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    chartGranularity,
    allHourlyChartData,
    setReportsLoading,
    makeHourlyChartRequest,
    hasManuallySetGranularityRef,
  ]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  // Get items for current page from filtered data
  const paginatedMetersData = useMemo(() => {
    const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
    const startIndex = positionInBatch;
    const endIndex = startIndex + itemsPerPage;
    return filteredMetersData.slice(startIndex, endIndex);
  }, [filteredMetersData, currentPage, itemsPerPage, pagesPerBatch]);

  // Calculate total pages based on filtered data
  const totalPages = useMemo(() => {
    const totalItems = filteredMetersData.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [filteredMetersData.length, itemsPerPage]);

  // Update hasData
  useEffect(() => {
    setHasData(paginatedMetersData.length > 0);
  }, [paginatedMetersData.length]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    // State
    allMetersData,
    locations,
    loading,
    locationsLoading,
    error,
    hasData,
    currentPage,
    loadedBatches,
    hourlyChartData,
    allHourlyChartData,
    hourlyChartLoading,
    filteredMetersData,
    paginatedMetersData,
    totalPages,
    // Setters
    setAllMetersData,
    setLocations,
    setLoading,
    setLocationsLoading,
    setError,
    setHasData,
    setCurrentPage,
    setLoadedBatches,
    setHourlyChartData,
    setAllHourlyChartData,
    setHourlyChartLoading,
    // Functions
    fetchLocations,
    fetchMetersData,
    calculateBatchNumber,
    // Refs
    locationsInitialized,
    metersTabFilterInitialized,
  };
}

