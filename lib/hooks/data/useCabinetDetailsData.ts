/**
 * Custom hook for managing cabinet details data fetching and state
 * Extracts complex cabinet details logic from the Cabinet Details page
 */

import { useState, useEffect, useCallback } from 'react';
import { differenceInMinutes } from 'date-fns';
import { fetchCabinetById } from '@/lib/helpers/cabinets';
import { GamingMachine as CabinetDetail } from '@/shared/types/entities';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/contexts/CurrencyContext';

type UseCabinetDetailsDataProps = {
  slug: string;
  selectedLicencee: string;
  activeMetricsFilter: string | null;
  customDateRange: { startDate: Date; endDate: Date } | null;
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

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchCabinetDetailsData = useCallback(async () => {
    setError(null);
    setErrorType('unknown');
    setMetricsLoading(true);

    try {
      // Fetch cabinet data with current date filter - no default fallback
      if (!activeMetricsFilter) {
        setMetricsLoading(false);
        return;
      }

      // If Custom is selected but dates aren't available, don't fetch
      // This prevents the 500 error "Custom start and end dates are required"
      if (
        activeMetricsFilter === 'Custom' &&
        (!customDateRange || !customDateRange.startDate || !customDateRange.endDate)
      ) {
        setMetricsLoading(false);
        return;
      }

      // Always pass current display currency so cabinet detail values
      // are returned in the header-selected currency.
      const currency = displayCurrency;

      const cabinetData = await fetchCabinetById(
        slug,
        activeMetricsFilter,
        activeMetricsFilter === 'Custom' && customDateRange
          ? { from: customDateRange.startDate, to: customDateRange.endDate }
          : undefined,
        currency,
        selectedLicencee || null
      );

      // Check if cabinet was not found
      if (!cabinetData) {
        setError('Cabinet not found');
        setErrorType('not-found');
        setCabinet(null);
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
      setCabinet(null);

      // Determine error type based on the error
      if (err instanceof Error) {
        // Check for unauthorized access (403)
        const errorWithStatus = err as Error & { status?: number; isUnauthorized?: boolean; response?: { status?: number } };
        if (
          errorWithStatus.status === 403 ||
          errorWithStatus.isUnauthorized ||
          errorWithStatus.response?.status === 403 ||
          err.message.includes('Unauthorized') ||
          err.message.includes('do not have access')
        ) {
          setError('You are not authorized to view this cabinet');
          setErrorType('unauthorized');
        } else if (err.message.includes('404') || err.message.includes('not found')) {
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
      const errorWithStatus = err instanceof Error ? err as Error & { status?: number; isUnauthorized?: boolean; response?: { status?: number } } : null;
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
      setMetricsLoading(false);
    }
  }, [slug, activeMetricsFilter, customDateRange, selectedLicencee, displayCurrency]);

  // Callback function to refresh cabinet data after updates
  const handleCabinetUpdated = useCallback(() => {
    fetchCabinetDetailsData();
  }, [fetchCabinetDetailsData]);

  useEffect(() => {
    // Only fetch if we have a valid date filter and it's been properly initialized
    if (activeMetricsFilter && dateFilterInitialized) {
      fetchCabinetDetailsData();
    }
  }, [slug, activeMetricsFilter, dateFilterInitialized, customDateRange, displayCurrency, fetchCabinetDetailsData]);

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
