'use client';

import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets/helpers';
import { fetchVaultBalance, fetchVaultOverviewData } from '@/lib/helpers/vaultHelpers';
import type { GamingMachine } from '@/shared/types/entities';
import type { CashDesk, UnbalancedShiftInfo, VaultBalance } from '@/shared/types/vault';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export type CloseDayStep = 'softCount' | null;

export function useVaultCloseDay(locationId?: string, username?: string) {
  const [activeStep, setActiveStep] = useState<CloseDayStep>(null);
  const [vaultBalance, setVaultBalance] = useState<VaultBalance | null>(null);
  const [machines, setMachines] = useState<GamingMachine[]>([]);
  const [activeShifts, setActiveShifts] = useState<CashDesk[]>([]);
  const [pendingShifts, setPendingShifts] = useState<UnbalancedShiftInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBlockedShifts, setShowBlockedShifts] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const balance = await fetchVaultBalance(locationId);
      if (balance) {
        setVaultBalance(balance);
      }
      
      const machinesData = await fetchCabinetsForLocation(locationId, undefined, 'All Time');
      if (machinesData && machinesData.data) {
        setMachines(machinesData.data);
      }
    } catch (error) {
      console.error('Failed to fetch status for close day:', error);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  const startCloseDay = useCallback(async () => {
    if (!locationId) return;

    setLoading(true);
    try {
      // 1. Fetch basic overview data (shifts, balance status)
      const data = await fetchVaultOverviewData(locationId, username);
      const balance = data.vaultBalance;
      
      setVaultBalance(balance);
      setActiveShifts(data.cashDesks || []);
      setPendingShifts(data.pendingShifts || []);

      // 2. Fetch machines for collection selector - ensures they are available
      const machinesData = await fetchCabinetsForLocation(locationId, undefined, 'All Time');
      if (machinesData && machinesData.data) {
        setMachines(machinesData.data);
      }

      // Check if blocked by active/pending shifts
      if (data.cashDesks.length > 0 || data.pendingShifts.length > 0) {
        setShowBlockedShifts(true);
        return;
      }
      
      if (!balance.canClose) {
        toast.error('Cannot Close Vault', {
          description: balance.blockReason || 'Please ensure all requirements are met.'
        });
        return;
      }

      // Start sequence: Soft Count (Machine Removals)
      if (!balance.isCollectionDone) {
        setActiveStep('softCount');
      } else {
        // If collection is done, we still open the soft count modal 
        // which will show the "Success" summary view and allow the user to click "Done" to close the shift.
        setActiveStep('softCount');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch vault status');
    } finally {
      setLoading(false);
    }
  }, [locationId, username]);

  const handleNextStep = useCallback(() => {
    setActiveStep(null);
  }, []);

  const handleClose = useCallback(() => {
    setActiveStep(null);
  }, []);

  const handleConfirm = useCallback(async (type: string, _data?: any) => {
    if (type === 'softCount') {
      // 1. Fetch latest balance to ensure we close with correct data
      setLoading(true);
      try {
        const balanceRes = await fetchVaultBalance(locationId!);
        
        // 2. Perform actual close API call using calculated data
        const res = await fetch('/api/vault/shift/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locationId,
            vaultShiftId: vaultBalance?.activeShiftId,
            closingBalance: balanceRes?.balance || vaultBalance?.balance || 0,
            denominations: balanceRes?.denominations || vaultBalance?.denominations || []
          })
        });
        
        const result = await res.json();
        if (result.success) {
          toast.success('Vault closed successfully');
          setActiveStep(null);
          // Refresh state
          fetchStatus();
        } else {
          toast.error(result.error || 'Failed to close vault');
        }
      } catch (err) {
        console.error('Error closing vault after soft count:', err);
        toast.error('Network error closing vault');
      } finally {
        setLoading(false);
      }
    }
  }, [locationId, vaultBalance, fetchStatus]);


  return {
    activeStep,
    setActiveStep,
    vaultBalance,
    machines,
    activeShifts,
    pendingShifts,
    showBlockedShifts,
    setShowBlockedShifts,
    loading,
    startCloseDay,
    handleNextStep,
    handleClose,
    handleConfirm,
    fetchStatus
  };
}
