/**
 * useManagerScheduleData Hook
 *
 * Manages all state and logic for the manager schedule tab.
 */

'use client';

import { fetchSchedulersWithFilters } from '@/lib/helpers/schedulers';
import type { SchedulerTableRow } from '@/lib/types/componentProps';
import type { LocationSelectItem } from '@/lib/types/location';
import { useCallback, useEffect, useState } from 'react';

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
        collector: item.collector || '-',
        location: item.location || '-',
        creator: item.creator || '-',
        visitTime: item.startTime ? new Date(item.startTime).toLocaleString() : '-',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString() : '-',
        status: item.status || 'Pending',
      }));

      setSchedulers(mappedSchedules);
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
    loadingSchedulers,
  };
}
