/**
 * Custom hook for managing machines tab data and state
 *
 * Handles fetching machine statistics, overview machines, offline machines,
 * and performance evaluation data. Also manages pagination and sorting states.
 */

import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { isAbortError } from '@/lib/utils/errors';
import type {
  MachineData,
  MachinesApiResponse,
  MachineStats,
  MachineStatsApiResponse,
} from '@/shared/types/machines';
import axios from 'axios';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export const useMachinesTabData = (
  activeTab: string,
  displayCurrency?: string,
  overviewItemsPerBatch: number = 100,
  offlineItemsPerBatch: number = 100
) => {
  const { selectedLicencee, customDateRange, activeMetricsFilter } =
    useDashBoardStore();

  // AbortControllers
  const makeStatsRequest = useAbortableRequest();
  const makeOverviewRequest = useAbortableRequest();
  const makeOfflineRequest = useAbortableRequest();
  const makeEvaluationRequest = useAbortableRequest();

  // Data states
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null);
  const [allOverviewMachines, setAllOverviewMachines] = useState<MachineData[]>(
    []
  );
  const [allOfflineMachines, setAllOfflineMachines] = useState<MachineData[]>(
    []
  );
  const [allMachines, setAllMachines] = useState<MachineData[]>([]);
  const [locations, setLocations] = useState<
    { id: string; name: string; sasEnabled: boolean }[]
  >([]);

  // Loading states
  const [statsLoading, setStatsLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stats fetching
  const fetchMachineStats = useCallback(async () => {
    setStatsLoading(true);
    const params: Record<string, string> = {
      type: 'stats',
      timePeriod: activeMetricsFilter || 'Today',
    };

    if (selectedLicencee && selectedLicencee !== 'all') {
      params.licencee = selectedLicencee;
    }

    if (customDateRange?.startDate && customDateRange?.endDate) {
      params.startDate = customDateRange.startDate.toISOString();
      params.endDate = customDateRange.endDate.toISOString();
    }

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

      if (result !== null) {
        setMachineStats(result);
        setStatsLoading(false);
      }
    } catch (error) {
      // Silently handle aborted requests - this is expected behavior when switching filters
      if (isAbortError(error)) {
        return;
      }
      console.error('Failed to fetch machine stats:', error);
      toast.error('Failed to load machine statistics');
      setStatsLoading(false);
    }
  }, [
    selectedLicencee,
    customDateRange,
    activeMetricsFilter,
    displayCurrency,
    makeStatsRequest,
  ]);

  // Overview fetching
  const fetchOverviewMachines = useCallback(
    async (
      page: number = 1,
      search: string = '',
      locationId: string = 'all',
      onlineStatus: string = 'all'
    ) => {
      setOverviewLoading(true);
      try {
        await makeOverviewRequest(async signal => {
          const params: Record<string, string> = {
            type: 'overview',
            page: page.toString(),
            limit: overviewItemsPerBatch.toString(),
            timePeriod: activeMetricsFilter || 'Today',
          };

          if (selectedLicencee && selectedLicencee !== 'all')
            params.licencee = selectedLicencee;
          if (locationId !== 'all') params.locationId = locationId;
          if (onlineStatus !== 'all') params.onlineStatus = onlineStatus;
          if (search?.trim()) params.search = search.trim();
          if (displayCurrency) params.currency = displayCurrency;
          if (customDateRange?.startDate && customDateRange?.endDate) {
            params.startDate = customDateRange.startDate.toISOString();
            params.endDate = customDateRange.endDate.toISOString();
          }

          const response = await axios.get<MachinesApiResponse>(
            '/api/reports/machines',
            { params, signal }
          );
          const newMachines = response.data.data || [];

          // On page 1, replace the data; otherwise append
          if (page === 1) {
            setAllOverviewMachines(newMachines);
          } else {
            setAllOverviewMachines(prev => {
              const existingIds = new Set(prev.map(m => m.machineId));
              const uniqueNewMachines = newMachines.filter(
                m => !existingIds.has(m.machineId)
              );
              return [...prev, ...uniqueNewMachines];
            });
          }
        });
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }
        console.error('Failed to fetch overview machines:', error);
        toast.error('Failed to load overview machines');
      } finally {
        setOverviewLoading(false);
      }
    },
    [
      selectedLicencee,
      customDateRange,
      activeMetricsFilter,
      displayCurrency,
      overviewItemsPerBatch,
      makeOverviewRequest,
    ]
  );

  // Offline fetching
  const fetchOfflineMachines = useCallback(
    async (batch: number = 1, search?: string, locationId: string = 'all', duration?: string) => {
      setOfflineLoading(true);
      try {
        await makeOfflineRequest(async signal => {
          const params: Record<string, string> = {
            type: 'offline',
            timePeriod: activeMetricsFilter || 'Today',
            page: batch.toString(),
            limit: offlineItemsPerBatch.toString(),
          };

          if (selectedLicencee && selectedLicencee !== 'all')
            params.licencee = selectedLicencee;
          if (locationId !== 'all') params.locationId = locationId;
          if (search?.trim()) params.search = search.trim();
          if (duration && duration !== 'all') params.duration = duration;
          if (customDateRange?.startDate && customDateRange?.endDate) {
            params.startDate = customDateRange.startDate.toISOString();
            params.endDate = customDateRange.endDate.toISOString();
          }

          const response = await axios.get<MachinesApiResponse>(
            '/api/reports/machines',
            { params, signal }
          );
          const newOfflineMachines = response.data.data || [];

          // On batch 1 or search, replace the data; otherwise append
          if (batch === 1 || search?.trim()) {
            setAllOfflineMachines(newOfflineMachines);
          } else {
            setAllOfflineMachines(prev => {
              const existingIds = new Set(prev.map(m => m.machineId));
              const uniqueNewMachines = newOfflineMachines.filter(
                m => !existingIds.has(m.machineId)
              );
              return [...prev, ...uniqueNewMachines];
            });
          }
        });
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }
        console.error('Failed to fetch offline machines:', error);
        toast.error('Failed to load offline machines data');
      } finally {
        setOfflineLoading(false);
      }
    },
    [
      selectedLicencee,
      customDateRange,
      activeMetricsFilter,
      offlineItemsPerBatch,
      makeOfflineRequest,
    ]
  );

  // All machines (for evaluation) fetching
  const fetchAllMachines = useCallback(
    async (selectedLocations: string[] = []) => {
      setEvaluationLoading(true);
      try {
        await makeEvaluationRequest(async signal => {
          const params: Record<string, string> = {
            type: 'all',
            timePeriod: activeMetricsFilter || 'Today',
          };

          if (selectedLicencee && selectedLicencee !== 'all')
            params.licencee = selectedLicencee;
          if (selectedLocations.length > 0)
            params.locationId = selectedLocations.join(',');
          if (displayCurrency) params.currency = displayCurrency;
          if (customDateRange?.startDate && customDateRange?.endDate) {
            params.startDate = customDateRange.startDate.toISOString();
            params.endDate = customDateRange.endDate.toISOString();
          }

          const response = await axios.get<MachinesApiResponse>(
            '/api/reports/machines',
            { params, signal }
          );
          setAllMachines(response.data.data || []);
        });
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }
        console.error('Failed to fetch all machines:', error);
        toast.error('Failed to load evaluation data');
      } finally {
        setEvaluationLoading(false);
      }
    },
    [
      selectedLicencee,
      customDateRange,
      activeMetricsFilter,
      displayCurrency,
      makeEvaluationRequest,
    ]
  );

  // Locations fetching
  const fetchLocationsData = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (selectedLicencee && selectedLicencee !== 'all') {
        params.licencee = selectedLicencee;
      }
      
      const response = await axios.get('/api/locations', { params });
      
      let fetchedLocations: { id: string; name: string; sasEnabled: boolean }[] = [];
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
      
      setLocations(fetchedLocations);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  }, [selectedLicencee]);

  return {
    machineStats,
    allOverviewMachines,
    setAllOverviewMachines,
    allOfflineMachines,
    setAllOfflineMachines,
    allMachines,
    locations,
    statsLoading,
    overviewLoading,
    offlineLoading,
    evaluationLoading,
    loading,
    setLoading,
    setOverviewLoading,
    setEvaluationLoading,
    setOfflineLoading,
    setStatsLoading,
    fetchMachineStats,
    fetchOverviewMachines,
    fetchOfflineMachines,
    fetchAllMachines,
    fetchLocationsData,
  };
};

