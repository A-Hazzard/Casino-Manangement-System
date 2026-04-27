'use client';

import type { CashierShift, FloatRequest } from '@/shared/types/vault';
import { useCallback, useEffect, useState } from 'react';

export type CashierActivityItem = {
  id: string;
  type: 'shift' | 'float_request' | 'payout';
  action: string;
  amount?: number;
  status: string;
  timestamp: Date;
  notes?: string;
  details?: string;
  isOutflow?: boolean;
};

export function useCashierActivity() {
  const [activities, setActivities] = useState<CashierActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = useCallback(async (isSilent = false, startDate?: string, endDate?: string) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      params.append('limit', '20');
      params.append('status', 'all');
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const queryString = params.toString();

      // Fetch shifts, requests and payouts in parallel
      const [shiftsRes, requestsRes, payoutsRes] = await Promise.all([
        fetch(`/api/cashier/shifts?${queryString}`),
        fetch(`/api/vault/float-request?${queryString}`),
        fetch(`/api/cashier/payout?${queryString}`)
      ]);

      if (shiftsRes.ok && requestsRes.ok && payoutsRes.ok) {
        const shiftsData = await shiftsRes.json();
        const requestsData = await requestsRes.json();
        const payoutsData = await payoutsRes.json();

        const combined: CashierActivityItem[] = [];

        // Map shifts
        (shiftsData.shifts || []).forEach((shift: CashierShift) => {
          let actionLabel = 'Shift Activity';
          if (shift.status === 'pending_start') actionLabel = 'Opening Shift Request';
          else if (shift.status === 'active') actionLabel = 'Shift Started';
          else if (shift.status === 'closed') actionLabel = 'Shift Ended';
          else if (shift.status === 'pending_review') actionLabel = 'Shift Pending Review';
          else if (shift.status === 'cancelled') actionLabel = 'Shift Cancelled';

          combined.push({
            id: shift._id,
            type: 'shift',
            action: actionLabel,
            amount: shift.openingBalance,
            status: shift.status,
            timestamp: new Date(shift.openedAt || shift.createdAt),
            notes: shift.notes,
            isOutflow: shift.status === 'closed'
          });
        });

        // Map float requests
        (requestsData.data || []).forEach((floatRequest: FloatRequest) => {
          // If it's a pending shift start, it's the initial float
          const isInitial = floatRequest.requestNotes === 'Initial shift float';

          combined.push({
            id: floatRequest._id,
            type: 'float_request',
            action: isInitial ? 'Initial Float Request' : `Float ${floatRequest.type === 'increase' ? 'Increase' : 'Decrease'} Request`,
            amount: floatRequest.requestedAmount,
            status: floatRequest.status,
            timestamp: new Date(floatRequest.requestedAt),
            notes: floatRequest.vmNotes || floatRequest.requestNotes,
            details: floatRequest.status === 'denied' ? `Reason: ${floatRequest.vmNotes || ''}` : undefined,
            isOutflow: floatRequest.type === 'decrease'
          });
        });

        // Map payouts
        type PayoutItem = {
          _id: string;
          type: string;
          amount: number;
          timestamp: string | Date;
          ticketNumber?: string;
          machineSerialNumber?: string;
          machineId?: string;
          notes?: string;
        };

        (payoutsData.payouts || []).forEach((payout: PayoutItem) => {
          combined.push({
            id: payout._id,
            type: 'payout',
            action: payout.type === 'ticket' ? `Ticket Redemption` : `Hand Pay`,
            amount: payout.amount,
            status: 'completed',
            timestamp: new Date(payout.timestamp),
            notes: payout.type === 'ticket' ? `Ticket: ${payout.ticketNumber}` : `Machine: ${payout.machineSerialNumber || payout.machineId}${payout.notes ? ` - ${payout.notes}` : ''}`,
            isOutflow: true
          });
        });

        // Sort by timestamp desc
        combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(combined.slice(0, 20));
      }
    } catch (error) {
      console.error('Failed to fetch activity', error);
      // toast.error('Failed to load activity history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity(false);
  }, [fetchActivity]);

  return { activities, loading, refreshing, refresh: fetchActivity };
}
