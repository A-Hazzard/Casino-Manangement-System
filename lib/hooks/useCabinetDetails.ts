import { useState, useEffect, useCallback, useRef } from "react";
import { CabinetDetail } from "../types/cabinets";
import { TimePeriod } from "../types/api";
import { fetchCabinetDetails, updateCabinetMetrics } from "../helpers/cabinets";
import { debounce } from "../utils/cabinetDetails";

import type { UseCabinetDetailsReturn } from "@/lib/types/hooks";

// Re-export frontend-specific types for convenience
export type { UseCabinetDetailsReturn };

/**
 * Custom React hook for managing cabinet details state and fetching.
 *
 * @param locationId - The unique identifier for the location.
 * @param cabinetId - The unique identifier for the cabinet.
 * @param initialTimePeriod - (Optional) Initial time period for metrics (default: "Today").
 * @returns Object containing cabinet details, loading states, error, filter management, and update functions.
 */
export function useCabinetDetails(
  locationId: string,
  cabinetId: string,
  initialTimePeriod: TimePeriod = "Today"
): UseCabinetDetailsReturn {
  // State variables
  const [cabinet, setCabinet] = useState<CabinetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [activeMetricsFilter, setActiveMetricsFilter] =
    useState<TimePeriod>(initialTimePeriod);
  const [isFilterChangeInProgress, setIsFilterChangeInProgress] =
    useState(false);

  // Refs
  const initialRenderRef = useRef(true);
  const lastFilterChangeTimeRef = useRef<number>(0);
  const lastMetricsFilterRef = useRef(activeMetricsFilter);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load initial cabinet data
   */
  useEffect(() => {
    setLoading(true);
    setMetricsLoading(true);

    fetchCabinetDetails(locationId, cabinetId)
      .then((data) => {
        setCabinet(data);
        setLoading(false);
        setMetricsLoading(false);
      })
      .catch((err) => {
        setError("Failed to fetch cabinet details");
        setLoading(false);
        setMetricsLoading(false);
        console.error("Cabinet details fetch error:", err);
      });

    // Cleanup function
    return () => {
      setLoading(false);
      setMetricsLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [locationId, cabinetId]);

  /**
   * Update metrics data with the current filter
   */
  const updateMetricsData = useCallback(async () => {
    if (!cabinet) return;

    // Cancel any previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setMetricsLoading(true);

      const updatedData = await updateCabinetMetrics(
        locationId,
        cabinetId,
        activeMetricsFilter
      );

      setCabinet(updatedData);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Failed to update metrics");
        console.error("Error updating metrics data:", err);
      }
    } finally {
      setMetricsLoading(false);
    }
  }, [locationId, cabinetId, activeMetricsFilter, cabinet]);

  /**
   * Debounced version of updateMetricsData
   */
  const debouncedUpdateMetricsRef = useRef(
    debounce(() => {
      if (updateMetricsData) updateMetricsData();
    }, 500)
  );

  /**
   * Handle filter changes
   */
  useEffect(() => {
    // Skip if filter hasn't actually changed
    if (lastMetricsFilterRef.current === activeMetricsFilter) {
      return;
    }

    // Update the last filter reference
    lastMetricsFilterRef.current = activeMetricsFilter;

    // Skip the first render to avoid double-fetching
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    // Only update metrics when filter changes, not on initial load
    if (!loading && cabinet) {
      debouncedUpdateMetricsRef.current();
    }
  }, [activeMetricsFilter, loading, cabinet]);

  /**
   * Change the active metrics filter with throttling
   */
  const changeMetricsFilter = useCallback(
    (newFilter: TimePeriod) => {
      // Prevent changing filter if already loading
      if (metricsLoading || isFilterChangeInProgress) {
        return;
      }

      // Prevent clicking on already active filter
      if (activeMetricsFilter === newFilter) {
        return;
      }

      // Throttle filter changes (no more than once per second)
      const now = Date.now();
      if (now - lastFilterChangeTimeRef.current < 1000) {
        return;
      }

      lastFilterChangeTimeRef.current = now;
      setIsFilterChangeInProgress(true);

      // Set a timeout to reset the filter change status
      setTimeout(() => {
        setIsFilterChangeInProgress(false);
      }, 800);

      setActiveMetricsFilter(newFilter);
    },
    [activeMetricsFilter, metricsLoading, isFilterChangeInProgress]
  );

  return {
    cabinet,
    setCabinet,
    loading,
    error,
    metricsLoading,
    activeMetricsFilter,
    isFilterChangeInProgress,
    changeMetricsFilter,
    updateMetricsData,
  };
}
