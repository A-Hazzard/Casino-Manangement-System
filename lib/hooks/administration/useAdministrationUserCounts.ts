/**
 * useAdministrationUserCounts Hook
 *
 * Fetches user counts by role for the administration page.
 * Filters by licensee and excludes users with deletedAt >= 2025-01-01.
 * Includes disabled users.
 */

'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

type UserCounts = {
  total: number;
  collectors: number;
  admins: number;
  locationAdmins: number;
  managers: number;
};

export function useAdministrationUserCounts(selectedLicencee: string | null) {
  const [counts, setCounts] = useState<UserCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchCounts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params: Record<string, string> = {};
        if (selectedLicencee && selectedLicencee !== 'all') {
          params.licensee = selectedLicencee;
        }

        const response = await axios.get<{
          success: boolean;
          counts: UserCounts;
        }>('/api/users/counts', { params });

        if (isMounted && response.data.success) {
          setCounts(response.data.counts);
        }
      } catch (err) {
        if (isMounted) {
          const error =
            err instanceof Error
              ? err
              : new Error('Failed to fetch user counts');
          setError(error);
          console.error('[useAdministrationUserCounts] Error:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCounts();

    return () => {
      isMounted = false;
    };
  }, [selectedLicencee]);

  return { counts, isLoading, error };
}
