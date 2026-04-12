/**
 * useMembersActivityLog Hook
 *
 * Encapsulates state and logic for the Members Activity Log Tab.
 * Handles data fetching for activity logs where membershipLog is true.
 */

'use client';

import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type ActivityLogEntry = {
  _id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId: string;
  resourceName?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
};

type UseMembersActivityLogProps = {
  page?: number;
  limit?: number;
  search?: string;
  actionFilter?: string;
  startDate?: string;
  endDate?: string;
};

export function useMembersActivityLog({
  page = 1,
  limit = 20,
  search = '',
  actionFilter = '',
  startDate = '',
  endDate = '',
}: UseMembersActivityLogProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });

  const fetchActivityLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        membershipLog: 'true',
      });

      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(`/api/activity-logs?${params.toString()}`);
      
      if (response.data.success) {
        setActivities(response.data.data.activities || []);
        setPagination(response.data.data.pagination);
      } else {
        throw new Error(response.data.error || 'Failed to fetch logs');
      }
    } catch (error) {
      console.error('Failed to fetch membership activity logs:', error);
      toast.error('Failed to load activity log');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, actionFilter, startDate, endDate]);

  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  return {
    isLoading,
    activities,
    pagination,
    refreshData: fetchActivityLogs,
  };
}
