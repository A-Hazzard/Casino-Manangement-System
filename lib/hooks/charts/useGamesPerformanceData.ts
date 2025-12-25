/**
 * useGamesPerformanceData Hook
 *
 * Encapsulates state and logic for the Games Performance Chart.
 * Handles data fetching and processing for game-based metrics.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

type UseGamesPerformanceDataProps = {
  selectedLicencee: string;
  dateRange: { from: Date; to: Date };
};

type GamesPerformanceChartData = {
  gameName: string;
  drop: number;
  cancelledCredits: number;
  gross: number;
  [key: string]: string | number;
};

export function useGamesPerformanceData({
  selectedLicencee,
  dateRange,
}: UseGamesPerformanceDataProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<GamesPerformanceChartData[]>([]);

  const fetchChartData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(
        `/api/reports/games-performance?licensee=${selectedLicencee}&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`
      );
      setChartData(res.data);
    } catch (error) {
      console.error('Failed to fetch games performance data:', error);
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

