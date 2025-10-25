/**
 * Custom hook for managing dashboard data fetching and state
 * Handles loading, error states, and data management for dashboard page
 */

import { useState, useCallback, useEffect } from 'react';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { loadGamingLocations } from '@/lib/helpers/dashboard';
import { toast } from 'sonner';
import type { DashboardTotals, TopPerformingData } from '@/lib/types';
import type { CustomizedLabelProps } from '@/lib/types/componentProps';

type UseDashboardDataProps = {
  selectedLicencee: string;
  activeMetricsFilter: string;
  customDateRange?: {
    startDate: Date;
    endDate: Date;
  };
};

type UseDashboardDataReturn = {
  gamingLocations: unknown[];
  metricsData: unknown;
  topPerformingData: TopPerformingData[];
  pieChartData: CustomizedLabelProps[];
  totals: DashboardTotals;
  loadingChartData: boolean;
  loadingTopPerforming: boolean;
  refreshing: boolean;
  loadDashboardData: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  setLoadingChartData: (loading: boolean) => void;
  setLoadingTopPerforming: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
};

export const useDashboardData = ({
  selectedLicencee,
}: Pick<UseDashboardDataProps, 'selectedLicencee'>): UseDashboardDataReturn => {
  // Get store state and actions
  const {
    loadingChartData,
    setLoadingChartData,
    loadingTopPerforming,
    setLoadingTopPerforming,
    refreshing,
    setRefreshing,
    totals,
    gamingLocations,
    setGamingLocations,
    topPerformingData,
    setTopPerformingData,
  } = useDashBoardStore();

  // Local state for metrics data
  const [metricsData, setMetricsData] = useState<unknown>(null);

  // Load gaming locations
  const loadGamingLocationsData = useCallback(async () => {
    try {
      const locationsData = await loadGamingLocations(
        setGamingLocations,
        selectedLicencee
      );

      if (Array.isArray(locationsData)) {
        setGamingLocations(locationsData);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            'Gaming locations data is not an array:',
            locationsData
          );
        }
        setGamingLocations([]);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading gaming locations:', error);
      }
      setGamingLocations([]);
    }
  }, [selectedLicencee, setGamingLocations]);

  // Load metrics data
  const loadMetricsData = useCallback(async () => {
    try {
      setLoadingChartData(true);

      // Simplified metrics data fetch
      const metricsDataResult = null;

      if (metricsDataResult) {
        setMetricsData(metricsDataResult);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('No metrics data received');
        }
        setMetricsData(null);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading metrics data:', error);
      }
      setMetricsData(null);
    } finally {
      setLoadingChartData(false);
    }
  }, [setLoadingChartData]);

  // Load top performing data
  const loadTopPerformingData = useCallback(async () => {
    try {
      setLoadingTopPerforming(true);

      // Simplified top performing data fetch
      const topPerformingResult: TopPerformingData = [];

      if (Array.isArray(topPerformingResult)) {
        setTopPerformingData(topPerformingResult);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error(
            'Top performing data is not an array:',
            topPerformingResult
          );
        }
        setTopPerformingData([]);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading top performing data:', error);
      }
      setTopPerformingData([]);
    } finally {
      setLoadingTopPerforming(false);
    }
  }, [setTopPerformingData, setLoadingTopPerforming]);

  // Calculate pie chart data
  const calculatePieChartData = useCallback(() => {
    if (!metricsData) return;

    // Simple pie chart data calculation - placeholder for future implementation
    return {
      x: 0,
      y: 0,
      textAnchor: 'middle' as const,
      dominantBaseline: 'central' as const,
      fontSize: '14px',
      fontWeight: 'bold' as const,
      fill: '#000',
      text: 'No data available',
    };
  }, [metricsData]);

  // Load all dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      await Promise.all([
        loadGamingLocationsData(),
        loadMetricsData(),
        loadTopPerformingData(),
      ]);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error loading dashboard data:', error);
      }
    }
  }, [loadGamingLocationsData, loadMetricsData, loadTopPerformingData]);

  // Refresh dashboard data
  const refreshDashboard = useCallback(async () => {
    try {
      setRefreshing(true);

      await loadDashboardData();

      toast.success('Dashboard refreshed successfully');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error refreshing dashboard:', error);
      }
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  }, [setRefreshing, loadDashboardData]);

  // Effect hooks for data loading
  useEffect(() => {
    if (selectedLicencee) {
      loadDashboardData();
    }
  }, [selectedLicencee, loadDashboardData]);

  useEffect(() => {
    calculatePieChartData();
  }, [calculatePieChartData]);

  return {
    // Data states
    gamingLocations,
    metricsData,
    topPerformingData: topPerformingData as unknown as TopPerformingData[],
    pieChartData: [],
    totals: totals || {
      moneyIn: 0,
      moneyOut: 0,
      gross: 0,
    },

    // Loading states
    loadingChartData,
    loadingTopPerforming,
    refreshing,

    // Actions
    loadDashboardData,
    refreshDashboard,
    setLoadingChartData,
    setLoadingTopPerforming,
    setRefreshing,
  };
};
