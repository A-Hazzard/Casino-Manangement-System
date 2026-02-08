/**
 * Cashier Shift Hook
 * 
 * Manages the state and actions for the current cashier shift.
 * Wraps API calls for opening, closing, and fetching shift status.
 * 
 * @module lib/hooks/useCashierShift
 */

import type {
    CashierShift,
    CloseCashierShiftRequest,
    CloseCashierShiftResponse,
    Denomination,
    OpenCashierShiftRequest
} from '@/shared/types/vault';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export function useCashierShift() {
  const { user } = useAuth();
  const [shift, setShift] = useState<CashierShift | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [hasActiveVaultShift, setHasActiveVaultShift] = useState<boolean>(false);
  const [isVaultReconciled, setIsVaultReconciled] = useState<boolean>(false);
  const [status, setStatus] = useState<CashierShift['status'] | 'idle' | 'loading'>('loading');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingVmApproval, setPendingVmApproval] = useState<any | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any | null>(null);

  const fetchCurrentShift = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      
      const res = await fetch('/api/cashier/shift/current');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.shift) {
            setShift(data.shift);
            setCurrentBalance(data.currentBalance || 0);
            setStatus(data.shift.status);
          } else {
            setShift(null);
            setStatus('idle');
          }
          setPendingVmApproval(data.pendingVmApproval || null);
          setPendingRequest(data.pendingRequest || null);
          setHasActiveVaultShift(data.hasActiveVaultShift || false);
          setIsVaultReconciled(data.isVaultReconciled || false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch shift', error);
      if (!isSilent) toast.error('Failed to load shift status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchCurrentShift(false);
    }
  }, [user, fetchCurrentShift]);

  // Polling for status updates (Shift approvals, Float request approvals)
  useEffect(() => {
    // Poll every 30s. 
    // We poll if shift is active, OR if we are idle and waiting for vault reconciliation.
    const shouldPoll = status !== 'loading' && (status !== 'idle' || !isVaultReconciled);

    if (!user || !shouldPoll) {
      return;
    }

    const interval = setInterval(() => {
      fetchCurrentShift(true);
    }, 30000); 

    return () => clearInterval(interval);
  }, [user, status, isVaultReconciled, fetchCurrentShift]);

  const openShift = async (denominations: Denomination[], requestedFloat: number) => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) {
      toast.error('No location assigned');
      return false;
    }

    try {
      const payload: OpenCashierShiftRequest = {
        locationId,
        requestedFloat,
        denominations
      };

      const res = await fetch('/api/cashier/shift/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchCurrentShift(); 
        return true;
      } else {
        toast.error(data.error || 'Failed to open shift');
        return false;
      }
    } catch (error) {
      console.error('Error opening shift:', error);
      toast.error('An error occurred');
      return false;
    }
  };

  const closeShift = async (physicalCount: number, denominations: Denomination[]) => {
    if (!shift?._id) return false;

    try {
      const payload: CloseCashierShiftRequest = {
        shiftId: shift._id,
        physicalCount,
        denominations
      };

      const res = await fetch('/api/cashier/shift/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data: CloseCashierShiftResponse = await res.json();
      
      if (data.success) {
        if (data.status === 'closed') {
          toast.success(data.message);
        } else if (data.status === 'pending_review') {
          toast.warning(data.message);
        }
        fetchCurrentShift();
        return true;
      } else {
        toast.error(data.error || 'Failed to close shift');
        return false;
      }
    } catch (error) {
      console.error('Error closing shift:', error);
      toast.error('An error occurred');
      return false;
    }
  };

  const confirmApproval = async (requestId: string) => {
    try {
      const res = await fetch('/api/vault/float-request/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Float received and shift updated!');
        fetchCurrentShift();
        return true;
      } else {
        toast.error(data.error || 'Failed to confirm receipt');
        return false;
      }
    } catch (error) {
      console.error('Confirm failed', error);
      toast.error('Connection error');
      return false;
    }
  };

  return {
    shift,
    status,
    currentBalance,
    hasActiveVaultShift,
    isVaultReconciled,
    pendingVmApproval,
    pendingRequest,
    loading,
    refreshing,
    refresh: fetchCurrentShift,
    openShift,
    confirmApproval,
    closeShift
  };
}
