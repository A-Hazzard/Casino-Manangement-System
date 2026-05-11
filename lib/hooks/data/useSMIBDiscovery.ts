/**
 * Custom hook for SMIB discovery
 * Fetches all SMIB devices from database
 * Note: Online status monitoring removed due to scalability issues with 1000+ SMIBs
 */

import type { DiscoverSmibsResponse } from '@/lib/types/api';
import type { SmibDevice } from '@/shared/types/entities';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

type UseSmibDiscoveryReturn = {
  allSmibs: SmibDevice[];
  availableSmibs: SmibDevice[];
  loading: boolean;
  error: string | null;
  refreshSmibs: () => Promise<void>;
};

export function useSMIBDiscovery(): UseSmibDiscoveryReturn {
  // ============================================================================
  // State
  // ============================================================================
  const [allSmibs, setAllSmibs] = useState<SmibDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Fetch all SMIB devices from database
   */
  const fetchSmibs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<DiscoverSmibsResponse>(
        '/api/mqtt/discover-smibs'
      );

      if (response.data.success) {
        setAllSmibs(response.data.smibs);
        console.log(
          `✅ [SMIB DISCOVERY] Found ${response.data.smibs.length} SMIB devices`
        );
      } else {
        throw new Error(response.data.error || 'Failed to fetch SMIBs');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to discover SMIBs';
      setError(errorMessage);
      console.error('❌ [SMIB DISCOVERY] Error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh SMIB list
   */
  const refreshSmibs = useCallback(async () => {
    console.log('🔄 [SMIB DISCOVERY] Refreshing SMIB list...');
    await fetchSmibs();
  }, [fetchSmibs]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Initial fetch on mount
  useEffect(() => {
    fetchSmibs();
  }, [fetchSmibs]);

  // All SMIBs are available (no online filtering)
  const availableSmibs = allSmibs;

  // ============================================================================
  // Return
  // ============================================================================
  return {
    allSmibs,
    availableSmibs,
    loading,
    error,
    refreshSmibs,
  };
}
