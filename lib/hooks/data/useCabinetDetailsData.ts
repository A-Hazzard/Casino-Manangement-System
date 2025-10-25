/**
 * Custom hook for managing cabinet details data fetching and state
 * Extracts complex cabinet details logic from the Cabinet Details page
 */

import { useState, useEffect, useCallback } from 'react';
import { differenceInMinutes } from 'date-fns';
import { fetchCabinetById } from '@/lib/helpers/cabinets';
import { GamingMachine as CabinetDetail } from '@/shared/types/entities';
import { toast } from 'sonner';

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
  errorType: 'not-found' | 'network' | 'unknown';
  metricsLoading: boolean;
  isOnline: boolean;
  fetchCabinetDetailsData: () => Promise<void>;
  handleCabinetUpdated: () => void;
};

export function useCabinetDetailsData({
  slug,
  selectedLicencee: _selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  dateFilterInitialized,
}: UseCabinetDetailsDataProps): UseCabinetDetailsDataReturn {
  const [cabinet, setCabinet] = useState<CabinetDetail | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    'not-found' | 'network' | 'unknown'
  >('unknown');
  const [isOnline, setIsOnline] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

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

      const cabinetData = await fetchCabinetById(
        slug,
        activeMetricsFilter,
        activeMetricsFilter === 'Custom' && customDateRange
          ? { from: customDateRange.startDate, to: customDateRange.endDate }
          : undefined
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
        if (err.message.includes('404') || err.message.includes('not found')) {
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

      toast.error('Failed to fetch cabinet details');
    } finally {
      setMetricsLoading(false);
    }
  }, [slug, activeMetricsFilter, customDateRange]);

  // Callback function to refresh cabinet data after updates
  const handleCabinetUpdated = useCallback(() => {
    fetchCabinetDetailsData();
  }, [fetchCabinetDetailsData]);

  useEffect(() => {
    // Only fetch if we have a valid date filter and it's been properly initialized
    if (activeMetricsFilter && dateFilterInitialized) {
      fetchCabinetDetailsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, activeMetricsFilter, dateFilterInitialized, customDateRange]);

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
