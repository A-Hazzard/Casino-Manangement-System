/**
 * useCollectorScheduleData Hook
 *
 * Manages all state and logic for the collector schedule tab.
 */

'use client';

import { fetchAndFormatCollectorSchedules } from '@/lib/helpers/collectorSchedules';
import type { CollectorSchedule } from '@/lib/types/components';
import type { LocationSelectItem } from '@/lib/types/location';
import { useCallback, useEffect, useState } from 'react';

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
    loadingCollectorSchedules,
  };
}
