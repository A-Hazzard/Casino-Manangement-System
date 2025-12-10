/**
 * Custom hook for managing location membership statistics
 * Handles membership stats fetching and state management for locations page
 * Uses the dedicated membership count API that respects user permissions
 *
 * @param locationId - Optional specific location ID to get stats for that location only
 */

import {
  fetchMembershipStats,
  type MembershipStats,
} from '@/lib/helpers/membershipStats';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useCallback, useEffect, useState } from 'react';

export type UseLocationMembershipStatsReturn = {
  membershipStats: MembershipStats | null;
  membershipStatsLoading: boolean;
  refreshMembershipStats: () => Promise<void>;
  error: string | null;
};

export function useLocationMembershipStats(
  locationId?: string,
  machineTypeFilter?: string | null
): UseLocationMembershipStatsReturn {
  const [membershipStats, setMembershipStats] =
    useState<MembershipStats | null>(null);
  const [membershipStatsLoading, setMembershipStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedLicencee = useDashBoardStore(state => state.selectedLicencee);
  const makeRequest = useAbortableRequest();

  // Fetch membership stats
  const fetchMembershipStatsData = useCallback(async () => {
    setMembershipStatsLoading(true);
    setError(null);

    try {
      // Use selected licensee or 'all' if not selected
      const licensee = selectedLicencee || 'all';
      const stats = await fetchMembershipStats(
        licensee,
        locationId,
        machineTypeFilter
      );
      setMembershipStats(stats);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch membership stats';
      setError(errorMessage);
      setMembershipStats({
        membershipCount: 0,
      });
    } finally {
      setMembershipStatsLoading(false);
    }
  }, [selectedLicencee, locationId, machineTypeFilter]);

  // Refresh membership stats
  const refreshMembershipStats = useCallback(async () => {
    await fetchMembershipStatsData();
  }, [fetchMembershipStatsData]);

  // Load membership stats on mount and when selectedLicencee, locationId, or machineTypeFilter changes
  useEffect(() => {
    const loadMembershipStats = async () => {
      setMembershipStatsLoading(true);
      setError(null);

      const result = await makeRequest(async signal => {
        const licensee = selectedLicencee || 'all';
        const stats = await fetchMembershipStats(
          licensee,
          locationId,
          machineTypeFilter,
          signal
        );
        return stats;
      }, 'membership-stats');

      // Only update state if request wasn't aborted
      if (result !== null) {
        setMembershipStats(result);
        setMembershipStatsLoading(false);
      } else {
        // If aborted, keep loading state active so skeleton continues to show
        // The next request will complete and update the loading state
      }
    };

    loadMembershipStats();
  }, [selectedLicencee, locationId, machineTypeFilter, makeRequest]);

  return {
    membershipStats,
    membershipStatsLoading,
    refreshMembershipStats,
    error,
  };
}
