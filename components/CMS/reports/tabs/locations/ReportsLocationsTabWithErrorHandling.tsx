/**
 * Reports Locations Tab With Error Handling Component
 * Wrapper component for ReportsLocationsTab that handles connection errors gracefully
 */

'use client';

import { useState, useCallback } from 'react';
import { useApiWithRetry } from '@/lib/hooks/data/useApiWithRetry';
import {
  classifyError,
  getUserFriendlyErrorMessage,
  showErrorNotification,
  showRetrySuccessNotification,
  showRetryWarningNotification,
} from '@/lib/utils/errors';
import ConnectionError from '@/components/shared/ui/errors/ConnectionError';
import ReportsLocationsTab from './ReportsLocationsTab';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import axios from 'axios';

/**
 * Main ReportsLocationsTabWithErrorHandling Component
 */
export default function ReportsLocationsTabWithErrorHandling() {
  const { selectedLicencee } = useDashBoardStore();
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // API function for fetching locations data
  const fetchLocationsData = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedLicencee && selectedLicencee !== 'all') {
      params.append('licencee', selectedLicencee);
    }
    params.append('timePeriod', '30d');
    params.append('showAllLocations', 'true');

    const response = await axios.get(
      `/api/reports/locations?${params.toString()}`
    );
    return response;
  }, [selectedLicencee]);

  // Use the retry hook for API calls
  const { data, loading, execute } = useApiWithRetry(fetchLocationsData, {
    maxRetries: 3,
    baseDelay: 1000,
    onError: apiError => {
      setConnectionError(new Error(getUserFriendlyErrorMessage(apiError)));
      showErrorNotification(apiError, 'Locations Data');
    },
    onRetry: (attempt, apiError) => {
      console.warn(
        `Retrying locations data fetch (attempt ${attempt}):`,
        apiError
      );
      showRetryWarningNotification(attempt, 3, 'Locations Data');
    },
  });

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setConnectionError(null);

    try {
      await execute();
      showRetrySuccessNotification('Locations Data');
    } catch (error) {
      const apiError = classifyError(error);
      setConnectionError(new Error(getUserFriendlyErrorMessage(apiError)));
      showErrorNotification(apiError, 'Locations Data');
    } finally {
      setIsRetrying(false);
    }
  }, [execute]);

  // If there's a connection error, show the error UI
  if (connectionError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <ConnectionError
          error={connectionError}
          onRetry={handleRetry}
          isRetrying={isRetrying}
          title="Unable to Load Locations Data"
          description="We're having trouble connecting to our database. This might be due to network issues or server maintenance."
        />
      </div>
    );
  }

  // If loading and no data, show loading state
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  // Render the actual ReportsLocationsTab component
  return <ReportsLocationsTab />;
}

