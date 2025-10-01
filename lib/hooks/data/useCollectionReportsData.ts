/**
 * Custom hook for managing collection reports data fetching and state
 * Handles loading, error states, and data management for collection reports page
 */

import { useState, useCallback, useEffect } from "react";
import {
  getAllLocationNames,
  getLocationsWithMachines,
  fetchMonthlyReportSummaryAndDetails,
  fetchCollectionReportsByLicencee,
} from "@/lib/helpers/collectionReport";
import {
  fetchAndFormatSchedulers,
} from "@/lib/helpers/collectionReportPageV2";
import { fetchAndFormatCollectorSchedules } from "@/lib/helpers/collectorSchedules";
import { toast } from "sonner";
import type { LocationSelectItem } from "@/lib/types/location";
import type { SchedulerTableRow } from "@/lib/types/componentProps";
import type { CollectionReportLocationWithMachines } from "@/lib/types/api";
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
  CollectionReportRow,
} from "@/lib/types/componentProps";
import type { DateRange as RDPDateRange } from "react-day-picker";

interface UseCollectionReportsDataProps {
  selectedLicencee: string;
  activeMetricsFilter: string;
  customDateRange?: RDPDateRange;
}

interface UseCollectionReportsDataReturn {
  // Data states
  gamingLocations: LocationSelectItem[];
  locationsWithMachines: CollectionReportLocationWithMachines[];
  monthlyReportSummary: MonthlyReportSummary | null;
  monthlyReportDetails: MonthlyReportDetailsRow[];
  collectionReports: CollectionReportRow[];
  schedulers: SchedulerTableRow[];
  collectorSchedules: unknown[];
  
  // Loading states
  loading: boolean;
  loadingSummary: boolean;
  loadingReports: boolean;
  loadingSchedulers: boolean;
  loadingCollectorSchedules: boolean;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  
  // Actions
  loadCollectionReportsData: () => Promise<void>;
  refreshCollectionReports: () => Promise<void>;
  setPagination: (pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }) => void;
  setLoading: (loading: boolean) => void;
}

