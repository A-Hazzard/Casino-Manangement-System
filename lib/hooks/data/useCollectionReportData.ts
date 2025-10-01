/**
 * Custom hook for managing collection report data fetching and state
 * Handles data loading, error states, and data management for collection reports
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchMonthlyReportSummaryAndDetails,
  fetchAllLocationNames,
  fetchCollectionReportsByLicencee,
} from "@/lib/helpers/collectionReport";
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
  CollectionReportRow,
} from "@/lib/types/componentProps";
import type { 
  UseCollectionReportDataProps, 
  UseCollectionReportDataReturn 
} from "@/lib/types";

export function useCollectionReportData({
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
}: UseCollectionReportDataProps): UseCollectionReportDataReturn {
  // Data states
  const [monthlyReportSummary, setMonthlyReportSummary] = useState<MonthlyReportSummary | null>(null);
  const [monthlyReportDetails, setMonthlyReportDetails] = useState<MonthlyReportDetailsRow[]>([]);
  const [collectionReports, setCollectionReports] = useState<CollectionReportRow[]>([]);
  const [locationNames, setLocationNames] = useState<string[]>([]);
  
  // Loading states
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Fetch monthly report summary
  const fetchSummary = useCallback(async () => {
    if (!activeMetricsFilter || !customDateRange) return;
    
    setLoadingSummary(true);
    setError(null);
    
    try {
      const result = await fetchMonthlyReportSummaryAndDetails({
        startDate: customDateRange.startDate,
        endDate: customDateRange.endDate,
        locationName: activeMetricsFilter,
        licencee: selectedLicencee,
      });
      setMonthlyReportSummary(result.summary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch summary";
      setError(errorMessage);
      toast.error("Failed to load monthly report summary");
    } finally {
      setLoadingSummary(false);
    }
  }, [activeMetricsFilter, customDateRange, selectedLicencee]);

  // Fetch monthly report details
  const fetchDetails = useCallback(async () => {
    if (!activeMetricsFilter || !customDateRange) return;
    
    setLoadingDetails(true);
    setError(null);
    
    try {
      const result = await fetchMonthlyReportSummaryAndDetails({
        startDate: customDateRange.startDate,
        endDate: customDateRange.endDate,
        locationName: activeMetricsFilter,
        licencee: selectedLicencee,
      });
      setMonthlyReportDetails(result.details || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch details";
      setError(errorMessage);
      toast.error("Failed to load monthly report details");
    } finally {
      setLoadingDetails(false);
    }
  }, [activeMetricsFilter, customDateRange, selectedLicencee]);

  // Fetch collection reports
  const fetchReports = useCallback(async () => {
    if (!activeMetricsFilter) return;
    
    setLoadingReports(true);
    setError(null);
    
    try {
      const reports = await fetchCollectionReportsByLicencee(
        selectedLicencee,
        customDateRange ? { from: customDateRange.startDate, to: customDateRange.endDate } : undefined,
        activeMetricsFilter
      );
      setCollectionReports(reports);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch reports";
      setError(errorMessage);
      toast.error("Failed to load collection reports");
    } finally {
      setLoadingReports(false);
    }
  }, [selectedLicencee, activeMetricsFilter, customDateRange]);

  // Fetch location names
  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true);
    setError(null);
    
    try {
      const locations = await fetchAllLocationNames();
      setLocationNames(locations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch locations";
      setError(errorMessage);
      toast.error("Failed to load location names");
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchSummary(),
      fetchDetails(),
      fetchReports(),
      fetchLocations(),
    ]);
  }, [fetchSummary, fetchDetails, fetchReports, fetchLocations]);

  // Individual refresh methods
  const refreshSummary = useCallback(async () => {
    await fetchSummary();
  }, [fetchSummary]);

  const refreshDetails = useCallback(async () => {
    await fetchDetails();
  }, [fetchDetails]);

  const refreshReports = useCallback(async () => {
    await fetchReports();
  }, [fetchReports]);

  // Load data when dependencies change
  useEffect(() => {
    if (activeMetricsFilter) {
      refreshData();
    }
  }, [activeMetricsFilter, refreshData]);

  return {
    monthlyReportSummary,
    monthlyReportDetails,
    collectionReports,
    locationNames,
    loadingSummary,
    loadingDetails,
    loadingReports,
    loadingLocations,
    error,
    refreshData,
    refreshSummary,
    refreshDetails,
    refreshReports,
  };
}
