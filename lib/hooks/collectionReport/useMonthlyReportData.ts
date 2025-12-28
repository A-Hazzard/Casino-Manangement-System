/**
 * useMonthlyReportData Hook
 *
 * Manages all state and logic for the monthly report tab.
 */

'use client';

import {
    fetchMonthlyReportLocations,
    fetchMonthlyReportSummaryAndDetails
} from '@/lib/helpers/collectionReport';
import type {
    MonthlyReportDetailsRow,
    MonthlyReportSummary
} from '@/lib/types/componentProps';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange as RDPDateRange } from 'react-day-picker';

export function useMonthlyReportData(selectedLicencee: string | null) {
  // ============================================================================
  // State Management
  // ============================================================================
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [monthlyLocation, setMonthlyLocation] = useState<string>('all');
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyReportSummary>({
    drop: '-',
    cancelledCredits: '-',
    gross: '-',
    sasGross: '-',
  });
  const [monthlyDetails, setMonthlyDetails] = useState<MonthlyReportDetailsRow[]>([]);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [pendingRange, setPendingRange] = useState<RDPDateRange | undefined>(() => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(end);
    return { from: start, to: end };
  });

  const paginationRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 10;

  // ============================================================================
  // Handlers
  // ============================================================================
  const fetchMonthlyData = useCallback(async () => {
    if (!pendingRange?.from || !pendingRange?.to) return;
    
    setMonthlyLoading(true);
    try {
      const { summary, details } = await fetchMonthlyReportSummaryAndDetails({
        startDate: pendingRange.from,
        endDate: pendingRange.to,
        locationName: monthlyLocation,
        licencee: selectedLicencee || undefined,
      });
      
      setMonthlySummary(summary);
      setMonthlyDetails(details);
      setMonthlyPage(1);
    } catch (error) {
      console.error('Error fetching monthly report data:', error);
    } finally {
      setMonthlyLoading(false);
    }
  }, [pendingRange, monthlyLocation, selectedLicencee]);

  const handleSetLastMonth = useCallback(() => {
    const lastMonth = subMonths(new Date(), 1);
    const start = startOfMonth(lastMonth);
    const end = endOfMonth(lastMonth);
    setPendingRange({ from: start, to: end });
    // After setting range, it will trigger fetch due to dependency if we use an effect
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const monthlyTotalPages = useMemo(() => {
    return Math.ceil(monthlyDetails.length / ITEMS_PER_PAGE) || 1;
  }, [monthlyDetails.length]);

  const monthlyCurrentItems = useMemo(() => {
    const skip = (monthlyPage - 1) * ITEMS_PER_PAGE;
    return monthlyDetails.slice(skip, skip + ITEMS_PER_PAGE);
  }, [monthlyDetails, monthlyPage]);

  const firstItemIndex = (monthlyPage - 1) * ITEMS_PER_PAGE + 1;
  const lastItemIndex = Math.min(monthlyPage * ITEMS_PER_PAGE, monthlyDetails.length);

  // ============================================================================
  // Effects
  // ============================================================================
  // Fetch locations on mount and licensee change
  useEffect(() => {
    fetchMonthlyReportLocations(selectedLicencee || undefined).then(setLocations);
  }, [selectedLicencee]);

  // Initial fetch and fetch on location/range change
  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  return {
    locations,
    monthlyLocation,
    onMonthlyLocationChange: setMonthlyLocation,
    pendingRange,
    onPendingRangeChange: setPendingRange,
    onApplyDateRange: fetchMonthlyData,
    onSetLastMonth: handleSetLastMonth,
    monthlySummary,
    monthlyDetails,
    monthlyCurrentItems,
    monthlyLoading,
    monthlyTotalPages,
    monthlyPage,
    onPaginateMonthly: setMonthlyPage,
    monthlyPaginationRef: paginationRef,
    monthlyFirstItemIndex: firstItemIndex,
    monthlyLastItemIndex: lastItemIndex,
  };
}
