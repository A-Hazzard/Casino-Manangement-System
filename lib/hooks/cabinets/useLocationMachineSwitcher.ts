/**
 * useLocationMachineSwitcher Hook
 *
 * Lazily loads all machines at a location for the cabinet detail page switcher.
 * Uses the same aggregation query as the location details page.
 */

'use client';

import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import type { dateRange as LibDateRange } from '@/lib/types';
import { isAbortError } from '@/lib/utils/errors';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { useCallback, useEffect, useState } from 'react';

import type { DateRange as ReactDayPickerDateRange } from 'react-day-picker';

const ITEMS_PER_BATCH = 40;

type UseLocationMachineSwitcherOptions = {
  locationId: string;
  selectedLicencee: string | null;
  activeMetricsFilter: string | null;
  customDateRange: LibDateRange | null;
  enabled?: boolean;
};

function extractDateRange(
  customDateRange: LibDateRange | null
): ReactDayPickerDateRange | undefined {
  if (!customDateRange) return undefined;
  return {
    from:
      customDateRange.startDate instanceof Date
        ? customDateRange.startDate
        : customDateRange.startDate
          ? new Date(customDateRange.startDate)
          : customDateRange.from
            ? new Date(customDateRange.from)
            : undefined,
    to:
      customDateRange.endDate instanceof Date
        ? customDateRange.endDate
        : customDateRange.endDate
          ? new Date(customDateRange.endDate)
          : customDateRange.to
            ? new Date(customDateRange.to)
            : undefined,
  };
}

function hasCustomDateRangeReady(
  activeMetricsFilter: string | null,
  customDateRange: LibDateRange | null
): boolean {
  if (activeMetricsFilter !== 'Custom') return true;
  if (!customDateRange) return false;
  return Boolean(
    (customDateRange.startDate && customDateRange.endDate) ||
      (customDateRange.from && customDateRange.to) ||
      (customDateRange.start && customDateRange.end)
  );
}

export function useLocationMachineSwitcher({
  locationId,
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  enabled = true,
}: UseLocationMachineSwitcherOptions) {
  const { displayCurrency } = useCurrency();
  const makeRequest = useAbortableRequest();
  const [machines, setMachines] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllMachines = useCallback(async () => {
    if (!locationId || !activeMetricsFilter || !enabled) {
      return;
    }

    if (!hasCustomDateRangeReady(activeMetricsFilter, customDateRange)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dateRange =
        activeMetricsFilter === 'Custom'
          ? extractDateRange(customDateRange)
          : undefined;

      const accumulated: Cabinet[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const result = await makeRequest(signal =>
          fetchCabinetsForLocation(
            locationId,
            selectedLicencee ?? undefined,
            activeMetricsFilter,
            undefined,
            dateRange,
            page,
            ITEMS_PER_BATCH,
            displayCurrency,
            'all',
            false,
            'all',
            'serialNumber',
            'asc',
            signal
          )
        );

        if (!result) {
          return;
        }

        if (result.data.length > 0) {
          const existingIds = new Set(accumulated.map(machine => machine._id));
          const newMachines = result.data.filter(
            machine => !existingIds.has(machine._id)
          );
          accumulated.push(...newMachines);
        }

        if (result.pagination?.totalPages) {
          totalPages = result.pagination.totalPages;
        } else if (result.data.length < ITEMS_PER_BATCH) {
          break;
        }

        page += 1;
      }

      setMachines(accumulated);
    } catch (fetchError) {
      if (isAbortError(fetchError)) {
        return;
      }
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load location machines';
      setError(message);
      console.error('[useLocationMachineSwitcher] Error:', message);
    } finally {
      setLoading(false);
    }
  }, [
    locationId,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    enabled,
    displayCurrency,
    makeRequest,
  ]);

  useEffect(() => {
    if (!enabled || !locationId) {
      setMachines([]);
      return;
    }

    void fetchAllMachines();
  }, [enabled, locationId, fetchAllMachines]);

  return {
    machines,
    loading,
    error,
    refetch: fetchAllMachines,
  };
}
