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
  // Status including pending states not just shift.status
  const [status, setStatus] = useState<CashierShift['status'] | 'idle' | 'loading'>('loading');
  const [loading, setLoading] = useState(true);

  const fetchCurrentShift = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cashier/shift/current');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.shift) {
          setShift(data.shift);
          setCurrentBalance(data.currentBalance || 0);
          setStatus(data.shift.status);
        } else {
          setShift(null);
          setStatus('idle');
        }
      }
    } catch (error) {
      console.error('Failed to fetch shift', error);
      toast.error('Failed to load shift status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchCurrentShift();
    }
  }, [user, fetchCurrentShift]);

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
        fetchCurrentShift(); // Refresh to see pending_start
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

  return {
    shift,
    status,
    currentBalance,
    loading,
    refresh: fetchCurrentShift,
    openShift,
    closeShift
  };
}
