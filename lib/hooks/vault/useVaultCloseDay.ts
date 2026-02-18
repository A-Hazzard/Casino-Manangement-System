'use client';

import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets/helpers';
import { fetchVaultBalance, fetchVaultOverviewData } from '@/lib/helpers/vaultHelpers';
import type { GamingMachine } from '@/shared/types/entities';
import type { CashDesk, UnbalancedShiftInfo, VaultBalance } from '@/shared/types/vault';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export type CloseDayStep = 'collection' | 'softCount' | 'closeShift' | null;

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

      // Start sequence: Collection -> Soft Count -> Close Shift
      if (!balance.isCollectionDone) {
        setActiveStep('collection');
      } else {
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
    if (activeStep === 'collection') {
      setActiveStep('softCount');
    } else if (activeStep === 'softCount') {
      setActiveStep('closeShift');
    } else {
      setActiveStep(null);
    }
  }, [activeStep]);

  const handleClose = useCallback(() => {
    setActiveStep(null);
  }, []);

  const handleConfirm = useCallback(async (type: string, data?: any) => {
    if (type === 'closeShift') {
      // Perform actual close API call
      try {
        const res = await fetch('/api/vault/shift/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            locationId,
            vaultShiftId: vaultBalance?.activeShiftId
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
      } catch {
        toast.error('Network error');
      }
    } else {
      // For collection and softCount, the wizards handle their own API calls.
      // We just move to the next step.
      handleNextStep();
    }
  }, [activeStep, locationId, vaultBalance, handleNextStep, fetchStatus]);

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