export const useCollectionReportsData = ({
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
}: UseCollectionReportsDataProps): UseCollectionReportsDataReturn => {
  // State management
  const [gamingLocations, setGamingLocations] = useState<LocationSelectItem[]>([]);
  const [locationsWithMachines, setLocationsWithMachines] = useState<CollectionReportLocationWithMachines[]>([]);
  const [monthlyReportSummary, setMonthlyReportSummary] = useState<MonthlyReportSummary | null>(null);
  const [monthlyReportDetails, setMonthlyReportDetails] = useState<MonthlyReportDetailsRow[]>([]);
  const [collectionReports, setCollectionReports] = useState<CollectionReportRow[]>([]);
  const [schedulers, setSchedulers] = useState<SchedulerTableRow[]>([]);
  const [collectorSchedules, setCollectorSchedules] = useState<unknown[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingSchedulers, setLoadingSchedulers] = useState(false);
  const [loadingCollectorSchedules, setLoadingCollectorSchedules] = useState(false);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Load gaming locations
  const loadGamingLocationsData = useCallback(async () => {
    try {
      const locationsData = await getAllLocationNames();
      
      if (Array.isArray(locationsData)) {
        // Convert string array to LocationSelectItem array
        const locationItems: LocationSelectItem[] = locationsData.map(name => ({
          _id: name,
          id: name,
          name: name,
          sasEnabled: false
        }));
        setGamingLocations(locationItems);
      } else {
        console.error("Gaming locations data is not an array:", locationsData);
        setGamingLocations([]);
      }
    } catch (error) {
      console.error("Error loading gaming locations:", error);
      setGamingLocations([]);
    }
  }, []);

  // Load locations with machines
  const loadLocationsWithMachines = useCallback(async () => {
    try {
      const locationsData = await getLocationsWithMachines();
      
      if (Array.isArray(locationsData)) {
        setLocationsWithMachines(locationsData);
      } else {
        console.error("Locations with machines data is not an array:", locationsData);
        setLocationsWithMachines([]);
      }
    } catch (error) {
      console.error("Error loading locations with machines:", error);
      setLocationsWithMachines([]);
    }
  }, []);

  // Load monthly report summary
  const loadMonthlyReportSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);

      const dateRangeForFetch =
        activeMetricsFilter === "Custom" &&
        customDateRange?.from &&
        customDateRange?.to
          ? {
              from: customDateRange.from,
              to: customDateRange.to,
            }
          : (() => {
              const now = new Date();
              const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const last = new Date(now.getFullYear(), now.getMonth(), 0);
              return { from: first, to: last };
            })();

      const summaryData = await fetchMonthlyReportSummaryAndDetails({
        startDate: dateRangeForFetch.from,
        endDate: dateRangeForFetch.to,
        licencee: selectedLicencee
      });

      if (summaryData) {
        setMonthlyReportSummary(summaryData.summary);
        setMonthlyReportDetails(summaryData.details);
      } else {
        console.error("No monthly report summary data received");
        setMonthlyReportSummary(null);
        setMonthlyReportDetails([]);
      }
    } catch (error) {
      console.error("Error loading monthly report summary:", error);
      setMonthlyReportSummary(null);
      setMonthlyReportDetails([]);
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedLicencee, activeMetricsFilter, customDateRange]);

  // Load collection reports
  const loadCollectionReports = useCallback(async () => {
    try {
      setLoadingReports(true);

      const dateRangeForFetch =
        activeMetricsFilter === "Custom" &&
        customDateRange?.from &&
        customDateRange?.to
          ? {
              from: customDateRange.from,
              to: customDateRange.to,
            }
          : (() => {
              const now = new Date();
              const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const last = new Date(now.getFullYear(), now.getMonth(), 0);
              return { from: first, to: last };
            })();

      const reportsData = await fetchCollectionReportsByLicencee(
        selectedLicencee,
        dateRangeForFetch,
        activeMetricsFilter
      );

      if (Array.isArray(reportsData)) {
        setCollectionReports(reportsData);
      } else {
        console.error("Collection reports data is not an array:", reportsData);
        setCollectionReports([]);
      }
    } catch (error) {
      console.error("Error loading collection reports:", error);
      setCollectionReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, [selectedLicencee, activeMetricsFilter, customDateRange]);

  // Load schedulers
  const loadSchedulers = useCallback(async () => {
    try {
      setLoadingSchedulers(true);

      const schedulersData = await fetchAndFormatSchedulers(
        selectedLicencee,
        "all",
        "all",
        gamingLocations
      );
      
      if (Array.isArray(schedulersData)) {
        setSchedulers(schedulersData);
      } else {
        console.error("Schedulers data is not an array:", schedulersData);
        setSchedulers([]);
      }
    } catch (error) {
      console.error("Error loading schedulers:", error);
      setSchedulers([]);
    } finally {
      setLoadingSchedulers(false);
    }
  }, [selectedLicencee, gamingLocations]);

  // Load collector schedules
  const loadCollectorSchedules = useCallback(async () => {
    try {
      setLoadingCollectorSchedules(true);

      const schedulesData = await fetchAndFormatCollectorSchedules(selectedLicencee);
      
      if (Array.isArray(schedulesData)) {
        setCollectorSchedules(schedulesData);
      } else {
        console.error("Collector schedules data is not an array:", schedulesData);
        setCollectorSchedules([]);
      }
    } catch (error) {
      console.error("Error loading collector schedules:", error);
      setCollectorSchedules([]);
    } finally {
      setLoadingCollectorSchedules(false);
    }
  }, [selectedLicencee]);

  // Load all collection reports data
  const loadCollectionReportsData = useCallback(async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        loadGamingLocationsData(),
        loadLocationsWithMachines(),
        loadMonthlyReportSummary(),
        loadCollectionReports(),
        loadSchedulers(),
        loadCollectorSchedules(),
      ]);
    } catch (error) {
      console.error("Error loading collection reports data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    loadGamingLocationsData,
    loadLocationsWithMachines,
    loadMonthlyReportSummary,
    loadCollectionReports,
    loadSchedulers,
    loadCollectorSchedules,
  ]);

  // Refresh collection reports data
  const refreshCollectionReports = useCallback(async () => {
    try {
      await loadCollectionReportsData();
      toast.success("Collection reports refreshed successfully");
    } catch (error) {
      console.error("Error refreshing collection reports:", error);
      toast.error("Failed to refresh collection reports");
    }
  }, [loadCollectionReportsData]);

  // Effect hooks for data loading
  useEffect(() => {
    if (selectedLicencee) {
      loadCollectionReportsData();
    }
  }, [selectedLicencee, loadCollectionReportsData]);

  return {
    // Data states
    gamingLocations,
    locationsWithMachines,
    monthlyReportSummary,
    monthlyReportDetails,
    collectionReports,
    schedulers,
    collectorSchedules,
    
    // Loading states
    loading,
    loadingSummary,
    loadingReports,
    loadingSchedulers,
    loadingCollectorSchedules,
    
    // Pagination
    pagination,
    
    // Actions
    loadCollectionReportsData,
    refreshCollectionReports,
    setPagination,
    setLoading,
  };
};
