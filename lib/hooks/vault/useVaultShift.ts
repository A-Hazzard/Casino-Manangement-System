/**
 * useVaultShift Hook
 *
 * Manages the state of the active vault shift for Vault Managers.
 * Handles fetching vault balance, detecting stale shifts, and exposing shift status.
 *
 * @module lib/hooks/vault/useVaultShift
 */
'use client';

import { useUserStore } from '@/lib/store/userStore';
import { isShiftStale } from '@/lib/utils/vault/shift';
import { VaultBalance } from '@/shared/types/vault';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useVaultShift() {
  const { user, setHasActiveVaultShift, setIsVaultReconciled, setIsStaleShift: setGlobalIsStale } = useUserStore();
  const [vaultBalance, setVaultBalance] = useState<VaultBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const locationId = user?.assignedLocations?.[0];

  const fetchBalance = useCallback(async (isSilent = false) => {
    if (!locationId) {
      setLoading(false);
      return;
    }

    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch(`/api/vault/balance?locationId=${locationId}`);
      const data = await res.json();

      if (data.success) {
        setVaultBalance(data.data);
        
        // Update global store
        setHasActiveVaultShift(!!data.data.activeShiftId);
        setIsVaultReconciled(!!data.data.isReconciled);
        
        // Check for stale shift
        const stale = data.data.isStale ?? isShiftStale(data.data.openedAt);
        setGlobalIsStale(stale);
      } else {
        console.error('Failed to fetch vault balance:', data.error);
      }
    } catch (error) {
      console.error('Error fetching vault balance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [locationId, setHasActiveVaultShift, setIsVaultReconciled, setGlobalIsStale]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const isStaleShift = useMemo(() => {
    return vaultBalance?.isStale ?? isShiftStale(vaultBalance?.openedAt);
  }, [vaultBalance?.isStale, vaultBalance?.openedAt]);

  const isActive = useMemo(() => !!vaultBalance?.activeShiftId, [vaultBalance?.activeShiftId]);
  const isReconciled = useMemo(() => !!vaultBalance?.isReconciled, [vaultBalance?.isReconciled]);

  return {
    vaultBalance,
    loading,
    refreshing,
    isStaleShift,
    isActive,
    isReconciled,
    refresh: fetchBalance
  };
}
