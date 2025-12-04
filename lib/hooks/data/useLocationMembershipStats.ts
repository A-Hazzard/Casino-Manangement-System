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
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useCallback, useEffect, useState } from 'react';

export type UseLocationMembershipStatsReturn = {
  membershipStats: MembershipStats | null;
  membershipStatsLoading: boolean;
  refreshMembershipStats: () => Promise<void>;
  error: string | null;
};

export function useLocationMembershipStats(
  locationId?: string
): UseLocationMembershipStatsReturn {
  const [membershipStats, setMembershipStats] =
    useState<MembershipStats | null>(null);
  const [membershipStatsLoading, setMembershipStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedLicencee = useDashBoardStore(state => state.selectedLicencee);

  // Fetch membership stats
  const fetchMembershipStatsData = useCallback(async () => {
    setMembershipStatsLoading(true);
    setError(null);

    try {
      // Use selected licensee or 'all' if not selected
      const licensee = selectedLicencee || 'all';
      const stats = await fetchMembershipStats(licensee, locationId);
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
  }, [selectedLicencee, locationId]);

  // Refresh membership stats
  const refreshMembershipStats = useCallback(async () => {
    await fetchMembershipStatsData();
  }, [fetchMembershipStatsData]);

  // Load membership stats on mount and when selectedLicencee or locationId changes
  useEffect(() => {
    let aborted = false;

    const loadMembershipStats = async () => {
      setMembershipStatsLoading(true);
      setError(null);

      try {
        const licensee = selectedLicencee || 'all';
        const stats = await fetchMembershipStats(licensee, locationId);
        if (!aborted) {
          setMembershipStats(stats);
        }
      } catch (err) {
        if (!aborted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch');
          setMembershipStats({ membershipCount: 0 });
        }
      } finally {
        if (!aborted) {
          setMembershipStatsLoading(false);
        }
      }
    };

    loadMembershipStats();

    return () => {
      aborted = true;
    };
  }, [selectedLicencee, locationId]);

  return {
    membershipStats,
    membershipStatsLoading,
    refreshMembershipStats,
    error,
  };
}
