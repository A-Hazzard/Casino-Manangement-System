import { useEffect, useCallback } from "react";
import { useAnalyticsDataStore } from "@/lib/store/reportsDataStore";
import axios from "axios";

export function useLogisticsAnalytics() {
  const timePeriod = "last7days";
  const dateRange = null;
  const { setLogisticsEntries, setLastUpdated } = useAnalyticsDataStore();

  // Use useCallback to memoize setter functions
  const setIsLoading = useCallback(() => {
    // TODO: Add loading state to reports store
    console.log("Setting loading state");
  }, []);

  const setError = useCallback(() => {
    // TODO: Add error state to reports store
    console.log("Setting error state");
  }, []);

  useEffect(() => {
    const fetchLogisticsData = async () => {
      setIsLoading();
      setError();
      try {
        const params: Record<string, unknown> = { timePeriod };

        const response = await axios.get("/api/analytics/logistics", {
          params,
        });

        if (response.data.success) {
          const { movements } = response.data.data;
          setLogisticsEntries(movements);
          setLastUpdated("logistics");
        } else {
          setError();
        }
      } catch (err) {
        console.error("Failed to fetch logistics data:", err);
        setError();
      } finally {
        setIsLoading();
      }
    };

    fetchLogisticsData();
  }, [
    timePeriod,
    dateRange,
    setIsLoading,
    setError,
    setLogisticsEntries,
    setLastUpdated,
  ]);
}
