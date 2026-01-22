/**
 * useCollectorScheduleData Hook
 *
 * Manages all state and logic for the collector schedule tab.
 */

'use client';

import { fetchAndFormatCollectorSchedules } from '@/lib/helpers/collections';
import type { CollectorSchedule } from '@/lib/types/components';
import type { LocationSelectItem } from '@/lib/types/location';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;

export function useCollectorScheduleData(
  selectedLicencee: string | null,
  locations: LocationSelectItem[]
) {
  // ============================================================================
  // State Management
  // ============================================================================
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedCollector, setSelectedCollector] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [collectorSchedules, setCollectorSchedules] = useState<CollectorSchedule[]>([]);
  const [collectors, setCollectors] = useState<string[]>([]);
  const [loadingCollectorSchedules, setLoadingCollectorSchedules] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // ============================================================================
  // Computed Values (Pagination)
  // ============================================================================
  const totalPages = useMemo(() => {
    return Math.ceil(collectorSchedules.length / ITEMS_PER_PAGE) || 1;
  }, [collectorSchedules.length]);

  const paginatedSchedules = useMemo(() => {
    const skip = currentPage * ITEMS_PER_PAGE;
    return collectorSchedules.slice(skip, skip + ITEMS_PER_PAGE);
  }, [collectorSchedules, currentPage]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const fetchSchedules = useCallback(async () => {
    setLoadingCollectorSchedules(true);
    try {
      const { collectorSchedules: schedules, collectors: collectorList } = 
        await fetchAndFormatCollectorSchedules(
          selectedLicencee || undefined,
          selectedLocation === 'all' ? undefined : selectedLocation,
          selectedCollector === 'all' ? undefined : selectedCollector,
          selectedStatus === 'all' ? undefined : selectedStatus
        );

      setCollectorSchedules(schedules);
      setCollectors(collectorList);
      setCurrentPage(0); // Reset to page 1 (index 0) when data changes
    } catch (error) {
      console.error('Error fetching collector schedules:', error);
    } finally {
      setLoadingCollectorSchedules(false);
    }
  }, [selectedLicencee, selectedLocation, selectedCollector, selectedStatus]);

  const onResetFilters = useCallback(() => {
    setSelectedLocation('all');
    setSelectedCollector('all');
    setSelectedStatus('all');
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Reset to page 1 (index 0) if current page index is beyond valid range
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(0);
    }
  }, [collectorSchedules.length, currentPage, totalPages]);

  return {
    locations,
    collectors,
    selectedLocation,
    onLocationChange: setSelectedLocation,
    selectedCollector,
    onCollectorChange: setSelectedCollector,
    selectedStatus,
    onStatusChange: setSelectedStatus,
    onResetFilters,
    collectorSchedules,
    paginatedSchedules,
    loadingCollectorSchedules,
    currentPage,
    totalPages,
    setCurrentPage,
  };
}

