import { useCallback, useEffect, useRef } from "react";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { dashboardData, ActiveFilters } from "@/lib/types";
import { TimePeriod } from "@/app/api/lib/types";
import { fetchTopPerformingData } from "@/lib/helpers/topPerforming";
import getAllGamingLocations from "@/lib/helpers/locations";
import { switchFilter } from "@/lib/utils/metrics";

/**
 * Custom React hook to manage dashboard data, filters, and top-performing metrics.
 *
 * Handles loading of chart data, locations, and top-performing entities, as well as filter state management.
 *
 * @returns Object containing filter handlers and time frame getter.
 */
export function useDashboardData() {
  const {
    initialLoading,
    setInitialLoading,
    setLoadingChartData,
    setLoadingTopPerforming,
    activeFilters,
    setActiveFilters,
    setActiveMetricsFilter,
    activePieChartFilter,
    activeTab,
    totals,
    setTotals,
    setChartData,
    setGamingLocations,
    selectedLicencee,
    setTopPerformingData,
  } = useDashBoardStore();

  const prevTotals = useRef<dashboardData | null>(null);

  const getTimeFrame = useCallback(() => {
    if (activeFilters.Today) return "Today";
    if (activeFilters.Yesterday) return "Yesterday";
    if (activeFilters.last7days) return "7d";
    if (activeFilters.last30days) return "30d";
    if (activeFilters.Custom) return "Custom";
    return "Today";
  }, [activeFilters]);

  const handleSelectChange = useCallback(
    (value: string) => {
      const updatedFilters: ActiveFilters = {
        Today: value === "Today",
        Yesterday: value === "Yesterday",
        last7days: value === "7d",
        last30days: value === "30d",
        Custom: value === "Custom",
      };
      setActiveFilters(updatedFilters);
    },
    [setActiveFilters]
  );

  // Fetch chartData and totals
  useEffect(() => {
    async function loadData() {
      setLoadingChartData(true);
      try {
        // On initial load, fetch locations only
        if (initialLoading) {
          const locationsData = await getAllGamingLocations();
          const validLocations = locationsData.filter(
            (loc) =>
              loc.geoCoords &&
              loc.geoCoords.latitude !== 0 &&
              loc.geoCoords.longitude !== 0
          );
          setGamingLocations(validLocations);
        }
        const timeFrame = getTimeFrame() as TimePeriod;
        setActiveMetricsFilter(timeFrame);

        // Only pass licencee if selected
        if (selectedLicencee) {
          await switchFilter(
            timeFrame,
            setTotals,
            setChartData,
            undefined,
            undefined,
            selectedLicencee
          );
        } else {
          await switchFilter(timeFrame, setTotals, setChartData);
        }
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setLoadingChartData(false);
        if (initialLoading) {
          setInitialLoading(false);
        }
      }
    }
    void loadData();
  }, [
    activeFilters,
    selectedLicencee,
    initialLoading,
    getTimeFrame,
    setTopPerformingData,
    setActiveMetricsFilter,
    setTotals,
    setChartData,
    setInitialLoading,
    setLoadingChartData,
    setGamingLocations,
  ]);

  // Fetch top performing data
  useEffect(() => {
    async function loadTopPerforming() {
      setLoadingTopPerforming(true);
      try {
        const data = await fetchTopPerformingData(
          activeTab,
          activePieChartFilter
        );
        setTopPerformingData(data);
      } catch (error) {
        console.error("Error fetching top-performing data:", error);
      } finally {
        setLoadingTopPerforming(false);
      }
    }
    void loadTopPerforming();
  }, [
    activeTab,
    activePieChartFilter,
    setLoadingTopPerforming,
    setTopPerformingData,
  ]);

  // Update loader state when totals update
  useEffect(() => {
    if (
      totals &&
      (!prevTotals.current ||
        totals.moneyIn !== prevTotals.current.moneyIn ||
        totals.moneyOut !== prevTotals.current.moneyOut ||
        totals.gross !== prevTotals.current.gross)
    ) {
      setLoadingChartData(false);
      prevTotals.current = totals;
    }
  }, [totals, setLoadingChartData]);

  return {
    handleSelectChange,
    getTimeFrame,
  };
}
