/**
 * useMonthlyReportData Hook
 *
 * Manages all state and logic for the monthly report tab.
 */

'use client';

import { fetchMonthlyReportSummaryAndDetails } from '@/lib/helpers/collectionReport';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import type {
    MonthlyReportDetailsRow,
    MonthlyReportSummary
} from '@/lib/types/components';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange as RDPDateRange } from 'react-day-picker';

export function useMonthlyReportData(selectedLicencee: string | null, activeTab: string) {
  // ============================================================================
  // State Management
  // ============================================================================
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [monthlyLocation, setMonthlyLocation] = useState<string | string[]>('all');
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyReportSummary>({
    drop: '-',
    cancelledCredits: '-',
    gross: '-',
    sasGross: '-',
  });
  const [monthlyDetails, setMonthlyDetails] = useState<MonthlyReportDetailsRow[]>([]);
  const [sortField, setSortField] = useState<keyof MonthlyReportDetailsRow>('gross');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [monthlyPage, setMonthlyPage] = useState(0);
  const [pendingRange, setPendingRange] = useState<RDPDateRange | undefined>(() => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(end);
    return { from: start, to: end };
  });

  const paginationRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 20;

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
        locationId: Array.isArray(monthlyLocation) ? undefined : (monthlyLocation === 'all' ? undefined : monthlyLocation),
        locationIds: Array.isArray(monthlyLocation) ? monthlyLocation : undefined,
        licencee: selectedLicencee || undefined,
      });
      
      setMonthlySummary(summary);
      setMonthlyDetails(details);
      setMonthlyPage(0);
    } catch (error) {
      console.error('Error fetching monthly report data:', error);
    } finally {
      setMonthlyLoading(false);
    }
  }, [pendingRange, monthlyLocation, selectedLicencee]);

  const handleSort = useCallback((field: keyof MonthlyReportDetailsRow) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to desc for new field
    }
    setMonthlyPage(0);
  }, [sortField]);

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

  const sortedDetails = useMemo(() => {
    const data = [...monthlyDetails];
    if (!sortField) return data;

    return data.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      // Helper to parse currency string to number
      const parseVal = (v: string) => {
        if (v === '-' || !v) return -Infinity;
        const num = parseFloat(v.replace(/[$,]/g, ''));
        return isNaN(num) ? -Infinity : num;
      };

      if (sortField === 'location') {
        return sortDirection === 'asc'
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }

      const numA = parseVal(valA as string);
      const numB = parseVal(valB as string);

      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [monthlyDetails, sortField, sortDirection]);

  const monthlyCurrentItems = useMemo(() => {
    const skip = monthlyPage * ITEMS_PER_PAGE;
    return sortedDetails.slice(skip, skip + ITEMS_PER_PAGE);
  }, [sortedDetails, monthlyPage]);

  const firstItemIndex = monthlyPage * ITEMS_PER_PAGE + 1;
  const lastItemIndex = Math.min((monthlyPage + 1) * ITEMS_PER_PAGE, monthlyDetails.length);

  // ============================================================================
  // Effects
  // ============================================================================
  // Fetch locations on mount and licencee change
  useEffect(() => {
    fetchAllGamingLocations(selectedLicencee || undefined).then(setLocations);
  }, [selectedLicencee]);

  // Fetch only when the monthly tab is active
  useEffect(() => {
    if (activeTab !== 'monthly') return;
    fetchMonthlyData();
  }, [fetchMonthlyData, activeTab]);

  return {
    locations,
    monthlyLocation,
    onMonthlyLocationChange: setMonthlyLocation,
    pendingRange,
    onPendingRangeChange: setPendingRange,
    onApplyDateRange: fetchMonthlyData,
    onSetLastMonth: handleSetLastMonth,
    monthlySummary,
    monthlyDetails: sortedDetails,
    monthlyCurrentItems,
    monthlyLoading,
    monthlyTotalPages,
    monthlyPage,
    onPaginateMonthly: setMonthlyPage,
    monthlyPaginationRef: paginationRef,
    monthlyFirstItemIndex: firstItemIndex,
    monthlyLastItemIndex: lastItemIndex,
    sortField,
    sortDirection,
    handleSort,
  };
}

