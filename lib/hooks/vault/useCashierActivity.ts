'use client';

import type { CashierShift, FloatRequest } from '@/shared/types/vault';
import { useCallback, useEffect, useState } from 'react';

export type CashierActivityItem = {
  id: string;
  type: 'shift' | 'float_request';
  action: string;
  amount?: number;
  status: string;
  timestamp: Date;
  notes?: string;
  details?: string;
};

export function useCashierActivity() {
  const [activities, setActivities] = useState<CashierActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      // Fetch shifts and requests in parallel
      const [shiftsRes, requestsRes] = await Promise.all([
        fetch('/api/cashier/shifts?limit=5'),
        fetch('/api/vault/float-request?limit=5&status=all')
      ]);

      if (shiftsRes.ok && requestsRes.ok) {
        const shiftsData = await shiftsRes.json();
        const requestsData = await requestsRes.json();

        const combined: CashierActivityItem[] = [];

        // Map shifts
        (shiftsData.shifts || []).forEach((s: CashierShift) => {
          let actionLabel = 'Shift Activity';
          if (s.status === 'pending_start') actionLabel = 'Opening Shift Request';
          else if (s.status === 'active') actionLabel = 'Shift Started';
          else if (s.status === 'closed') actionLabel = 'Shift Ended';
          else if (s.status === 'pending_review') actionLabel = 'Shift Pending Review';
          else if (s.status === 'cancelled') actionLabel = 'Shift Cancelled';

          combined.push({
            id: s._id,
            type: 'shift',
            action: actionLabel,
            amount: s.openingBalance,
            status: s.status,
            timestamp: new Date(s.openedAt || s.createdAt),
            notes: s.notes
          });
        });

        // Map float requests
        (requestsData.data || []).forEach((r: FloatRequest) => {
          // If it's a pending shift start, it's the initial float
          const isInitial = r.requestNotes === 'Initial shift float';
          
          combined.push({
            id: r._id,
            type: 'float_request',
            action: isInitial ? 'Initial Float Request' : `Float ${r.type === 'increase' ? 'Increase' : 'Decrease'} Request`,
            amount: r.requestedAmount,
            status: r.status,
            timestamp: new Date(r.requestedAt),
            notes: r.vmNotes || r.requestNotes,
            details: r.status === 'denied' ? `Reason: ${r.vmNotes || ''}` : undefined
          });
        });

        // Sort by timestamp desc
        combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(combined.slice(0, 5));
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
