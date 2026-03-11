/**
 * useManagerScheduleData Hook
 *
 * Manages all state and logic for the manager schedule tab.
 */

'use client';

import { fetchSchedulersWithFilters } from '@/lib/helpers/schedulers';
import type { SchedulerTableRow } from '@/lib/types/components';
import type { LocationSelectItem } from '@/lib/types/location';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

export function useManagerScheduleData(
  selectedLicencee: string | null,
  locations: LocationSelectItem[],
  collectors: string[]
) {
  // ============================================================================
  // State Management
  // ============================================================================
  const [selectedSchedulerLocation, setSelectedSchedulerLocation] = useState<string>('all');
  const [selectedCollector, setSelectedCollector] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [schedulers, setSchedulers] = useState<SchedulerTableRow[]>([]);
  const [loadingSchedulers, setLoadingSchedulers] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // ============================================================================
  // Computed Values (Pagination)
  // ============================================================================
  const totalPages = useMemo(() => {
    return Math.ceil(schedulers.length / ITEMS_PER_PAGE) || 1;
  }, [schedulers.length]);

  const paginatedSchedulers = useMemo(() => {
    const skip = currentPage * ITEMS_PER_PAGE;
    return schedulers.slice(skip, skip + ITEMS_PER_PAGE);
  }, [schedulers, currentPage]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const fetchSchedules = useCallback(async () => {
    setLoadingSchedulers(true);
    try {
      const data = await fetchSchedulersWithFilters({
        licencee: selectedLicencee || undefined,
        location: selectedSchedulerLocation === 'all' ? undefined : selectedSchedulerLocation,
        collector: selectedCollector === 'all' ? undefined : selectedCollector,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
      });

      // Map to SchedulerTableRow format
      const mappedSchedules: SchedulerTableRow[] = data.map(item => ({
        id: item._id,
        collector: item.collectorName || item.collector || '-',
        location: item.locationName || item.location || '-',
        creator: item.creatorName || item.creator || '-',
        visitTime: item.startTime ? new Date(item.startTime).toLocaleString() : '-',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
        status: item.status || 'Pending',
      }));

      setSchedulers(mappedSchedules);
      setCurrentPage(0); // Reset to page 1 (index 0) when data changes
    } catch (error) {
      console.error('Error fetching manager schedules:', error);
    } finally {
      setLoadingSchedulers(false);
    }
  }, [selectedLicencee, selectedSchedulerLocation, selectedCollector, selectedStatus]);

  const onResetSchedulerFilters = useCallback(() => {
    setSelectedSchedulerLocation('all');
    setSelectedCollector('all');
    setSelectedStatus('all');
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Reset to page 1 (index 0) when schedulers data changes (e.g., after filtering)
  useEffect(() => {
    // If current page index is beyond valid range (totalPages - 1), reset
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(0);
    }
  }, [schedulers.length, currentPage, totalPages]);

  return {
    locations,
    collectors,
    selectedSchedulerLocation,
    onSchedulerLocationChange: setSelectedSchedulerLocation,
    selectedCollector,
    onCollectorChange: setSelectedCollector,
    selectedStatus,
    onStatusChange: setSelectedStatus,
    onResetSchedulerFilters,
    schedulers,
    paginatedSchedulers,
    loadingSchedulers,
    currentPage,
    totalPages,
    setCurrentPage,
  };
}

