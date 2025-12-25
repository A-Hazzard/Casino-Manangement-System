/**
 * useManufacturerPerformanceData Hook
 *
 * Encapsulates state and logic for the Manufacturer Performance Chart.
 * Handles data fetching and processing for manufacturer-based metrics.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

type UseManufacturerPerformanceDataProps = {
  selectedLicencee: string;
  dateRange: { from: Date; to: Date };
};

type ManufacturerPerformanceChartData = {
  manufacturer: string;
  drop: number;
  cancelledCredits: number;
  gross: number;
  [key: string]: string | number;
};

export function useManufacturerPerformanceData({
  selectedLicencee,
  dateRange,
}: UseManufacturerPerformanceDataProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<ManufacturerPerformanceChartData[]>([]);

  const fetchChartData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(
        `/api/reports/manufacturer-performance?licensee=${selectedLicencee}&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`
      );
      setChartData(res.data);
    } catch (error) {
      console.error('Failed to fetch manufacturer performance data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLicencee, dateRange]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  return {
    isLoading,
    chartData,
    refreshData: fetchChartData,
  };
}

