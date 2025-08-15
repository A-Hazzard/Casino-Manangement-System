import { useEffect, useCallback } from "react";
import { useAnalyticsDataStore } from "@/lib/store/reportsDataStore";
import axios from "axios";

export function useDashboardAnalytics() {
  const timePeriod = "last7days";
  const dateRange = null;
  const {
    setKpiMetrics,
    setPerformanceTrends,
    setLocations,
    setTopPerformingMachines,
    setLastUpdated,
  } = useAnalyticsDataStore();

  // Use useCallback to memoize setter functions
  const setIsLoading = useCallback(() => {
    // TODO: Add loading state to reports store
  }, []);

  const setError = useCallback(() => {
    // TODO: Add error state to reports store
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading();
      setError();
      try {
        const params: Record<string, unknown> = { timePeriod };

        const response = await axios.get("/api/analytics/dashboard", {
          params,
        });

        if (response.data.success) {
          const {
            kpiMetrics,
            performanceTrends,
            locations,
            topPerformingMachines,
          } = response.data.data;
          setKpiMetrics(kpiMetrics);
          setPerformanceTrends(performanceTrends);
          setLocations(locations);
          setTopPerformingMachines(topPerformingMachines);
          setLastUpdated("dashboard");
        } else {
          setError();
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError();
      } finally {
        setIsLoading();
      }
    };

    fetchDashboardData();
  }, [
    timePeriod,
    dateRange,
    setIsLoading,
    setError,
    setKpiMetrics,
    setPerformanceTrends,
    setLocations,
    setTopPerformingMachines,
    setLastUpdated,
  ]);
}
