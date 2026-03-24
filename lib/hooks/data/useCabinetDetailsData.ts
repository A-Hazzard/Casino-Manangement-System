/**
 * Custom hook for managing cabinet details data fetching and state
 * Extracts complex cabinet details logic from the Cabinet Details page
 */

import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { fetchCabinetById } from '@/lib/helpers/cabinets';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { GamingMachine as CabinetDetail } from '@/shared/types/entities';
import { isAbortError } from '@/lib/utils/errors';
import { differenceInMinutes } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { dateRange } from '@/lib/types/index';

type UseCabinetDetailsDataProps = {
  slug: string;
  selectedLicencee: string;
  activeMetricsFilter: string | null;
  customDateRange?: dateRange;
  dateFilterInitialized: boolean;
};

type UseCabinetDetailsDataReturn = {
  cabinet: CabinetDetail | null;
  locationName: string;
  error: string | null;
  errorType: 'not-found' | 'network' | 'unauthorized' | 'unknown';
  metricsLoading: boolean;
  isOnline: boolean;
  fetchCabinetDetailsData: () => Promise<void>;
  handleCabinetUpdated: () => void;
};

export function useCabinetDetailsData({
  slug,
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  dateFilterInitialized,
}: UseCabinetDetailsDataProps): UseCabinetDetailsDataReturn {
  // ============================================================================
  // State
  // ============================================================================
  const [cabinet, setCabinet] = useState<CabinetDetail | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    'not-found' | 'network' | 'unauthorized' | 'unknown'
  >('unknown');
  const [isOnline, setIsOnline] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Get display currency from context (synced with store) for currency conversion
  const { displayCurrency } = useCurrency();

  // AbortController for cabinet details queries
  const makeRequest = useAbortableRequest();

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchCabinetDetailsData = useCallback(async () => {
    setError(null);
    setErrorType('unknown');
    setMetricsLoading(true);

    let wasAborted = false;

    try {
      // Read latest values from store at call time to avoid stale closures
      // (e.g. when called via onCustomRangeGo setTimeout callback)
      const storeState = useDashBoardStore.getState();
      const currentActiveMetricsFilter = storeState.activeMetricsFilter || activeMetricsFilter;
      const currentCustomDateRange = storeState.customDateRange || customDateRange;

      // Fetch cabinet data with current date filter - no default fallback
      if (!currentActiveMetricsFilter) {
        setMetricsLoading(false);
        return;
      }

      // Robustly check for custom dates - support both {from, to} and {startDate, endDate}
      const hasCustomDates =
        currentActiveMetricsFilter === 'Custom' && (
          (currentCustomDateRange?.startDate && currentCustomDateRange?.endDate) ||
          (currentCustomDateRange?.from && currentCustomDateRange?.to) ||
          (currentCustomDateRange?.start && currentCustomDateRange?.end)
        );

      if (currentActiveMetricsFilter === 'Custom' && !hasCustomDates) {
        setMetricsLoading(false);
        return;
      }

      // Resolve effective custom ranges into a standard { from, to } Date format
      const from = currentCustomDateRange?.startDate || currentCustomDateRange?.from || currentCustomDateRange?.start;
      const to = currentCustomDateRange?.endDate || currentCustomDateRange?.to || currentCustomDateRange?.end;
      
      const effectiveRange = currentActiveMetricsFilter === 'Custom' && from && to
        ? {
            from: from instanceof Date ? from : new Date(String(from)),
            to: to instanceof Date ? to : new Date(String(to))
          }
        : undefined;

      // Always pass current display currency so cabinet detail values
      // are returned in the header-selected currency.
      const cabinetData = await makeRequest(signal =>
        fetchCabinetById(
          slug,
          currentActiveMetricsFilter,
          effectiveRange,
          displayCurrency,
          selectedLicencee || null,
          signal
        )
      );

      // NOTE: reviewer multiplier is applied server-side — no client-side scaling needed

      // If request was aborted (returned null), keep existing cabinet data
      if (cabinetData === null || cabinetData === undefined) {
        wasAborted = true;
        return;
      }

      setCabinet(cabinetData);

      // Use location name directly from cabinet data
      if (cabinetData?.locationName) {
        setLocationName(cabinetData.locationName);
      } else if (cabinetData?.locationId) {
        setLocationName('Location Not Found');
      } else {
        setLocationName('No Location Assigned');
      }

      if (cabinetData?.lastActivity) {
        const lastActive = new Date(cabinetData.lastActivity);
        setIsOnline(differenceInMinutes(new Date(), lastActive) <= 3);
      }
    } catch (err) {
      // Silently handle aborted requests - keep existing data, don't set error
      if (isAbortError(err)) {
        wasAborted = true;
        return;
      }

      setCabinet(null);

      // Determine error type based on the error
      if (err instanceof Error) {
        // Check for unauthorized access (403)
        const errorWithStatus = err as Error & {
          status?: number;
          isUnauthorized?: boolean;
          response?: { status?: number };
        };
        if (
          errorWithStatus.status === 403 ||
          errorWithStatus.isUnauthorized ||
          errorWithStatus.response?.status === 403 ||
          err.message.includes('Unauthorized') ||
          err.message.includes('do not have access')
        ) {
          setError('You are not authorized to view this cabinet');
          setErrorType('unauthorized');
        } else if (
          err.message.includes('404') ||
          err.message.includes('not found')
        ) {
          setError('Cabinet not found');
          setErrorType('not-found');
        } else if (
          err.message.includes('network') ||
          err.message.includes('fetch')
        ) {
          setError('Network error');
          setErrorType('network');
        } else {
          setError('Failed to fetch cabinet details');
          setErrorType('unknown');
        }
      } else {
        setError('Failed to fetch cabinet details');
        setErrorType('unknown');
      }

      // Only show toast for non-unauthorized errors
      const errorWithStatus =
        err instanceof Error
          ? (err as Error & {
              status?: number;
              isUnauthorized?: boolean;
              response?: { status?: number };
            })
          : null;
      const isUnauthorized =
        errorWithStatus &&
        (errorWithStatus.status === 403 ||
          errorWithStatus.isUnauthorized ||
          errorWithStatus.response?.status === 403 ||
          errorWithStatus.message.includes('Unauthorized') ||
          errorWithStatus.message.includes('do not have access'));

      if (!isUnauthorized) {
        toast.error('Failed to fetch cabinet details');
      }
    } finally {
      // Don't clear loading on abort — a new request is in-flight and will clear it
      if (!wasAborted) {
        setMetricsLoading(false);
      }
    }
  }, [
    slug,
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    makeRequest,
    // Include specific date values to ensure reference changes are caught
    customDateRange?.startDate?.getTime(),
    customDateRange?.endDate?.getTime(),
    customDateRange?.from?.getTime(),
    customDateRange?.to?.getTime(),
  ]);

  // Callback function to refresh cabinet data after updates
  const handleCabinetUpdated = useCallback(() => {
    fetchCabinetDetailsData();
  }, [fetchCabinetDetailsData]);

  useEffect(() => {
    // Only fetch if we have a valid date filter and it's been properly initialized
    if (activeMetricsFilter && dateFilterInitialized) {
      fetchCabinetDetailsData();
    }
  }, [
    slug,
    activeMetricsFilter,
    dateFilterInitialized,
    customDateRange,
    displayCurrency,
    selectedLicencee,
    fetchCabinetDetailsData,
    // Force trigger on date value changes
    customDateRange?.startDate?.getTime(),
    customDateRange?.endDate?.getTime(),
    customDateRange?.from?.getTime(),
    customDateRange?.to?.getTime(),
  ]);

  return {
    cabinet,
    locationName,
    error,
    errorType,
    metricsLoading,
    isOnline,
    fetchCabinetDetailsData,
    handleCabinetUpdated,
  };
}

